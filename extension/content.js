(() => {
  'use strict';

  const LOG_PREFIX = '[Echo360 Captions]';
  const GRID_SELECTOR = '.ReactVirtualized__Grid';
  const ACTIVE_ICON_SELECTOR = '[data-test-name="status-filled"], svg[aria-label="status-filled"]';
  const SPAN_SELECTOR = 'dd span';
  const FULLSCREEN_BTN_SELECTOR = '#fullscreen-toggle-btn';
  const PLAYER_HOST_SELECTOR = '#player, [aria-label="Media Player"]';
  const VIDEO_FALLBACK_SELECTOR = 'video';
  const BTN_CLASS = 'echo360-captions-toggle';
  const OVERLAY_CLASS = 'echo360-captions-overlay';

  let captionsEnabled = false;
  let lastText = '';
  let overlayEl = null;
  let buttonEl = null;
  let controlsEl = null;
  let playerEl = null;
  let gridObserver = null;
  let observedGrid = null;
  let pending = false;

  console.info(`${LOG_PREFIX} content script loaded on ${location.hostname}`);

  function findControlsCluster() {
    const fs = document.querySelector(FULLSCREEN_BTN_SELECTOR);
    return fs ? fs.parentElement : null;
  }

  function findPlayerHost() {
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
    if (overlayEl) {
      overlayEl.textContent = text;
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
    if (overlayEl && host.contains(overlayEl)) return;
    if (getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    overlayEl = document.createElement('div');
    overlayEl.className = OVERLAY_CLASS;
    overlayEl.setAttribute('aria-live', 'polite');
    overlayEl.setAttribute('aria-atomic', 'true');
    host.appendChild(overlayEl);
  }

  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
  }

  function syncButtonState() {
    if (!buttonEl) return;
    buttonEl.setAttribute('aria-pressed', String(captionsEnabled));
    buttonEl.classList.toggle('is-active', captionsEnabled);
  }

  function toggleCaptions() {
    captionsEnabled = !captionsEnabled;
    syncButtonState();
    if (captionsEnabled) {
      ensureOverlay();
      lastText = '';
      schedule();
    } else {
      removeOverlay();
    }
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
    injectButton();
    attachGridObserver();
    if (captionsEnabled) ensureOverlay();
  }

  const rootObserver = new MutationObserver(bootstrap);
  rootObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  bootstrap();

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
