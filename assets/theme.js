/**
 * assets/theme.js
 * Small shared UI helpers. Cart behaviour lives in assets/cart.js.
 */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  function showRwndToast(title, subtitle) {
    const container = document.getElementById('rwnd-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border border-red-900/60 bg-[#09090B] p-4 text-white shadow-xl';

    const copy = document.createElement('div');
    const heading = document.createElement('p');
    heading.className = 'font-mono-tech text-xs font-bold tracking-wider uppercase';
    heading.textContent = title || '';
    const detail = document.createElement('p');
    detail.className = 'mt-0.5 text-xs text-zinc-400';
    detail.textContent = subtitle || '';

    copy.append(heading, detail);
    toast.append(copy);
    container.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  window.showRwndToast = showRwndToast;

  // --- Shared overlay helpers (mobile drawer, full-screen search, cart drawer, welcome popup) ---

  // Focusable selector for keyboard traps.
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /**
   * Trap focus inside a container element while an overlay is open.
   * Returns a keydown handler to attach to the container (or document).
   */
  function createFocusTrap(container) {
    return function (e) {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => {
        return el.offsetParent !== null || el === document.activeElement;
      });
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
  }

  /**
   * Close an overlay on Escape, optionally restoring focus to a given element.
   */
  function createEscapeHandler(onClose, restoreFocusEl) {
    return function (e) {
      if (e.key !== 'Escape') return;
      if (typeof onClose === 'function') onClose();
      if (restoreFocusEl) restoreFocusEl.focus();
    };
  }

  /**
   * Open an overlay: set ARIA-hidden=false, lock body scroll, add focus trap + Escape.
   * Returns a close function that reverses everything.
   */
  function openOverlay(overlay, { trap = true, trapContainer = overlay, restoreFocusEl = null } = {}) {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    document.body.style.overflow = 'hidden';
    const trapHandler = trap ? createFocusTrap(trapContainer) : null;
    const escapeHandler = createEscapeHandler(() => closeOverlay(), restoreFocusEl);
    if (trapHandler) overlay.addEventListener('keydown', trapHandler);
    overlay.addEventListener('keydown', escapeHandler);

    function closeOverlay() {
      overlay.classList.add('opacity-0', 'pointer-events-none');
      document.body.style.overflow = '';
      if (trapHandler) overlay.removeEventListener('keydown', trapHandler);
      overlay.removeEventListener('keydown', escapeHandler);
    }

    // Store close function on overlay for external access (e.g., cart drawer)
    overlay._rwndCloseOverlay = closeOverlay;
    return closeOverlay;
  }

  window.rwndOverlay = { createFocusTrap, createEscapeHandler, openOverlay };
})();
