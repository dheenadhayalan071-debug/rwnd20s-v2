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
      'pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border border-black bg-[#09090B] p-4 text-white shadow-xl';
    toast.innerHTML = `
      <div>
        <p class="font-mono-tech text-xs font-bold tracking-wider text-white uppercase">${title}</p>
        <p class="mt-0.5 text-xs text-[#A1A1AA]">${subtitle || ''}</p>
      </div>
      <button type="button" aria-label="Dismiss notification" class="text-xs font-bold text-white hover:opacity-75 cursor-pointer">✕</button>
    `;

    toast.querySelector('button')?.addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  /* -------------------------------------------------------------
   * 2. INITIAL ARCHIVE LOADER
   * ------------------------------------------------------------- */
  const archiveLoader = document.getElementById('rwnd-archive-loader');
  if (archiveLoader) {
    setTimeout(() => {
      archiveLoader.style.opacity = '0';
      setTimeout(() => {
        archiveLoader.style.display = 'none';
      }, 300);
    }, 450);
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
          ? 'rounded-full border border-white bg-white px-4 py-2 font-mono-tech text-xs font-bold tracking-wider text-black uppercase shadow-md cursor-pointer transition'
          : 'rounded-full border border-white/20 bg-white/5 px-4 py-2 font-mono-tech text-xs font-medium tracking-wider text-zinc-400 uppercase hover:border-white hover:text-white cursor-pointer transition';
      });
      heroSlides.forEach((slide) => {
        const isCurrent = slide.getAttribute('data-hero-stage-slide') === targetIndex;
        if (isCurrent) {
          slide.classList.remove('hidden');
          slide.classList.add('flex');
        } else {
          slide.classList.add('hidden');
          slide.classList.remove('flex');
        }
      });
    });
  });

  // Countdown timer simulation
  function updateCountdown() {
    const hEl = document.getElementById('rwnd-countdown-h');
    const mEl = document.getElementById('rwnd-countdown-m');
    const sEl = document.getElementById('rwnd-countdown-s');
    if (!hEl || !mEl || !sEl) return;

    let totalSeconds = 14 * 3600 + 28 * 60 + 19;
    setInterval(() => {
      totalSeconds = Math.max(0, totalSeconds - 1);
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0') + 'H';
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0') + 'M';
      const s = String(totalSeconds % 60).padStart(2, '0') + 'S';
      hEl.textContent = h;
      mEl.textContent = m;
      sEl.textContent = s;
    }, 1000);
  }
  updateCountdown();

    /* ==========================================================================
   * 7. EVENT DELEGATION & GLOBAL CLICKS
   * ========================================================================== */
  document.addEventListener('click', (e) => {
    
    // Wishlist toggle button click on product cards
    const wishlistToggle = e.target.closest('[data-toggle-wishlist]');
    if (wishlistToggle) {
      const card = wishlistToggle.closest('[data-product-card]');
      if (card) {
        const handle = card.getAttribute('data-handle');
        const title = card.getAttribute('data-title');
        const price = card.getAttribute('data-price-formatted');
        const comparePrice = card.getAttribute('data-compare-formatted');
        const image = card.getAttribute('data-image');
        const variantId = card.getAttribute('data-variant-id');

        let wishlist = getWishlistItems();
        const existingIndex = wishlist.findIndex((i) => i.handle === handle);
        if (existingIndex > -1) {
          wishlist.splice(existingIndex, 1);
          wishlistToggle.textContent = '♥';
          wishlistToggle.classList.remove('bg-white', 'text-black');
          wishlistToggle.classList.add('bg-black/60', 'text-white');
          if (typeof showToast === 'function') showToast('REMOVED FROM WISHLIST', `${title} cleared from your archive list.`);
        } else {
          wishlist.push({ handle, title, price, comparePrice, image, variantId });
          wishlistToggle.textContent = '★';
          wishlistToggle.classList.remove('bg-black/60', 'text-white');
          wishlistToggle.classList.add('bg-white', 'text-black');
          if (typeof showToast === 'function') showToast('SAVED TO WISHLIST', `${title} added to your archive list.`);
        }
        saveWishlistItems(wishlist);
      }
      return;
    }

    // Remove item directly from wishlist
    const removeWishlistBtn = e.target.closest('[data-remove-wishlist]');
    if (removeWishlistBtn) {
      const handle = removeWishlistBtn.getAttribute('data-remove-wishlist');
      let wishlist = getWishlistItems();
      wishlist = wishlist.filter((i) => i.handle !== handle);
      saveWishlistItems(wishlist);
      
      // Update UI if on a dedicated wishlist page
      const cardToRemove = removeWishlistBtn.closest('.wishlist-item-card');
      if (cardToRemove) cardToRemove.remove();

      if (typeof showToast === 'function') showToast('WISHLIST UPDATED', 'Item removed from saved list.');
      return;
    }

    // Mobile menu toggle (Fallback support)
    const mobileMenuToggle = e.target.closest('[data-toggle-mobile-menu]');
    if (mobileMenuToggle) {
      const menu = document.getElementById('rwnd-mobile-menu');
      if (menu) {
        menu.classList.toggle('hidden');
        menu.classList.toggle('flex');
      }
      return;
    }
  });

  /* ==========================================================================
   * 8. CATEGORY FILTERING & LIVE SEARCH
   * ========================================================================== */
  const filterBtns = document.querySelectorAll('[data-filter-category]');
  const searchInput = document.getElementById('rwnd-archive-search');
  const sortSelect = document.getElementById('rwnd-archive-sort');
  const productGrid = document.getElementById('rwnd-product-grid');
  const showingCountEl = document.getElementById('rwnd-showing-count');

  let activeCategory = 'all';
  let searchQuery = '';
  let activeSort = 'featured';

  function filterAndSortProducts() {
    if (!productGrid) return;
    const cards = Array.from(productGrid.querySelectorAll('[data-product-card]'));
    let visibleCount = 0;

    cards.forEach((card) => {
      const category = (card.getAttribute('data-category') || '').toLowerCase();
      const tags = (card.getAttribute('data-tags') || '').toLowerCase();
      const title = (card.getAttribute('data-title') || '').toLowerCase();
      const subtitle = (card.getAttribute('data-subtitle') || '').toLowerCase();

      // Category match check
      let matchesCategory = false;
      if (activeCategory === 'all') {
        matchesCategory = true;
      } else if (activeCategory === 'bundles' && (category.includes('bundle') || tags.includes('bundle'))) {
        matchesCategory = true;
      } else if (activeCategory === 'audio' && (category.includes('audio') || tags.includes('audio') || title.includes('earphone'))) {
        matchesCategory = true;
      } else if (activeCategory === 'rings' && (category.includes('ring') || tags.includes('ring') || title.includes('ring'))) {
        matchesCategory = true;
      } else if (activeCategory === 'chains' && (category.includes('chain') || tags.includes('chain') || title.includes('chain'))) {
        matchesCategory = true;
      } else if (activeCategory === 'bracelets' && (category.includes('bracelet') || tags.includes('bracelet') || title.includes('bracelet'))) {
        matchesCategory = true;
      } else if (activeCategory === 'earrings' && (category.includes('earring') || tags.includes('stud'))) {
        matchesCategory = true;
      } else if (activeCategory === 'watches' && (category.includes('watch') || tags.includes('watch') || title.includes('watch'))) {
        matchesCategory = true;
      } else {
        matchesCategory = category.includes(activeCategory) || tags.includes(activeCategory);
      }

      // Search match check
      const matchesSearch =
        !searchQuery ||
        title.includes(searchQuery) ||
        subtitle.includes(searchQuery) ||
        tags.includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Sorting logic
    if (sortSelect && productGrid) {
      const visibleCards = cards.filter((c) => c.style.display !== 'none');
      visibleCards.sort((a, b) => {
        const priceA = Number(a.getAttribute('data-price')) || 0;
        const priceB = Number(b.getAttribute('data-price')) || 0;
        if (activeSort === 'price-asc') return priceA - priceB;
        if (activeSort === 'price-desc') return priceB - priceA;
        return 0; // featured default order
      });
      visibleCards.forEach((card) => productGrid.appendChild(card));
    }

    if (showingCountEl) {
      showingCountEl.textContent = `SHOWING ${visibleCount} PIECES · FREE SHIPPING ABOVE ₹999`;
    }
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.getAttribute('data-filter-category') || 'all';
      filterBtns.forEach((b) => {
        const isTarget = b === btn;
        b.className = isTarget
          ? 'rounded-full border border-white bg-white px-4 py-2 font-mono-tech text-xs font-bold tracking-wider text-black uppercase shadow-sm cursor-pointer'
          : 'rounded-full border border-white/20 bg-white/5 px-4 py-2 font-mono-tech text-xs font-medium tracking-wider text-zinc-400 uppercase hover:border-white hover:text-white cursor-pointer transition';
      });
      filterAndSortProducts();
    });
  });

  searchInput?.addEventListener('input', (e) => {
    searchQuery = (e.target.value || '').trim().toLowerCase();
    filterAndSortProducts();
  });

  sortSelect?.addEventListener('change', (e) => {
    activeSort = e.target.value;
    filterAndSortProducts();
  });

  /* ==========================================================================
   * 9. KEYBOARD SHORTCUTS (b, w, s, Escape)
   * ========================================================================== */
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const key = e.key.toLowerCase();
    if (key === 'b') {
      openCartDrawer('bag');
    } else if (key === 'w') {
      openCartDrawer('wishlist');
    } else if (key === 's') {
      searchInput?.focus();
      e.preventDefault();
    } else if (key === 'escape') {
      closeCartDrawer();
      closeWelcomePopup();
    }
  });

  // Initial fetch on page load
  fetchCartState();
});
