/**
 * assets/cart.js
 * Single source of truth for cart rendering, add-to-cart, dispatch attributes
 * and checkout hand-off.
 *
 * Money is never calculated here. Every displayed amount comes from Shopify's
 * /cart.js response (items_subtotal_price, total_discount, total_price) so the
 * cart can never promise a price the checkout will not honour.
 */
(function () {
  'use strict';

  const MADURAI_PIN_MIN = 625001;
  const MADURAI_PIN_MAX = 625020;
  const FREE_DELIVERY_THRESHOLD = 99900;

  const state = { cart: null };

  // /cart.js values are in the currency's minor unit (paise for INR).
  const formatMoney = (cents, currency) => {
    const code = currency || 'INR';
    const symbol = code === 'INR' ? '₹' : code;
    const value = Math.round(Number(cents) || 0) / 100;
    return code === 'INR' ? symbol + value.toLocaleString('en-IN') : symbol + value.toLocaleString();
  };

  const escapeHTML = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));

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

  function renderDrawerItems(cart) {
    const list = document.getElementById('drawer-items-list');
    const footer = document.getElementById('drawer-footer-panel');
    if (!list) return;

    if (!cart.items || cart.items.length === 0) {
      if (footer) footer.classList.add('hidden');
      list.innerHTML = `
        <div class="flex h-full flex-col items-center justify-center text-center py-12">
          <p class="text-xs uppercase text-[#A3A7AE] tracking-widest">// BAG IS EMPTY</p>
          <a href="/collections/all" class="mt-4 border border-[#FF0033] bg-[#FF0033] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#CC0029] transition-colors">
            EXPLORE ARCHIVE →
          </a>
        </div>`;
      return;
    }

    if (footer) footer.classList.remove('hidden');
    list.innerHTML = cart.items.map((item) => `
      <div class="border border-[#2A2A2F] bg-[#131316] p-3 flex gap-3 relative group">
        <div class="aspect-square w-16 bg-[#000000] border border-[#2A2A2F] shrink-0 flex items-center justify-center overflow-hidden">
          ${item.image
            ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" width="160" height="160" class="h-full w-full object-contain">`
            : '<span class="text-[9px] text-[#A3A7AE]">NO IMG</span>'}
        </div>
        <div class="flex-1 min-w-0 flex flex-col justify-between">
          <div class="pr-5">
            <a href="${escapeHTML(item.url)}" class="font-display text-xs font-bold uppercase text-white line-clamp-1 hover:text-[#FF0033] transition-colors">
              ${escapeHTML(item.product_title)}
            </a>
            ${item.variant_title && item.variant_title !== 'Default Title'
              ? `<p class="text-[10px] text-[#A3A7AE] uppercase truncate mt-0.5">${escapeHTML(item.variant_title)}</p>`
              : ''}
            <p class="text-xs font-bold text-white mt-1">${formatMoney(item.final_line_price, cart.currency)}</p>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <div class="flex items-center border border-[#2A2A2F] bg-[#000000]">
              <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="${Math.max(0, item.quantity - 1)}"
                class="h-6 w-6 flex items-center justify-center text-white hover:bg-[#2A2A2F] hover:text-[#FF0033] text-xs cursor-pointer select-none"
                aria-label="Decrease quantity">−</button>
              <span class="w-6 text-center text-[10px] font-bold text-white">${item.quantity}</span>
              <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="${item.quantity + 1}"
                class="h-6 w-6 flex items-center justify-center text-white hover:bg-[#2A2A2F] hover:text-[#FF0033] text-xs cursor-pointer select-none"
                aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
        <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="0"
          class="absolute top-2 right-2 text-[#A3A7AE] hover:text-[#FF0033] text-xs p-1 cursor-pointer"
          aria-label="Remove item">✕</button>
      </div>`).join('');
  }

  function renderMainCartItems(cart) {
    const container = document.getElementById('rwnd-main-cart-items');
    if (!container) return;

    if (!cart.items || cart.items.length === 0) {
      container.innerHTML = `
        <div class="flex min-h-[300px] flex-col items-center justify-center border border-[#2A2A2F] bg-[#131316] p-8 text-center">
          <span class="text-[10px] font-bold uppercase tracking-widest text-[#FF0033]">// TRANSMISSION SILENT</span>
          <p class="mt-2 font-display text-xl font-bold uppercase tracking-wider text-[#F5F5F7]">YOUR HARDWARE BAG IS EMPTY</p>
          <p class="mt-1 font-mono-tech text-xs text-[#A3A7AE]">No archive components currently secured.</p>
          <a href="/collections/all" class="mt-6 inline-flex h-12 items-center justify-center border border-[#FF0033] bg-[#FF0033] px-8 font-mono-tech text-xs font-bold uppercase tracking-widest text-[#F5F5F7] transition-all hover:bg-[#CC0029]">
            EXPLORE ARCHIVE →
          </a>
        </div>`;
      return;
    }

    container.innerHTML = cart.items.map((item) => {
      const isEarphone = /earphone|ear-01/i.test(`${item.product_title || ''} ${item.handle || ''}`);
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
                <button type="button" data-rwnd-line-key="${escapeHTML(item.key)}" data-rwnd-qty="${Math.max(0, item.quantity - 1)}"
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

  async function renderSummary(cart) {
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = String(cart.item_count || 0);
    });
    const drawerCount = document.getElementById('drawer-cart-count');
    if (drawerCount) drawerCount.textContent = String(cart.item_count || 0);

    const setText = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    };

    setText('rwnd-main-cart-subtotal', formatMoney(cart.items_subtotal_price, cart.currency));
    setText('rwnd-main-cart-total', formatMoney(cart.total_price, cart.currency));
    setText('drawer-subtotal-val', formatMoney(cart.items_subtotal_price, cart.currency));
    setText('drawer-total-val', formatMoney(cart.total_price, cart.currency));

    // Fetch shipping rates from Shopify Cart Rates API and display Dispatch Fee
    await updateShippingDisplay(cart);

    const discountRow = document.getElementById('rwnd-promo-discount-row');
    if (discountRow) {
      if (cart.total_discount > 0) {
        discountRow.classList.remove('hidden');
        discountRow.classList.add('flex');
        setText('rwnd-promo-discount-amount', `−${formatMoney(cart.total_discount, cart.currency)}`);
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
        : `ADD ${formatMoney(remaining, cart.currency)} FOR FREE DELIVERY (₹999+)`;
    }

    const shippingBar = document.getElementById('rwnd-cart-shipping-bar');
    if (shippingBar) {
      shippingBar.style.width = `${Math.min(100, Math.round(((cart.total_price || 0) / FREE_DELIVERY_THRESHOLD) * 100))}%`;
    }

    const drawerBar = document.getElementById('drawer-shipping-bar');
    if (drawerBar) {
      drawerBar.style.width = `${Math.min(100, Math.round(((cart.total_price || 0) / FREE_DELIVERY_THRESHOLD) * 100))}%`;
    }

    const drawerText = document.getElementById('drawer-shipping-text');
    if (drawerText) {
      drawerText.innerHTML = remaining === 0
        ? '<span class="text-[#00FF88]">✓ FREE DELIVERY THRESHOLD MET (₹999+)</span>'
        : `<span class="text-[#A3A7AE]">ADD <strong class="text-white">${formatMoney(remaining, cart.currency)}</strong> MORE FOR FREE DELIVERY</span>`;
    }
  }

  /**
   * Fetch shipping rates from Shopify Cart Rates API and update UI.
   * Also displays the Dispatch Fee from cart attributes (set by syncDispatchAttributes).
   * Falls back gracefully if API is unavailable.
   */
  async function updateShippingDisplay(cart) {
    const attributes = cart.attributes || {};
    const dispatchMode = attributes['Dispatch Mode'] || 'Standard Courier (PAN-India)';
    const dispatchFeeAttr = attributes['Dispatch Fee'] || 'Standard';
    const maduraiPin = attributes['Madurai Delivery PIN'] || '';

    // Determine if we're in Madurai founder delivery mode
    const isFounderDelivery = dispatchMode.indexOf('Hand Delivery by Founders') !== -1;
    const isMaduraiPinValid = maduraiPin && isMaduraiPin(maduraiPin);

    let shippingDisplayText = 'CALCULATED AT CHECKOUT';
    let shippingDetailText = '';

    // Build the display text based on dispatch mode
    if (isFounderDelivery && isMaduraiPinValid) {
      // Founder hand delivery - show the ₹499 fee
      shippingDisplayText = `HAND DELIVERY BY FOUNDERS · ${formatMoney(49900, cart.currency)}`;
      shippingDetailText = 'MADURAI 625001–625020';
    } else if (isFounderDelivery && !isMaduraiPinValid) {
      // Founder selected but no valid PIN
      shippingDisplayText = 'ENTER MADURAI PIN FOR FOUNDER DELIVERY';
      shippingDetailText = 'REQUIRED FOR HAND DELIVERY';
    } else {
      // Standard courier - try to fetch real rates from Cart Rates API
      try {
        const ratesResponse = await fetch('/cart/shipping_rates.json');
        if (ratesResponse.ok) {
          const ratesData = await ratesResponse.json();
          if (ratesData.shipping_rates && ratesData.shipping_rates.length > 0) {
            // Find the cheapest rate
            const cheapestRate = ratesData.shipping_rates.reduce((min, rate) =>
              rate.price < min.price ? rate : min, ratesData.shipping_rates[0]
            );
            const ratePrice = formatMoney(cheapestRate.price, cart.currency);
            shippingDisplayText = `${cheapestRate.name} · ${ratePrice}`;
            if (cheapestRate.price === 0) {
              shippingDisplayText = `${cheapestRate.name} · FREE`;
            }
            shippingDetailText = 'STANDARD COURIER (PAN-INDIA)';
          }
        }
      } catch (error) {
        // Fallback: use cart attribute for dispatch fee if available
        if (dispatchFeeAttr !== 'Standard') {
          shippingDisplayText = `STANDARD COURIER · ${dispatchFeeAttr}`;
        }
      }
    }

    // Update both drawer and main cart shipping displays
    setText('rwnd-cart-shipping-msg', shippingDisplayText);
    setText('drawer-shipping-val', shippingDisplayText);

    // Also update the COD charge row in main cart
    const codChargeVal = document.getElementById('rwnd-cod-charge-val');
    if (codChargeVal) {
      codChargeVal.textContent = shippingDisplayText;
    }
  }

  function restoreDispatchSelection(cart) {
    const attributes = cart.attributes || {};
    const savedMode = attributes['Dispatch Mode'];
    const savedPin = attributes['Madurai Delivery PIN'] || '';
    if (!savedMode) return;

    document
      .querySelectorAll('input[name="rwnd_dispatch_mode"], input[name="rwnd_drawer_dispatch_mode"]')
      .forEach((radio) => {
        if (radio.value === savedMode) radio.checked = true;
      });

    const isFounder = savedMode.indexOf('Hand Delivery by Founders') !== -1;
    [
      { wrap: 'rwnd-main-mdu-pin-wrap', input: 'rwnd-main-mdu-pin-input' },
      { wrap: 'rwnd-drawer-mdu-pin-wrap', input: 'rwnd-drawer-mdu-pin-input' }
    ].forEach((pair) => {
      const wrap = document.getElementById(pair.wrap);
      const input = document.getElementById(pair.input);
      if (!wrap || !input) return;
      if (isFounder) {
        wrap.classList.remove('hidden');
        if (savedPin) input.value = savedPin;
      }
    });
  }

  async function applyCart(cart) {
    state.cart = cart;
    restoreDispatchSelection(cart);
    renderDrawerItems(cart);
    renderMainCartItems(cart);
    await renderSummary(cart);
    document.dispatchEvent(new CustomEvent('rwnd:cart-updated', { detail: cart }));
  }

  async function refreshCart() {
    const cart = await getCart();
    await applyCart(cart);
    return cart;
  }

  async function getCart() {
    return requestJSON('/cart.js');
  }

  function openDrawer() {
    const overlay = document.getElementById('rwnd-cart-drawer-overlay');
    const drawer = document.getElementById('rwnd-cart-drawer');
    if (!overlay || !drawer) return;
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    drawer.classList.remove('translate-x-full');
    document.body.style.overflow = 'hidden';
    refreshCart().catch(() => {});
  }

  function closeDrawer() {
    const overlay = document.getElementById('rwnd-cart-drawer-overlay');
    const drawer = document.getElementById('rwnd-cart-drawer');
    if (!overlay || !drawer) return;
    overlay.classList.add('opacity-0', 'pointer-events-none');
    drawer.classList.add('translate-x-full');
    document.body.style.overflow = '';
  }

  async function changeLine(key, quantity) {
    const cart = await requestJSON('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: Math.max(0, Number(quantity) || 0) })
    });
    applyCart(cart);
    return cart;
  }

  async function addToCart(form, button) {
    const originalHTML = button ? button.innerHTML : '';
    if (button) {
      button.dataset.rwndBusy = 'true';
      button.disabled = true;
      button.innerHTML = '<span class="animate-pulse tracking-widest">[ SECURING... ]</span>';
    }
    try {
      await requestJSON('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      await refreshCart();
      openDrawer();
      toast('SECURED IN BAG', 'Your piece was added.');
      return true;
    } catch (error) {
      toast('ADD FAILED', error.message);
      return false;
    } finally {
      if (button) {
        window.setTimeout(() => {
          button.innerHTML = originalHTML;
          button.disabled = false;
          delete button.dataset.rwndBusy;
        }, 1800);
      }
    }
  }

  function checkoutUrl(code) {
    const trimmed = String(code || '').trim().toUpperCase();
    return trimmed ? `/checkout?discount=${encodeURIComponent(trimmed)}` : '/checkout';
  }

  function setCheckoutLinks(code) {
    ['rwnd-checkout-action-btn', 'drawer-checkout-link'].forEach((id) => {
      const link = document.getElementById(id);
      if (link) link.href = checkoutUrl(code);
    });
  }

  function dispatchGroupPrefix() {
    // The /cart page and the drawer can both be present. Prefer whichever
    // control is actually rendered on this page so the two never disagree.
    if (document.querySelector('input[name="rwnd_dispatch_mode"]')) return 'rwnd-main';
    if (document.querySelector('input[name="rwnd_drawer_dispatch_mode"]')) return 'rwnd-drawer';
    return 'rwnd-main';
  }

  function activeDispatchMode() {
    const name = dispatchGroupPrefix() === 'rwnd-drawer'
      ? 'rwnd_drawer_dispatch_mode'
      : 'rwnd_dispatch_mode';
    return document.querySelector(`input[name="${name}"]:checked`)?.value
      || 'Standard Courier (PAN-India)';
  }

  function otherDispatchPrefix(prefix) {
    return prefix === 'rwnd-main' ? 'rwnd-drawer' : 'rwnd-main';
  }

  function activePin() {
    const prefix = dispatchGroupPrefix();
    return document.getElementById(`${prefix}-mdu-pin-input`)?.value
      || document.getElementById(`${otherDispatchPrefix(prefix)}-mdu-pin-input`)?.value
      || '';
  }

  async function syncDispatchAttributes() {
    await requestJSON('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        attributes: {
          'Dispatch Mode': activeDispatchMode(),
          'Dispatch Fee': activeDispatchMode().indexOf('Hand Delivery by Founders') !== -1 ? '₹499' : 'Standard',
          'Madurai Delivery PIN': activePin()
        }
      })
    });
  }

  function togglePinSection(prefix, show) {
    const wrap = document.getElementById(`${prefix}-mdu-pin-wrap`);
    const input = document.getElementById(`${prefix}-mdu-pin-input`);
    const status = document.getElementById(`${prefix}-mdu-pin-status`);
    if (!wrap) return;
    if (show) {
      wrap.classList.remove('hidden');
      input?.focus();
    } else {
      wrap.classList.add('hidden');
      if (input) input.value = '';
      setPinStatus(status, '● ENTER 6-DIGIT MADURAI PINCODE (625001–625020)', '#A3A7AE');
    }
  }

  function validatePin(prefix) {
    const input = document.getElementById(`${prefix}-mdu-pin-input`);
    const status = document.getElementById(`${prefix}-mdu-pin-status`);
    if (!input) return false;
    if (!input.value) {
      const mirrorValue = document.getElementById(`${otherDispatchPrefix(prefix)}-mdu-pin-input`)?.value;
      if (mirrorValue) input.value = mirrorValue;
    }
    const digits = digitsOnly(input.value).slice(0, 6);
    input.value = digits;

    if (digits.length < 6) {
      setPinStatus(status, '● ENTER 6-DIGIT MADURAI PINCODE (625001–625020)', '#A3A7AE');
      return false;
    }
    if (isMaduraiPin(digits)) {
      setPinStatus(status, '✓ MADURAI ZONE VERIFIED — FOUNDER DROP-OFF UNLOCKED (₹499)', '#00FF88');
      // Refresh cart to update shipping display with founder delivery fee
      refreshCart().catch(() => {});
      return true;
    }
    setPinStatus(status, '✕ OUTSIDE MADURAI (625001–625020) — SELECT STANDARD COURIER', '#FF0033');
    // Refresh cart to update shipping display (back to standard)
    refreshCart().catch(() => {});
    return false;
  }

  async function goToCheckout(event) {
    if (event) event.preventDefault();
    // Capture the destination before the await: `event.currentTarget` is null after the event dispatches.
    const target = event && event.currentTarget && event.currentTarget.href
      ? event.currentTarget.href
      : (document.getElementById('rwnd-checkout-action-btn')?.href || '/checkout');
    const prefix = dispatchGroupPrefix();
    const isFounder = activeDispatchMode().indexOf('Hand Delivery by Founders') !== -1;

    if (isFounder) {
      const valid = validatePin(prefix);
      if (!valid) {
        document.getElementById(`${prefix}-mdu-pin-input`)?.focus();
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
    const radio = event.target.closest('input[name="rwnd_dispatch_mode"], input[name="rwnd_drawer_dispatch_mode"]');
    if (!radio) return;
    const isFounder = radio.value.indexOf('Hand Delivery by Founders') !== -1;
    document
      .querySelectorAll('input[name="rwnd_dispatch_mode"], input[name="rwnd_drawer_dispatch_mode"]')
      .forEach((other) => {
        if (other !== radio) other.checked = other.value === radio.value;
      });
    togglePinSection('rwnd-main', isFounder);
    togglePinSection('rwnd-drawer', isFounder);
    syncDispatchAttributes()
      .then(() => refreshCart())
      .catch(() => {});
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest('#rwnd-main-mdu-pin-input, #rwnd-drawer-mdu-pin-input');
    if (!input) return;
    validatePin(input.id.indexOf('rwnd-main') === 0 ? 'rwnd-main' : 'rwnd-drawer');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('rwnd-cart-drawer-overlay');
    overlay?.addEventListener('click', (event) => {
      if (event.target.id === 'rwnd-cart-drawer-overlay') closeDrawer();
    });

    refreshCart().catch(() => {});

    // Keep the checkout URL clean: discounts are applied by Shopify, not the theme.
    setCheckoutLinks('');
  });

  // --- Backwards-compatible globals used by existing markup ---------------

  window.RWND_CART = {
    refresh: refreshCart,
    add: addToCart,
    open: openDrawer,
    close: closeDrawer,
    changeLine,
    isMaduraiPin
  };

  window.openCartDrawer = openDrawer;
  window.closeCartDrawer = closeDrawer;
  window.fetchDrawerCart = () => refreshCart();
  window.fetchMainCartData = () => refreshCart();
  window.updateDrawerItemQty = (key, quantity) => changeLine(key, quantity).catch((error) => toast('CART UPDATE FAILED', error.message));
  window.handleLineChange = (event, key, quantity) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    changeLine(key, quantity).catch((error) => toast('CART UPDATE FAILED', error.message));
  };
  window.handleMainCartCheckout = goToCheckout;
  window.handleDrawerCheckout = goToCheckout;

  window.toggleMainCartMaduraiPin = (show) => togglePinSection('rwnd-main', show);
  window.toggleDrawerMaduraiPin = (show) => togglePinSection('rwnd-drawer', show);
  window.validateMainCartMaduraiPin = () => validatePin('rwnd-main');
  window.validateDrawerMaduraiPin = () => validatePin('rwnd-drawer');
  window.syncMainCartDispatchAttributes = syncDispatchAttributes;
  window.syncDrawerDispatchAttributes = syncDispatchAttributes;

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
      message.textContent = `✓ ${code} WILL BE VALIDATED AT CHECKOUT`;
      message.className = 'text-[10px] mt-1.5 font-mono-tech uppercase tracking-wider text-[#00FF88] block';
    }
  };
})();
