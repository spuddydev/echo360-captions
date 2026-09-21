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
    if (layerEl) {
      layerEl.classList.toggle('is-empty', text.length === 0);
    }
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

  // Snap to the step grid so a drifted or hand edited value cannot land on a
  // size the controls can never return to.
  function normaliseScale(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    const steps = Math.round((num - SCALE_MIN) / SCALE_STEP);
    const stepped = Number((SCALE_MIN + steps * SCALE_STEP).toFixed(2));
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, stepped));
  }

  // The controls sit over the caption's trailing end, so their offset follows
  // the box's half width.
  function positionSizers() {
    if (!layerEl || !overlayEl || !smallerEl) return;
    const box = overlayEl.getBoundingClientRect();
    if (!box.width) return;
    const own = smallerEl.getBoundingClientRect().width;
    const x = Math.max(0, box.width / 2 - own - 2);
    layerEl.style.setProperty(SIZER_X_PROP, `${x.toFixed(1)}px`);
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
    applyScale();
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
      overlayEl = document.createElement('div');
      overlayEl.className = OVERLAY_CLASS;
      overlayEl.setAttribute('aria-live', 'polite');
      overlayEl.setAttribute('aria-atomic', 'true');
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
      boxObserver = new ResizeObserver(positionSizers);
      boxObserver.observe(overlayEl);
    }
    if (layerEl.parentElement !== host) {
      host.appendChild(layerEl);
    } else if (host.lastElementChild !== layerEl) {
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

  document.addEventListener('fullscreenchange', bootstrap);
  document.addEventListener('webkitfullscreenchange', bootstrap);
  document.addEventListener('mozfullscreenchange', bootstrap);

  bootstrap();

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
