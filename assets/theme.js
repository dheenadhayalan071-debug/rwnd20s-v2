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
    toast.className = 'pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border border-red-900/60 bg-void p-4 text-white shadow-xl';

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
})();
