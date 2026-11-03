/**
 * rwnd20s. — Shopify Online Store 2.0 Vanilla JavaScript Architecture
 * Handles:
 *  - Native Shopify AJAX Cart API (/cart.js, /cart/add.js, /cart/change.js, /checkout)
 *  - Slide-out Cart & Wishlist Drawer
 *  - Welcome Offer Popup (5% OFF Current Order + 10% OFF Next Purchase)
 *  - Hero Stage Switcher & Drop 01 Countdown Clock
 *  - Category Filtering, Live Search & Price Sorting
 *  - Product Quick-View Modal, Image Galleries, Variant Picker & Price-Drop Alerts
 *  - Testimonials Collector Cardholder Submission
 *  - Retro Status Footer Live Uptime Clock & Keyboard Shortcuts (b, w, s, Escape)
 */

document.addEventListener('DOMContentLoaded', () => {
  const FREE_SHIPPING_THRESHOLD_PAISE = 99900; // ₹999.00 in Shopify cents/paise
  const WISHLIST_STORAGE_KEY = 'rwnd20s_wishlist_v1';
  const WELCOME_OFFER_STORAGE_KEY = 'rwnd20s_welcome_offer_v1';

  /* ==========================================================================
   * 1. UTILITIES & TOAST NOTIFICATIONS
   * ========================================================================== */
  function formatMoneyINR(centsOrPaise) {
    const rupees = Math.round((Number(centsOrPaise) || 0) / 100);
    return '₹' + rupees.toLocaleString('en-IN');
  }

  function showToast(title, subtitle) {
    const container = document.getElementById('rwnd-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className =
      'pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border border-black/20 bg-white p-4 text-[#09090B] shadow-xl transition-all duration-200';
    toast.innerHTML = `
      <div>
        <p class="font-mono-tech text-xs font-bold tracking-wider text-[#09090B] uppercase">${title}</p>
        <p class="mt-0.5 text-xs text-[#3F3F46]">${subtitle}</p>
      </div>
      <button type="button" aria-label="Dismiss notification" class="text-xs font-bold text-[#52525B] hover:text-[#09090B]">✕</button>
    `;

    toast.querySelector('button')?.addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  /* ==========================================================================
   * 2. INITIAL ARCHIVE LOADER
   * ========================================================================== */
  const archiveLoader = document.getElementById('rwnd-archive-loader');
  if (archiveLoader) {
    setTimeout(() => {
      archiveLoader.style.opacity = '0';
      setTimeout(() => {
        archiveLoader.style.display = 'none';
      }, 300);
    }, 650);
  }

  /* ==========================================================================
   * 3. WELCOME OFFER POPUP (5% OFF NOW + 10% OFF NEXT PURCHASE)
   * ========================================================================== */
  const welcomePopup = document.getElementById('rwnd-welcome-popup');
  const welcomeForm = document.getElementById('rwnd-welcome-form');
  const welcomeUnlocked = document.getElementById('rwnd-welcome-unlocked');
  const welcomeEmailDisplay = document.getElementById('rwnd-welcome-email-display');
  const welcomeError = document.getElementById('welcome-offer-error');
  const welcomeHeaderTrigger = document.getElementById('rwnd-open-welcome-popup');

  function getSavedWelcomeOffer() {
    try {
      const raw = localStorage.getItem(WELCOME_OFFER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function syncWelcomeOfferUI() {
    const offer = getSavedWelcomeOffer();
    if (offer && offer.email) {
      welcomeForm?.classList.add('hidden');
      welcomeUnlocked?.classList.remove('hidden');
      if (welcomeEmailDisplay) welcomeEmailDisplay.textContent = offer.email;
      if (welcomeHeaderTrigger) {
        welcomeHeaderTrigger.textContent = '5% + 10% PASS ACTIVE';
      }
    }
  }

  function openWelcomePopup() {
    if (!welcomePopup) return;
    syncWelcomeOfferUI();
    welcomePopup.classList.remove('hidden');
    welcomePopup.classList.add('flex');
  }

  function closeWelcomePopup() {
    if (!welcomePopup) return;
    welcomePopup.classList.add('hidden');
    welcomePopup.classList.remove('flex');
  }

  if (welcomePopup) {
    const existingOffer = getSavedWelcomeOffer();
    if (!existingOffer) {
      openWelcomePopup();
    } else {
      syncWelcomeOfferUI();
    }
  }

  welcomeHeaderTrigger?.addEventListener('click', openWelcomePopup);
  document.querySelectorAll('[data-close-welcome]').forEach((btn) => {
    btn.addEventListener('click', closeWelcomePopup);
  });

  welcomeForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('welcome-offer-email');
    const email = (emailInput?.value || '').trim().toLowerCase();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!valid) {
      if (welcomeError) {
        welcomeError.textContent = 'Please enter a valid email address.';
        welcomeError.classList.remove('hidden');
      }
      return;
    }

    welcomeError?.classList.add('hidden');
    const offerData = {
      email,
      instantCode: 'RWND5NOW',
      nextOrderCode: 'RWND10NEXT',
      instantDiscountPercent: 5,
      nextDiscountPercent: 10
    };
    try {
      localStorage.setItem(WELCOME_OFFER_STORAGE_KEY, JSON.stringify(offerData));
    } catch {
      // ignore storage errors
    }
    syncWelcomeOfferUI();
    fetchCartState();
    showToast(
      '5% + 10% ARCHIVE PASS UNLOCKED',
      `5% OFF applied (RWND5NOW) + 10% next order (RWND10NEXT) for ${email}.`
    );
  });

  /* ==========================================================================
   * 4. SHOPIFY NATIVE AJAX CART API & SLIDE-OUT DRAWER
   * ========================================================================== */
  const cartDrawer = document.getElementById('rwnd-cart-drawer');
  const cartItemsContainer = document.getElementById('rwnd-cart-items');
  const cartSubtotalEl = document.getElementById('rwnd-cart-subtotal');
  const cartDiscountRow = document.getElementById('rwnd-cart-discount-row');
  const cartDiscountAmountEl = document.getElementById('rwnd-cart-discount-amount');
  const cartTotalEl = document.getElementById('rwnd-cart-total');
  const cartShippingMsgEl = document.getElementById('rwnd-shipping-message');
  const cartShippingBarEl = document.getElementById('rwnd-shipping-bar');
  const cartCountBadges = document.querySelectorAll('[data-cart-count]');
  const drawerTabs = document.querySelectorAll('[data-drawer-tab]');
  const bagPanel = document.getElementById('rwnd-drawer-bag-panel');
  const wishlistPanel = document.getElementById('rwnd-drawer-wishlist-panel');

  function openCartDrawer(tab = 'bag') {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('hidden');
    cartDrawer.classList.add('flex');
    switchDrawerTab(tab);
    if (tab === 'bag') {
      fetchCartState();
    } else {
      renderWishlistDrawer();
    }
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('hidden');
    cartDrawer.classList.remove('flex');
  }

  function switchDrawerTab(tabName) {
    drawerTabs.forEach((btn) => {
      const isTarget = btn.getAttribute('data-drawer-tab') === tabName;
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      if (isTarget) {
        btn.className =
          'inline-flex items-center gap-2 rounded-full border border-[#09090B] bg-white px-4 py-2 font-mono-tech text-xs font-bold tracking-wider text-[#09090B] uppercase shadow-sm cursor-pointer';
      } else {
        btn.className =
          'inline-flex items-center gap-2 rounded-full border border-[#09090B]/20 bg-white/50 px-4 py-2 font-mono-tech text-xs font-bold tracking-wider text-[#3F3F46] uppercase hover:text-[#09090B] cursor-pointer';
      }
    });

    if (tabName === 'wishlist') {
      bagPanel?.classList.add('hidden');
      wishlistPanel?.classList.remove('hidden');
      renderWishlistDrawer();
    } else {
      wishlistPanel?.classList.add('hidden');
      bagPanel?.classList.remove('hidden');
    }
  }

  async function fetchCartState() {
    try {
      const response = await fetch('/cart.js', {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) return;
      const cart = await response.json();
      renderCartDrawer(cart);
    } catch {
      // Fallback if previewed outside Shopify server
    }
  }

  function renderCartDrawer(cart) {
    const itemCount = Number(cart?.item_count) || 0;
    const totalPricePaise = Number(cart?.total_price) || 0;

    cartCountBadges.forEach((el) => {
      el.textContent = String(itemCount);
    });

    // Free Shipping Bar Calculation
    const remainingPaise = Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - totalPricePaise);
    const progressPercent = Math.min(
      100,
      Math.round((totalPricePaise / FREE_SHIPPING_THRESHOLD_PAISE) * 100)
    );

    if (cartShippingMsgEl) {
      if (remainingPaise === 0 && itemCount > 0) {
        cartShippingMsgEl.innerHTML =
          '<span class="font-bold text-[#09090B]">✦ You\'ve unlocked FREE Express Shipping!</span>';
      } else {
        cartShippingMsgEl.innerHTML = `Add <strong class="text-[#09090B]">${formatMoneyINR(
          remainingPaise
        )}</strong> more to unlock FREE Shipping`;
      }
    }
    if (cartShippingBarEl) {
      cartShippingBarEl.style.width = `${progressPercent}%`;
    }

    if (!cartItemsContainer) return;

    if (!cart.items || cart.items.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="flex h-64 flex-col items-center justify-center text-center">
          <p class="font-display text-lg font-bold text-[#09090B] uppercase">YOUR HARDWARE BAG IS EMPTY</p>
          <p class="mt-1 max-w-xs text-xs text-[#3F3F46]">Explore Drop 01 watches, pink chrome Type-C wired earphones, heavy 316L rings, chains, and bracelets.</p>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = cart.items
        .map(
          (item) => `
        <div class="flex gap-4 rounded-2xl border border-white bg-white/90 p-3.5 shadow-sm">
          <img src="${item.image || ''}" alt="${item.product_title}" class="h-20 w-20 shrink-0 rounded-xl border border-[#09090B]/15 bg-[#D4D8E0] object-contain p-1.5">
          <div class="flex flex-1 flex-col justify-between">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="font-display text-xs font-bold text-[#09090B] uppercase">${item.product_title}</h4>
                <p class="mt-0.5 font-mono-tech text-[11px] text-[#52525B]">${item.variant_title || 'Standard Spec'}</p>
              </div>
              <button type="button" data-cart-change-id="${item.key}" data-cart-qty="0" aria-label="Remove item" class="font-mono-tech text-xs font-bold text-[#52525B] hover:text-[#09090B] cursor-pointer">✕</button>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <div class="inline-flex items-center rounded-full border border-[#09090B]/20 bg-white px-1.5 py-0.5">
                <button type="button" data-cart-change-id="${item.key}" data-cart-qty="${item.quantity - 1}" class="h-6 w-6 rounded-full font-mono-tech text-xs font-bold text-[#09090B] hover:bg-[#09090B]/10 cursor-pointer">-</button>
                <span class="w-6 text-center font-mono-tech text-xs font-bold text-[#09090B]">${item.quantity}</span>
                <button type="button" data-cart-change-id="${item.key}" data-cart-qty="${item.quantity + 1}" class="h-6 w-6 rounded-full font-mono-tech text-xs font-bold text-[#09090B] hover:bg-[#09090B]/10 cursor-pointer">+</button>
              </div>
              <span class="font-mono-tech text-sm font-bold text-[#09090B]">${formatMoneyINR(item.final_line_price)}</span>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }

    const offer = getSavedWelcomeOffer();
    const discountPaise = offer ? Math.round(totalPricePaise * 0.05) : 0;
    const finalTotalPaise = Math.max(0, totalPricePaise - discountPaise);

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatMoneyINR(totalPricePaise);
    if (cartDiscountRow && cartDiscountAmountEl) {
      if (discountPaise > 0) {
        cartDiscountRow.classList.remove('hidden');
        cartDiscountRow.classList.add('flex');
        cartDiscountAmountEl.textContent = '-' + formatMoneyINR(discountPaise);
      } else {
        cartDiscountRow.classList.add('hidden');
      }
    }
    if (cartTotalEl) cartTotalEl.textContent = formatMoneyINR(finalTotalPaise);
  }

  async function addItemToShopifyCart(variantId, quantity = 1) {
    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          id: Number(variantId) || variantId,
          quantity: Number(quantity) || 1
        })
      });

      if (response.ok) {
        await fetchCartState();
        openCartDrawer('bag');
        showToast('ADDED TO HARDWARE BAG', 'Artifact synced with Shopify Cart.');
      } else {
        openCartDrawer('bag');
        showToast('BAG UPDATED', 'Artifact added to bag preview.');
      }
    } catch {
      openCartDrawer('bag');
      showToast('BAG UPDATED', 'Artifact added to bag preview.');
    }
  }

  async function updateShopifyCartItem(lineKey, quantity) {
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          id: lineKey,
          quantity: Math.max(0, Number(quantity) || 0)
        })
      });
      if (response.ok) {
        const updatedCart = await response.json();
        renderCartDrawer(updatedCart);
      }
    } catch {
      // ignore network error in preview mode
    }
  }

  /* ==========================================================================
   * 5. WISHLIST PERSISTENCE (localStorage)
   * ========================================================================== */
  function getWishlistItems() {
    try {
      const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveWishlistItems(items) {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
    updateWishlistBadges();
  }

  function updateWishlistBadges() {
    const items = getWishlistItems();
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => {
      el.textContent = String(items.length);
    });
  }

  function renderWishlistDrawer() {
    const listContainer = document.getElementById('rwnd-wishlist-items');
    if (!listContainer) return;
    const items = getWishlistItems();
    if (items.length === 0) {
      listContainer.innerHTML = `
        <div class="flex h-64 flex-col items-center justify-center text-center">
          <p class="font-display text-lg font-bold text-[#09090B] uppercase">YOUR WISHLIST IS EMPTY</p>
          <p class="mt-1 max-w-xs text-xs text-[#3F3F46]">Tap the heart icon on any chronograph, earphone, ring, or chain to save it for later.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = items
      .map(
        (item) => `
      <div class="flex flex-col gap-3 rounded-2xl border border-white bg-white/90 p-3.5 shadow-sm">
        <div class="flex gap-3.5">
          <img src="${item.image}" alt="${item.title}" class="h-16 w-16 rounded-xl border border-[#09090B]/15 bg-[#D4D8E0] object-contain p-1">
          <div class="flex-1">
            <h4 class="font-display text-xs font-bold text-[#09090B] uppercase">${item.title}</h4>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="font-mono-tech text-sm font-bold text-[#09090B]">${item.price}</span>
              <span class="font-mono-tech text-[11px] text-[#52525B] line-through">${item.comparePrice || ''}</span>
            </div>
          </div>
          <button type="button" data-remove-wishlist="${item.handle}" class="font-mono-tech text-xs font-bold text-[#52525B] hover:text-[#09090B] cursor-pointer">✕</button>
        </div>
        <button type="button" data-add-to-cart variant-id="${item.variantId}" class="w-full rounded-full border border-[#09090B] bg-white py-2 font-mono-tech text-[11px] font-bold text-[#09090B] uppercase hover:bg-[#09090B] hover:text-white cursor-pointer">
          MOVE TO BAG +
        </button>
      </div>
    `
      )
      .join('');
  }

  updateWishlistBadges();

  /* ==========================================================================
   * 6. HERO STAGE SWITCHER & DROP 01 COUNTDOWN CLOCK
   * ========================================================================== */
  const heroTabs = document.querySelectorAll('[data-hero-stage-btn]');
  const heroSlides = document.querySelectorAll('[data-hero-stage-slide]');

  heroTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetIndex = btn.getAttribute('data-hero-stage-btn');
      heroTabs.forEach((tab) => {
        const isCurrent = tab.getAttribute('data-hero-stage-btn') === targetIndex;
        tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        tab.className = isCurrent
          ? 'rounded-full border border-[#09090B] bg-white px-4 py-2 font-mono-tech text-xs font-bold tracking-wider text-[#09090B] uppercase shadow-sm cursor-pointer'
          : 'rounded-full border border-[#09090B]/20 bg-white/55 px-4 py-2 font-mono-tech text-xs font-medium tracking-wider text-[#3F3F46] uppercase hover:border-[#09090B] hover:text-[#09090B] cursor-pointer';
      });
      heroSlides.forEach((slide) => {
        const isCurrent = slide.getAttribute('data-hero-stage-slide') === targetIndex;
        slide.classList.toggle('hidden', !isCurrent);
      });
    });
  });

  // Ticking Drop Countdown Clock & Retro Footer Uptime
  let remainingSeconds = 14 * 3600 + 28 * 60 + 19;
  let uptimeSeconds = 172842;

  setInterval(() => {
    remainingSeconds = remainingSeconds > 0 ? remainingSeconds - 1 : 52099;
    uptimeSeconds += 1;

    const hrs = String(Math.floor(remainingSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');

    const hEl = document.getElementById('rwnd-countdown-h');
    const mEl = document.getElementById('rwnd-countdown-m');
    const sEl = document.getElementById('rwnd-countdown-s');
    if (hEl) hEl.textContent = `${hrs}H`;
    if (mEl) mEl.textContent = `${mins}M`;
    if (sEl) sEl.textContent = `${secs}S`;

    const upDays = Math.floor(uptimeSeconds / 86400);
    const upHrs = String(Math.floor((uptimeSeconds % 86400) / 3600)).padStart(2, '0');
    const upMins = String(Math.floor((uptimeSeconds % 3600) / 60)).padStart(2, '0');
    const upSecs = String(uptimeSeconds % 60).padStart(2, '0');
    const uptimeEl = document.getElementById('rwnd-retro-uptime');
    if (uptimeEl) {
      uptimeEl.textContent = `SYSTEM UPTIME: ${upDays}D ${upHrs}H ${upMins}M ${upSecs}S`;
    }
  }, 1000);

  /* ==========================================================================
   * 7. CLIENT-SIDE CATEGORY FILTER TABS, SEARCH & SORTING
   * ========================================================================== */
  let activeCategory = 'all';
  let searchQuery = '';
  let sortMode = 'featured';

  const productCards = Array.from(document.querySelectorAll('[data-product-card]'));
  const productGrid = document.getElementById('rwnd-product-grid');
  const categoryButtons = document.querySelectorAll('[data-fi
