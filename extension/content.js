(() => {
  'use strict';

  const GRID_SELECTOR = '.ReactVirtualized__Grid';
  const ACTIVE_ICON_SELECTOR = 'svg[aria-label="status filled"]';
  const SPAN_SELECTOR = 'dd span';
  const CONTROLS_SELECTOR = '[aria-label="Media Controls"]';
  const PLAYER_SELECTOR = '[aria-label="Media Player"]';
  const BTN_CLASS = 'echo360-captions-toggle';
  const OVERLAY_CLASS = 'echo360-captions-overlay';

  let captionsEnabled = false;
  let lastText = '';
  let overlayEl = null;
  let buttonEl = null;
  let gridObserver = null;
  let observedGrid = null;
  let pending = false;

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
    schedule();
  }

  function ensureOverlay() {
    const player = document.querySelector(PLAYER_SELECTOR);
    if (!player) return;
    if (overlayEl && player.contains(overlayEl)) return;
    if (getComputedStyle(player).position === 'static') {
      player.style.position = 'relative';
    }
    overlayEl = document.createElement('div');
    overlayEl.className = OVERLAY_CLASS;
    overlayEl.setAttribute('aria-live', 'polite');
    overlayEl.setAttribute('aria-atomic', 'true');
    player.appendChild(overlayEl);
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
    const controls = document.querySelector(CONTROLS_SELECTOR);
    if (!controls) return;
    if (buttonEl && controls.contains(buttonEl)) return;
    buttonEl = document.createElement('button');
    buttonEl.type = 'button';
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
    controls.appendChild(buttonEl);
    syncButtonState();
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
})();
