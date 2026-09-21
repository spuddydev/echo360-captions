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
  const ENABLED_KEY = 'captionsEnabled';
  const storage =
    typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
      ? chrome.storage.local
      : null;

  let captionsEnabled = false;
  let lastText = '';
  let overlayEl = null;
  let textEl = null;
  let buttonEl = null;
  let controlsEl = null;
  let playerEl = null;
  let gridObserver = null;
  let observedGrid = null;
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
    if (overlayEl) {
      overlayEl.classList.toggle('is-empty', text.length === 0);
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

  function ensureOverlay() {
    const host = findPlayerHost();
    if (!host) return;
    playerEl = host;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    if (!overlayEl) {
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
    }
    if (overlayEl.parentElement !== host) {
      host.appendChild(overlayEl);
    } else if (host.lastElementChild !== overlayEl) {
      host.appendChild(overlayEl);
    }
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
    textEl = null;
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
