/**
 * assets/cart.js
 * Single source of truth for cart rendering, add-to-cart, dispatch attributes
 * and checkout hand-off.
 *
 * Money is never calculated here. Every displayed amount comes from Shopify's
 * /cart.js response (items_subtotal_price, total_discount, total_price) so the
 * cart can never promise a price the checkout will not honour.
 *
 * The Madurai founder-delivery fee is an *indicative* display number only —
 * checkout remains authoritative.
 */
(function () {
  'use strict';

  var MADURAI_PIN_MIN = 625001;
  var MADURAI_PIN_MAX = 625020;
  var FREE_DELIVERY_THRESHOLD = 99900; // ₹999 in paise (informational)
  var FOUNDER_FEE = (function () {
    var raw = window.RWND_FOUNDER_FEE;
    var parsed = parseFloat(raw);
    if (isNaN(parsed)) return 49900; // fallback ₹499, in paise
    // Theme settings pass the fee in rupees (e.g. 499); treat anything >= 1000 as already paise.
    return parsed >= 1000 ? Math.round(parsed) : Math.round(parsed * 100);
  })();

  var state = { cart: null };

  // /cart.js values are in the currency's minor unit (paise for INR).
  var formatMoney = function (cents, currency) {
    var code = currency || 'INR';
    var symbol = code === 'INR' ? '₹' : code;
    var value = Math.round(Number(cents) || 0) / 100;
    return code === 'INR' ? symbol + value.toLocaleString('en-IN') : symbol + value.toLocaleString();
  };

  var escapeHTML = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character];
    });
  };

  function toast(title, message) {
    if (typeof window.showRwndToast === 'function') {
      window.showRwndToast(title, message || '');
    }
  }

  async function requestJSON(url, options) {
    const response = await fetch(url, Object.assign({ headers: { Accept: 'application/json' } }, options || {}));
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      throw new Error((data && (data.description || data.message)) || 'Request failed. Please try again.');
    }
    return data;
  }

  function digitsOnly(value) {
    return String(value == null ? '' : value).replace(/\D/g, '');
  }

  function isMaduraiPin(value) {
    const digits = digitsOnly(value);
    if (digits.length !== 6) return false;
    const numeric = Number(digits);
    return numeric >= MADURAI_PIN_MIN && numeric <= MADURAI_PIN_MAX;
  }

  function setPinStatus(statusEl, text, color) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.color = color;
  }

  function founderFeeRow() {
    return document.getElementById('rwnd-main-cart-founder-row');
  }

  function founderFeeValue() {
    return document.getElementById('rwnd-main-cart-founder-fee');
  }

  function estimatedTotalEl() {
    return document.getElementById('rwnd-main-cart-estimated-total');
  }

  function selectedPill() {
    return document.querySelector('input[name="rwnd_dispatch_mode"]:checked');
  }

  function isFounderSelected() {
    var pill = selectedPill();
    return !!pill && pill.value.indexOf('Hand Delivery by Founders') !== -1;
  }

  function findPinInput() {
    return document.getElementById('rwnd-main-mdu-pin-input');
  }

  function isFounderPinValid() {
    if (!isFounderSelected()) return false;
    var input = findPinInput();
    if (!input) return false;
    return isMaduraiPin(input.value);
  }

  function renderFounderFee(cart) {
    var feeEnabled = FOUNDER_FEE > 0;
    var valid = isFounderPinValid() && feeEnabled;
    var row = founderFeeRow();
    var feeEl = founderFeeValue();
    if (row) {
      row.classList.toggle('hidden', !valid);
      row.classList.toggle('flex', valid);
    }
    if (feeEl && valid) {
      feeEl.textContent = '+ ' + formatMoney(FOUNDER_FEE, (cart && cart.currency) || 'INR');
    }
    var total = estimatedTotalEl();
    if (!total) return;
    if (!cart) return; // leave the server-rendered markup until /cart.js responds
    var base = cart.total_price || 0;
    total.textContent = formatMoney(valid ? base + FOUNDER_FEE : base, cart.currency);
  }

  function renderMainCartItems(cart) {
    const container = document.getElementById('rwnd-main-cart-items');
    if (!container) return;

    if (!cart.items || cart.items.length === 0) {
      container.innerHTML = `
        <div class="flex min-h-[300px] flex-col items-center justify-center border border-[#2A2A2F] bg-[#131316] p-8 text-center">
          <span class="text-[10px] font-bold uppercase tracking-widest text-[#FF0033]">// DEAD LINE</span>
          <p class="mt-2 font-display text-xl font-bold uppercase tracking-wider text-[#F5F5F7]">BAG'S EMPTY</p>
          <p class="mt-1 font-mono-tech text-xs text-[#A3A7AE]">Grab Drop 01 — or sit in silence. Your call.</p>
          <a href="/collections/all" class="mt-6 inline-flex h-12 items-center justify-center border border-[#FF0033] bg-[#FF0033] px-8 font-mono-tech text-xs font-bold uppercase tracking-widest text-[#F5F5F7] transition-all hover:bg-[#CC0029]">
            EXPLORE ARCHIVE →
          </a>
        </div>`;
      return;
    }

    container.innerHTML = cart.items.map(function (item) {
      const isEarphone = /earphone|ear-01/i.test(item.product_title + ' ' + (item.handle || ''));
      const qty = Math.max(1, item.quantity); // never decrement below 1
      return `
        <article class="flex flex-col gap-4 border border-[#2A2A2F] bg-[#131316] p-4 sm:flex-row sm:items-center">
          <div class="flex h-24 w-24 shrink-0 items-center justify-center border border-[#2A2A2F] bg-[#0A0A0C] p-2">
            ${item.image
              ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" width="96" height="96" class="h-full w-full object-contain">`
              : '<span class="text-[9px] text-[#A3A7AE]">NO IMG</span>'}
          </div>
          <div class="flex w-full min-w-0 flex-1 flex-col justify-between gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-display text-sm font-bold uppercase text-[#F5F5F7] tracking-tight sm:text-base">${escapeHTML(item.product_title)}</h3>
                ${item.variant_title && item.variant_title !== 'Default Title'
                  ? `<p class="mt-0.5 font-mono-tech text-xs text-[#A3A7AE] uppercase">${escapeHTML(item.variant_title)}</p>`
                  : ''}
                ${isEarphone
                  ? `<aside class="mt-2 border-l border-[#FF0033] bg-[#0A0A0C] p-2.5 text-[11px] text-[#A3A7AE] space-y-0.5">
                       <p class="font-bold text-[#F5F5F7]">Type-C only. Not compatible with iPhone 14 and older, or phones with a 3.5mm jack.</p>
                     </aside>`
                  : ''}
              </div>
              <span class="shrink-0 font-mono-tech text-sm font-bold text-[#F5F5F7] sm:text-base">${formatMoney(item.final_line_price, cart.currency)}</span>
            </div>
            <div class="mt-auto flex items-center justify-between border-t border-[#2A2A2F] pt-3">
              <div class="flex items-center border border-[#2A2A2F] bg-[#0A0A0C]">
                <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="${Math.max(1, item.quantity - 1)}"
                  aria-label="Decrease quantity"
                  class="flex h-10 w-10 items-center justify-center font-mono-tech text-sm font-bold text-[#A3A7AE] transition-colors hover:text-[#F5F5F7] cursor-pointer select-none">−</button>
                <span class="w-8 text-center font-mono-tech text-xs font-bold text-[#F5F5F7]">${item.quantity}</span>
                <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="${item.quantity + 1}"
                  aria-label="Increase quantity"
                  class="flex h-10 w-10 items-center justify-center font-mono-tech text-sm font-bold text-[#A3A7AE] transition-colors hover:text-[#F5F5F7] cursor-pointer select-none">+</button>
              </div>
              <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="0"
                class="font-mono-tech text-xs uppercase tracking-wider text-[#A3A7AE] transition-colors hover:text-[#FF0033] cursor-pointer">[ REMOVE ]</button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function renderSummary(cart) {
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = String(cart.item_count || 0);
    });

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText('rwnd-main-cart-subtotal', formatMoney(cart.items_subtotal_price, cart.currency));
    setText('rwnd-main-cart-total', formatMoney(cart.total_price, cart.currency));
    setText('rwnd-cart-shipping-msg', 'CALCULATED AT CHECKOUT');

    const discountRow = document.getElementById('rwnd-promo-discount-row');
    if (discountRow) {
      if (cart.total_discount > 0) {
        discountRow.classList.remove('hidden');
        discountRow.classList.add('flex');
        setText('rwnd-promo-discount-amount', '−' + formatMoney(cart.total_discount, cart.currency));
      } else {
        discountRow.classList.add('hidden');
        discountRow.classList.remove('flex');
      }
    }

    const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - (cart.total_price || 0));
    const thresholdText = document.getElementById('rwnd-shipping-threshold-text');
    if (thresholdText) {
      thresholdText.textContent = remaining === 0
        ? '✓ FREE DELIVERY THRESHOLD MET (₹999+)'
        : 'ADD ' + formatMoney(remaining, cart.currency) + ' FOR FREE DELIVERY (₹999+)';
    }

    const shippingBar = document.getElementById('rwnd-cart-shipping-bar');
    if (shippingBar) {
      shippingBar.style.width = Math.min(100, Math.round(((cart.total_price || 0) / FREE_DELIVERY_THRESHOLD) * 100)) + '%';
    }

    renderFounderFee(cart);
  }

  function restoreDispatchSelection(cart) {
    const attributes = cart.attributes || {};
    const savedMode = attributes['Dispatch Mode'];
    const savedPin = attributes['Madurai Delivery PIN'] || '';
    if (!savedMode) return;

    document
      .querySelectorAll('input[name="rwnd_dispatch_mode"]')
      .forEach((radio) => {
        if (radio.value === savedMode) radio.checked = true;
      });

    const isFounder = savedMode.indexOf('Hand Delivery by Founders') !== -1;
    const wrap = document.getElementById('rwnd-main-mdu-pin-wrap');
    const input = document.getElementById('rwnd-main-mdu-pin-input');
    if (wrap && input && isFounder) {
      wrap.classList.remove('hidden');
      if (savedPin && isMaduraiPin(savedPin)) input.value = savedPin;
    }
  }

  function applyCart(cart) {
    state.cart = cart;
    restoreDispatchSelection(cart);
    renderMainCartItems(cart);
    renderSummary(cart);
    document.dispatchEvent(new CustomEvent('rwnd:cart-updated', { detail: cart }));
  }

  async function refreshCart() {
    const cart = await getCart();
    applyCart(cart);
    return cart;
  }

  async function getCart() {
    return requestJSON('/cart.js');
  }

  async function changeLine(key, quantity) {
    const qty = Math.max(0, Math.round(Number(quantity) || 0));
    const cart = await requestJSON('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    });
    applyCart(cart);
    return cart;
  }

  function flashCartPill(element) {
    if (!element) return;
    element.classList.add('rwnd-bump');
    window.setTimeout(() => element.classList.remove('rwnd-bump'), 900);
  }

  async function addToCart(form, button) {
    const originalHTML = button ? button.innerHTML : '';
    const originalText = button ? button.textContent : '';
    const buttonRect = button;
    if (button) {
      button.dataset.rwndBusy = 'true';
      button.disabled = true;
      button.innerHTML = '<span class="animate-pulse tracking-widest">[ GETTING IT... ]</span>';
    }

    try {
      await requestJSON('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      await refreshCart();
      flashCartPill(document.querySelector('[data-cart-count]'));
      toast('ADDED — IN YOUR BAG', 'Tap the bag to review your order.');
      if (button) {
        button.innerHTML = '<span style="color:#00FF88">✓ ADDED — IN YOUR BAG</span>';
      }
      return true;
    } catch (error) {
      toast('ADD FAILED', String(error && error.message || 'Add failed'));
      if (button) {
        button.innerHTML = originalHTML;
      }
      return false;
    } finally {
      if (button) {
        window.setTimeout(() => {
          button.innerHTML = originalHTML;
          button.disabled = false;
          delete button.dataset.rwndBusy;
        }, 2400);
      }
    }
  }

  function checkoutUrl(code) {
    const trimmed = String(code || '').trim().toUpperCase();
    return trimmed ? '/checkout?discount=' + encodeURIComponent(trimmed) : '/checkout';
  }

  function setCheckoutLinks(code) {
    ['rwnd-checkout-action-btn'].forEach((id) => {
      const link = document.getElementById(id);
      if (link) link.href = checkoutUrl(code);
    });
  }

  function activeDispatchMode() {
    const radio = selectedPill();
    return (radio && radio.value) || 'Standard Courier (PAN-India)';
  }

  function activePin() {
    var input = findPinInput();
    return (input && input.value) || '';
  }

  async function syncDispatchAttributes() {
    return requestJSON('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        attributes: {
          'Dispatch Mode': activeDispatchMode(),
          'Dispatch Fee': activeDispatchMode().indexOf('Hand Delivery by Founders') !== -1
            ? '₹' + Math.round(FOUNDER_FEE / 100)
            : 'Standard',
          'Madurai Delivery PIN': activePin()
        }
      })
    });
  }

  function togglePinSection(show) {
    const wrap = document.getElementById('rwnd-main-mdu-pin-wrap');
    const input = document.getElementById('rwnd-main-mdu-pin-input');
    const status = document.getElementById('rwnd-main-mdu-pin-status');
    if (!wrap) return;
    if (show) {
      wrap.classList.remove('hidden');
      if (input) input.focus();
    } else {
      wrap.classList.add('hidden');
      if (input) input.value = '';
      setPinStatus(status, '● ENTER 6-DIGIT MADURAI PINCODE (625001–625020)', '#A3A7AE');
    }
    renderFounderFee(state.cart);
  }

  function validatePin() {
    const input = findPinInput();
    const status = document.getElementById('rwnd-main-mdu-pin-status');
    if (!input) return false;
    const digits = digitsOnly(input.value).slice(0, 6);
    input.value = digits;

    if (digits.length < 6) {
      setPinStatus(status, '● ENTER 6-DIGIT MADURAI PINCODE (625001–625020)', '#A3A7AE');
      renderFounderFee(state.cart);
      return false;
    }
    if (isMaduraiPin(digits)) {
      setPinStatus(status, '✓ MADURAI ZONE VERIFIED — FOUNDER DROP-OFF UNLOCKED' + (FOUNDER_FEE > 0 ? ' (+ ' + formatMoney(FOUNDER_FEE, 'INR') + ')' : ''), '#00FF88');
      renderFounderFee(state.cart);
      return true;
    }
    setPinStatus(status, '✕ OUTSIDE MADURAI (625001–625020) — SELECT STANDARD COURIER', '#FF0033');
    renderFounderFee(state.cart);
    return false;
  }

  async function goToCheckout(event) {
    if (event) event.preventDefault();
    // Capture the destination before the await: `event.currentTarget` is null after the event dispatches.
    const target = event && event.currentTarget && event.currentTarget.href
      ? event.currentTarget.href
      : (document.getElementById('rwnd-checkout-action-btn')?.href || '/checkout');
    const isFounder = isFounderSelected();

    if (isFounder) {
      const valid = validatePin();
      if (!valid) {
        const pinInput = findPinInput();
        if (pinInput) pinInput.focus();
        toast('PIN REQUIRED', 'Founder delivery is limited to Madurai PIN codes 625001–625020.');
        return;
      }
    }

    try {
      await syncDispatchAttributes();
    } catch (error) {
      toast('DISPATCH NOT SAVED', error.message);
      return;
    }

    window.location.href = target;
  }

  // --- Event wiring -------------------------------------------------------

  document.addEventListener('submit', (event) => {
    const addForm = event.target.closest('form[action*="/cart/add"]');
    if (addForm) {
      event.preventDefault();
      addToCart(addForm, event.submitter || addForm.querySelector('[name="add"], button[type="submit"]'));
      return;
    }

    const changeForm = event.target.closest('form[action*="/cart/change"]');
    if (changeForm) {
      event.preventDefault();
      const key = changeForm.querySelector('[name="id"]')?.value;
      const quantity = changeForm.querySelector('[name="quantity"]')?.value;
      if (!key) return;
      changeLine(key, quantity).catch((error) => toast('CART UPDATE FAILED', error.message));
    }
  });

  document.addEventListener('click', (event) => {
    const quantityButton = event.target.closest('[data-rwnd-line-key]');
    if (quantityButton) {
      event.preventDefault();
      changeLine(quantityButton.dataset.rwndLineKey, quantityButton.dataset.rwndQty)
        .catch((error) => toast('CART UPDATE FAILED', error.message));
      return;
    }

    const instantCheckout = event.target.closest('[data-rwnd-instant-checkout]');
    if (instantCheckout) {
      event.preventDefault();
      const form = instantCheckout.closest('form[action*="/cart/add"]');
      if (!form) {
        window.location.href = '/checkout';
        return;
      }
      addToCart(form, instantCheckout).then((added) => {
        if (added) window.location.href = '/checkout';
      });
    }
  });

  document.addEventListener('change', (event) => {
    const radio = event.target.closest('input[name="rwnd_dispatch_mode"]');
    if (!radio) return;
    const isFounder = radio.value.indexOf('Hand Delivery by Founders') !== -1;
    togglePinSection(isFounder);
    syncDispatchAttributes().catch(() => {});
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest('#rwnd-main-mdu-pin-input');
    if (!input) return;
    validatePin();
  });

  document.addEventListener('DOMContentLoaded', () => {
    refreshCart().catch(() => {});

    // Keep the checkout URL clean: discounts are applied by Shopify, not the theme.
    setCheckoutLinks('');
  });

  // --- Backwards-compatible globals used by existing markup ---------------

  window.RWND_CART = {
    refresh: refreshCart,
    add: addToCart,
    changeLine: changeLine,
    isMaduraiPin: isMaduraiPin
  };

  window.handleMainCartCheckout = goToCheckout;

  window.handlePromoApply = function (event) {
    if (event) event.preventDefault();
    const input = document.getElementById('cart-promo-code');
    const message = document.getElementById('promo-status-msg');
    const code = (input?.value || '').trim().toUpperCase();

    if (!code) {
      if (message) {
        message.textContent = 'ENTER A CODE TO APPLY AT CHECKOUT';
        message.className = 'text-[10px] mt-1.5 font-mono-tech uppercase tracking-wider text-[#FF0033] block';
      }
      return;
    }
    setCheckoutLinks(code);
    if (message) {
      message.textContent = '✓ ' + code + ' WILL BE VALIDATED AT CHECKOUT';
      message.className = 'text-[10px] mt-1.5 font-mono-tech uppercase tracking-wider text-[#00FF88] block';
    }
  };
})();
