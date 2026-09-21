(() => {
  'use strict';

  const LOG_PREFIX = '[Echo360 Captions]';
  const GRID_SELECTOR = '.ReactVirtualized__Grid';
  const ACTIVE_ICON_SELECTOR = '[data-test-name="status-filled"], svg[aria-label="status-filled"]';
  const SPAN_SELECTOR = 'dd span';
  const FULLSCREEN_BTN_SELECTOR = '#fullscreen-toggle-btn';
  const PLAYER_HOST_SELECTOR = '#player, [aria-label="Media Player"]';
  const VIDEO_FALLBACK_SELECTOR = 'video';
  const TRANSCRIPTS_TAB_SELECTOR = '#transcripts-tab';
  const BTN_CLASS = 'echo360-captions-toggle';
  const OVERLAY_CLASS = 'echo360-captions-overlay';
  const TEXT_CLASS = 'echo360-captions-text';
  const LAYER_CLASS = 'echo360-captions-layer';
  const SIZER_CLASS = 'echo360-captions-sizer';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SCALE_PROP = '--echo360-caption-scale';
  const SIZER_X_PROP = '--echo360-sizer-x';
  const SCALE_MIN = 0.7;
  const SCALE_MAX = 2;
  const SCALE_STEP = 0.1;
  const ENABLED_KEY = 'captionsEnabled';
  const SIZE_KEY = 'captionScale';
  const storage =
    typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
      ? chrome.storage.local
      : null;

  let captionsEnabled = false;
  let lastText = '';
  let layerEl = null;
  let overlayEl = null;
  let textEl = null;
  let smallerEl = null;
  let largerEl = null;
  let captionScale = 1;
  let sizeChosen = false;
  let pressingControl = false;
  let controlPointerId = null;
  let controlsEngaged = false;
  let controlsActive = false;
  let heldSizerX = null;
  let pointerX = 0;
  let pointerY = 0;
  let proximityPending = false;
  // Where the caption has been dragged to, as fractions of the player: the
  // centre across, and the distance from the player's bottom to the caption's
  // own bottom. Null means untouched, and untouched writes no inline position at
  // all, so the default stays exactly what the stylesheet says. It never reaches
  // storage, which is what makes it last for the viewing and no longer.
  let position = null;
  let dragging = false;
  let dragPointerId = null;
  let dragMoved = false;
  let dragStart = null;
  let buttonEl = null;
  let controlsEl = null;
  let playerEl = null;
  let gridObserver = null;
  let observedGrid = null;
  let boxObserver = null;
  let pending = false;
  let transcriptAutoOpened = false;

  console.info(`${LOG_PREFIX} content script loaded on ${location.hostname}`);

  function openTranscriptPanel() {
    if (transcriptAutoOpened) return;
    const tab = document.querySelector(TRANSCRIPTS_TAB_SELECTOR);
    if (!tab) return;
    transcriptAutoOpened = true;
    if (tab.getAttribute('aria-selected') === 'true') {
      console.info(`${LOG_PREFIX} transcript panel already open`);
      return;
    }
    tab.click();
    console.info(`${LOG_PREFIX} transcript panel opened`);
  }

  function findControlsCluster() {
    const fs = document.querySelector(FULLSCREEN_BTN_SELECTOR);
    return fs ? fs.parentElement : null;
  }

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      null
    );
  }

  function findPlayerHost() {
    const fs = getFullscreenElement();
    if (fs && fs.querySelector(VIDEO_FALLBACK_SELECTOR)) return fs;
    const player = document.querySelector(PLAYER_HOST_SELECTOR);
    if (player) return player;
    const video = document.querySelector(VIDEO_FALLBACK_SELECTOR);
    return video ? video.parentElement : null;
  }

  function findActiveSpan(grid) {
    const icon = grid.querySelector(ACTIVE_ICON_SELECTOR);
    if (!icon) return null;
    let row = icon.parentElement;
    while (row && row !== grid) {
      const span = row.querySelector(SPAN_SELECTOR);
      if (span) return span;
      row = row.parentElement;
    }
    return null;
  }

  function readActiveText() {
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return '';
    const span = findActiveSpan(grid);
    return span ? span.textContent.trim() : '';
  }

  function paint() {
    pending = false;
    if (!captionsEnabled) return;
    const text = readActiveText();
    if (text === lastText) return;
    lastText = text;
    if (textEl) {
      textEl.textContent = text;
    }
    syncEmptyState();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(paint);
  }

  function attachGridObserver() {
    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;
    if (grid === observedGrid && gridObserver) return;
    if (gridObserver) gridObserver.disconnect();
    observedGrid = grid;
    gridObserver = new MutationObserver(schedule);
    gridObserver.observe(grid, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label'],
      characterData: true,
    });
    console.info(`${LOG_PREFIX} transcript grid observed`);
    schedule();
  }

  // The caption goes away between spoken lines and the controls go with it. That
  // would pull them out from under someone in the middle of using them, so while
  // they are in use the caption's own gap is not allowed to hide them.
  function syncEmptyState() {
    if (!layerEl) return;
    layerEl.classList.toggle('is-empty', lastText.length === 0 && !controlsEngaged);
  }

  function refreshEngagement() {
    const focused = Boolean(layerEl && layerEl.contains(document.activeElement));
    const next = pressingControl || focused || dragging;
    if (next === controlsEngaged) return;
    controlsEngaged = next;
    syncEmptyState();
  }

  // Snap to the step grid so a drifted or hand edited value cannot land on a
  // size the controls can never return to.
  function normaliseScale(value) {
    // Only a real number counts. Anything else is a missing or corrupted
    // setting, and coercing it would quietly turn null into the smallest size.
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    const steps = Math.round((value - SCALE_MIN) / SCALE_STEP);
    const stepped = Number((SCALE_MIN + steps * SCALE_STEP).toFixed(2));
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
  }

  // The controls sit over the caption's trailing end, so their offset follows
  // the box's half width. While they are awake that offset is held, because
  // every press widens the caption and would otherwise walk them out from under
  // the pointer before it could press again.
  function positionSizers() {
    if (!layerEl || !overlayEl || !smallerEl) return;
    if (controlsActive && heldSizerX !== null) return;
    const box = overlayEl.getBoundingClientRect();
    if (!box.width) return;
    const own = smallerEl.getBoundingClientRect().width;
    heldSizerX = Math.max(0, box.width / 2 - own - 2);
    layerEl.style.setProperty(SIZER_X_PROP, `${heldSizerX.toFixed(1)}px`);
  }

  // The controls hang below the caption, so they have to be kept inside the
  // player too.
  function controlsReach() {
    if (!layerEl || !largerEl) return 0;
    return Math.max(
      0,
      largerEl.getBoundingClientRect().bottom - layerEl.getBoundingClientRect().bottom
    );
  }

  function clampPosition(next) {
    const host = layerEl && layerEl.parentElement;
    if (!host) return next;
    const hostBox = host.getBoundingClientRect();
    const own = layerEl.getBoundingClientRect();
    if (!hostBox.width || !hostBox.height || !own.width) return next;
    const edge = 4;
    const halfW = own.width / 2 + edge;
    const lowest = (controlsReach() + edge) / hostBox.height;
    const highest = (hostBox.height - own.height - edge) / hostBox.height;
    return {
      left: Math.min(
        (hostBox.width - halfW) / hostBox.width,
        Math.max(halfW / hostBox.width, next.left)
      ),
      bottom: Math.min(Math.max(lowest, next.bottom), Math.max(lowest, highest)),
    };
  }

  function applyPosition() {
    if (!layerEl) return;
    if (!position) {
      layerEl.style.removeProperty('left');
      layerEl.style.removeProperty('bottom');
      return;
    }
    layerEl.style.left = `${(position.left * 100).toFixed(3)}%`;
    layerEl.style.bottom = `${(position.bottom * 100).toFixed(3)}%`;
  }

  function reclampPosition() {
    if (!position || !layerEl) return;
    position = clampPosition(position);
    applyPosition();
  }

  function readPosition() {
    const host = layerEl && layerEl.parentElement;
    if (!host) return null;
    const hostBox = host.getBoundingClientRect();
    const own = layerEl.getBoundingClientRect();
    if (!hostBox.width || !hostBox.height) return null;
    return {
      left: (own.left + own.width / 2 - hostBox.left) / hostBox.width,
      bottom: (hostBox.bottom - own.bottom) / hostBox.height,
    };
  }

  // A press that never moved was a click on the video, not a grab of the
  // caption, so it is handed to whatever sits underneath.
  function forwardClick(x, y) {
    if (!layerEl) return;
    layerEl.classList.add('is-passing-through');
    const beneath = document.elementFromPoint(x, y);
    layerEl.classList.remove('is-passing-through');
    if (!beneath || layerEl.contains(beneath)) return;
    beneath.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: x,
        clientY: y,
      })
    );
  }

  // Only the pointer that started the gesture may end it, and only a deliberate
  // release counts as a press worth handing on. A cancelled or stolen gesture
  // was not a click on anything.
  function endDrag(event, deliberate) {
    if (dragPointerId === null) return;
    if (event && event.pointerId !== undefined && event.pointerId !== dragPointerId) return;
    const id = dragPointerId;
    const moved = dragMoved;
    dragPointerId = null;
    dragMoved = false;
    dragStart = null;
    dragging = false;
    if (layerEl) layerEl.classList.remove('is-dragging');
    if (overlayEl && overlayEl.hasPointerCapture && overlayEl.hasPointerCapture(id)) {
      overlayEl.releasePointerCapture(id);
    }
    refreshEngagement();
    if (deliberate && !moved && event) forwardClick(event.clientX, event.clientY);
  }

  function beginDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (dragPointerId !== null) return;
    const origin = readPosition();
    if (!origin) return;
    dragPointerId = event.pointerId;
    dragMoved = false;
    dragging = false;
    dragStart = { x: event.clientX, y: event.clientY, origin };
    if (overlayEl.setPointerCapture) overlayEl.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function duringDrag(event) {
    if (dragPointerId !== event.pointerId || !dragStart) return;
    const host = layerEl && layerEl.parentElement;
    if (!host) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    if (!dragMoved && Math.hypot(dx, dy) < 4) return;
    if (!dragMoved) {
      dragMoved = true;
      dragging = true;
      layerEl.classList.add('is-dragging');
      refreshEngagement();
    }
    const hostBox = host.getBoundingClientRect();
    position = clampPosition({
      left: dragStart.origin.left + dx / hostBox.width,
      bottom: dragStart.origin.bottom - dy / hostBox.height,
    });
    applyPosition();
  }

  function setControlsActive(value) {
    if (controlsActive === value) return;
    controlsActive = value;
    if (!controlsActive) heldSizerX = null;
    if (layerEl) layerEl.classList.toggle('is-active', controlsActive);
    positionSizers();
  }

  // Distance from the pointer to the nearest edge of the caption, zero when it
  // is over it. The controls wake on contact and stay awake anywhere within
  // reach, so there is no edge to fall off on the way to one.
  function evaluateProximity() {
    proximityPending = false;
    if (!layerEl || !overlayEl || !captionsEnabled) return;
    const box = overlayEl.getBoundingClientRect();
    if (!box.width) {
      setControlsActive(false);
      return;
    }
    const dx = Math.max(box.left - pointerX, 0, pointerX - box.right);
    const dy = Math.max(box.top - pointerY, 0, pointerY - box.bottom);
    const distance = Math.hypot(dx, dy);
    if (distance === 0) setControlsActive(true);
    else if (distance > Math.max(80, box.height * 2.4)) setControlsActive(false);
  }

  function scheduleProximity() {
    if (proximityPending) return;
    proximityPending = true;
    requestAnimationFrame(evaluateProximity);
  }

  function applyScale() {
    if (layerEl) layerEl.style.setProperty(SCALE_PROP, String(captionScale));
    if (smallerEl) smallerEl.disabled = captionScale <= SCALE_MIN;
    if (largerEl) largerEl.disabled = captionScale >= SCALE_MAX;
  }

  function stepScale(direction) {
    const next = normaliseScale(captionScale + direction * SCALE_STEP);
    if (next === captionScale) return;
    captionScale = next;
    sizeChosen = true;
    applyScale();
    persistSetting(SIZE_KEY, captionScale);
  }

  function createSizer(modifier, label, shape, direction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${SIZER_CLASS} ${modifier}`;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', shape);
    svg.appendChild(path);
    btn.appendChild(svg);
    btn.addEventListener('pointerdown', (event) => {
      controlPointerId = event.pointerId;
      pressingControl = true;
      refreshEngagement();
    });
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      stepScale(direction);
    });
    return btn;
  }

  function ensureOverlay() {
    const host = findPlayerHost();
    if (!host) return;
    playerEl = host;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    if (!layerEl) {
      layerEl = document.createElement('div');
      layerEl.className = LAYER_CLASS;
      layerEl.addEventListener('focusin', refreshEngagement);
      layerEl.addEventListener('focusout', () => requestAnimationFrame(refreshEngagement));
      overlayEl = document.createElement('div');
      overlayEl.className = OVERLAY_CLASS;
      overlayEl.setAttribute('aria-live', 'polite');
      overlayEl.setAttribute('aria-atomic', 'true');
      // The caption's own click never travels on. Whether a press deserves to
      // reach the video is decided when the pointer is released, and forwarded
      // deliberately, otherwise finishing a drag would also pause the lecture.
      overlayEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      overlayEl.addEventListener('pointerdown', beginDrag);
      overlayEl.addEventListener('pointermove', duringDrag);
      overlayEl.addEventListener('pointerup', (event) => endDrag(event, true));
      overlayEl.addEventListener('pointercancel', (event) => endDrag(event, false));
      overlayEl.addEventListener('lostpointercapture', (event) => endDrag(event, false));
      // The box keeps pre-wrap, so the text gets its own node rather than being
      // written over the box itself. Anything else placed in the box would be
      // wiped on the next transcript line.
      textEl = document.createElement('span');
      textEl.className = TEXT_CLASS;
      overlayEl.appendChild(textEl);
      layerEl.appendChild(overlayEl);
      smallerEl = createSizer('is-smaller', 'Smaller captions', 'M3 6h6', -1);
      largerEl = createSizer('is-larger', 'Larger captions', 'M3 6h6M6 3v6', 1);
      layerEl.appendChild(smallerEl);
      layerEl.appendChild(largerEl);
      applyScale();
      // The caption's width follows its text, its size setting and the window,
      // because the size formula is partly a share of the viewport. Watching the
      // box covers all three, including a fullscreen change that alters nothing
      // else.
      boxObserver = new ResizeObserver(() => {
        positionSizers();
        // A caption dragged near an edge and then made bigger, or simply handed
        // a longer line, would otherwise keep a place that no longer fits.
        reclampPosition();
      });
      boxObserver.observe(overlayEl);
      applyPosition();
    }
    if (layerEl.parentElement !== host) {
      // Going fullscreen moves the caption into a different element of a
      // different size, which is no place to be mid gesture and no guarantee the
      // old spot still fits.
      endDrag(null, false);
      host.appendChild(layerEl);
      reclampPosition();
    } else if (host.lastElementChild !== layerEl && !dragging) {
      // Reordering mid gesture is not worth the risk to the pointer capture.
      host.appendChild(layerEl);
    }
  }

  function removeOverlay() {
    if (boxObserver) {
      boxObserver.disconnect();
      boxObserver = null;
    }
    if (layerEl && layerEl.parentNode) {
      layerEl.parentNode.removeChild(layerEl);
    }
    layerEl = null;
    overlayEl = null;
    textEl = null;
    smallerEl = null;
    largerEl = null;
    controlsActive = false;
    heldSizerX = null;
    dragging = false;
    dragPointerId = null;
    dragMoved = false;
    dragStart = null;
    controlPointerId = null;
    pressingControl = false;
  }

  function syncButtonState() {
    if (!buttonEl) return;
    buttonEl.setAttribute('aria-pressed', String(captionsEnabled));
    buttonEl.classList.toggle('is-active', captionsEnabled);
  }

  function persistSetting(key, value) {
    if (!storage) return;
    try {
      const result = storage.set({ [key]: value });
      if (result && typeof result.catch === 'function') {
        result.catch((err) => console.warn(`${LOG_PREFIX} failed to persist ${key}`, err));
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} failed to persist ${key}`, err);
    }
  }

  // Each setting brings its own coercion, which also supplies the default for a
  // value that is missing, unreadable or malformed.
  function loadSetting(key, coerce) {
    if (!storage) return Promise.resolve(coerce(undefined));
    return new Promise((resolve) => {
      try {
        const handle = (result) => resolve(coerce(result ? result[key] : undefined));
        const maybe = storage.get(key, handle);
        if (maybe && typeof maybe.then === 'function') {
          maybe.then(handle).catch(() => resolve(coerce(undefined)));
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} failed to read ${key}`, err);
        resolve(coerce(undefined));
      }
    });
  }

  function setCaptionsEnabled(enabled, { persist = true } = {}) {
    captionsEnabled = enabled;
    syncButtonState();
    if (captionsEnabled) {
      transcriptAutoOpened = false;
      openTranscriptPanel();
      ensureOverlay();
      lastText = '';
      schedule();
    } else {
      removeOverlay();
    }
    if (persist) persistSetting(ENABLED_KEY, enabled);
  }

  function toggleCaptions() {
    setCaptionsEnabled(!captionsEnabled);
  }

  function injectButton() {
    const cluster = findControlsCluster();
    if (!cluster) return;
    controlsEl = cluster;
    if (buttonEl && cluster.contains(buttonEl)) return;
    buttonEl = document.createElement('button');
    buttonEl.type = 'button';
    buttonEl.id = 'echo360-captions-toggle-btn';
    buttonEl.className = BTN_CLASS;
    buttonEl.textContent = 'CC';
    buttonEl.title = 'Toggle transcript captions';
    buttonEl.setAttribute('aria-label', 'Toggle transcript captions');
    buttonEl.setAttribute('aria-pressed', 'false');
    buttonEl.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleCaptions();
    });
    cluster.insertBefore(buttonEl, cluster.firstChild);
    syncButtonState();
    console.info(`${LOG_PREFIX} CC button injected`);
  }

  function bootstrap() {
    openTranscriptPanel();
    injectButton();
    attachGridObserver();
    if (captionsEnabled) ensureOverlay();
  }

  const rootObserver = new MutationObserver(bootstrap);
  rootObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  document.addEventListener(
    'pointermove',
    (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      scheduleProximity();
    },
    { passive: true }
  );

  const endControlPress = (event) => {
    if (!pressingControl) return;
    if (
      event &&
      event.pointerId !== undefined &&
      controlPointerId !== null &&
      event.pointerId !== controlPointerId
    ) {
      return;
    }
    controlPointerId = null;
    pressingControl = false;
    refreshEngagement();
  };
  document.addEventListener('pointerup', endControlPress);
  document.addEventListener('pointercancel', endControlPress);

  document.addEventListener('fullscreenchange', bootstrap);
  document.addEventListener('webkitfullscreenchange', bootstrap);
  document.addEventListener('mozfullscreenchange', bootstrap);

  // The caption's width follows the window, so a spot that was safely inside the
  // player can stop being safely inside it. Going fullscreen also swaps the
  // element the caption lives in, which is no place to be mid gesture.
  const onViewportChange = () => {
    endDrag(null, false);
    reclampPosition();
  };
  window.addEventListener('resize', onViewportChange);
  document.addEventListener('fullscreenchange', onViewportChange);
  document.addEventListener('webkitfullscreenchange', onViewportChange);
  document.addEventListener('mozfullscreenchange', onViewportChange);

  bootstrap();

  // Held on the module rather than the element, because the caption usually does
  // not exist yet when this resolves. Creating it applies whatever is here.
  loadSetting(SIZE_KEY, normaliseScale).then((scale) => {
    // Somebody quick off the mark can change the size before the saved one
    // arrives, and their choice is the newer of the two.
    if (sizeChosen || scale === captionScale) return;
    captionScale = scale;
    applyScale();
    console.info(`${LOG_PREFIX} restoring stored caption size: ${Math.round(scale * 100)}%`);
  });

  loadSetting(ENABLED_KEY, Boolean).then((stored) => {
    if (stored && !captionsEnabled) {
      console.info(`${LOG_PREFIX} restoring stored captions preference: on`);
      setCaptionsEnabled(true, { persist: false });
    }
  });

  window.__echo360Captions = {
    state: () => ({
      captionsEnabled,
      controls: controlsEl,
      player: playerEl,
      grid: observedGrid,
      button: buttonEl,
      overlay: overlayEl,
    }),
    forceToggle: toggleCaptions,
  };
})();
