/**
 * rwnd20s — Shopify storefront interactions.
 * Cart additions stay on the current page; cart navigation uses the dedicated /cart page.
 */
document.addEventListener('DOMContentLoaded', () => {
  const WISHLIST_STORAGE_KEY = 'rwnd20s_wishlist_v1';
  const WELCOME_OFFER_STORAGE_KEY = 'rwnd20s_welcome_offer_v1';

  function showToast(title, subtitle = '') {
    const container = document.getElementById('rwnd-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border border-red-900/60 bg-[#09090B] p-4 text-white shadow-xl';
    const copy = document.createElement('div');
    const heading = document.createElement('p');
    heading.className = 'font-mono-tech text-xs font-bold tracking-wider uppercase';
    heading.textContent = title;
    const detail = document.createElement('p');
    detail.className = 'mt-0.5 text-xs text-zinc-400';
    detail.textContent = subtitle;
    copy.append(heading, detail);
    toast.append(copy);
    container.append(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  async function refreshCartBadges() {
    try {
      const response = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const cart = await response.json();
      document.querySelectorAll('[data-cart-count]').forEach((el) => {
        el.textContent = String(cart.item_count);
      });
    } catch (error) {
      console.error('Cart refresh failed:', error);
    }
  }
  window.fetchCartState = refreshCartBadges;

  // Handle normal and keyboard-submitted product forms without navigating away or opening a drawer.
  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('form[action*="/cart/add"]');
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();

    const button = form.querySelector('button[name="add"], button[type="submit"], input[type="submit"]');
    if (!button || button.dataset.cartSubmitting === 'true') return;
    const originalContent = button.tagName === 'INPUT' ? button.value : button.innerHTML;
    const originalClasses = button.className;
    
    const setContent = (content) => {
      if (button.tagName === 'INPUT') button.value = content;
      else button.innerHTML = content;
    };
    
    button.dataset.cartSubmitting = 'true';
    button.style.pointerEvents = 'none';
    setContent('<span class="animate-pulse tracking-widest text-white">[ AUTHORIZING... ]</span>');

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.description || 'Could not add item to your bag.');
      }
      const addedItem = await response.json();
      
      // Update Button state to Red/Archive Added
      button.className = "w-full rounded-full border border-red-900 bg-red-600 py-3.5 font-mono-tech text-xs font-bold text-white uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.6)]";
      setContent('<span class="font-bold tracking-widest text-white">✦ ARCHIVE ADDED</span>');
      
      // We removed the showToast notification here per your request to have zero popups.
      
      await refreshCartBadges();
      if (typeof window.fetchMainCartData === 'function') window.fetchMainCartData();
    } catch (error) {
      setContent('<span class="text-red-500">FAILED</span>');
      // showToast('DISPATCH FAILED', error.message);
    } finally {
      setTimeout(() => {
        setContent(originalContent);
        button.className = originalClasses;
        button.style.pointerEvents = '';
        delete button.dataset.cartSubmitting;
      }, 2500);
    }
  }, true);

  // Welcome offer popup.
  const welcomePopup = document.getElementById('rwnd-welcome-popup');
  const welcomeForm = document.getElementById('rwnd-welcome-form');
  const welcomeHeaderTrigger = document.getElementById('rwnd-open-welcome-popup');
  const welcomeUnlocked = document.getElementById('rwnd-welcome-unlocked');
  const welcomeEmailDisplay = document.getElementById('rwnd-welcome-email-display');
  const welcomeError = document.getElementById('welcome-offer-error');

  function savedOffer() {
    try { return JSON.parse(localStorage.getItem(WELCOME_OFFER_STORAGE_KEY) || 'null'); }
    catch { return null; }
  }
  function syncOffer() {
    const offer = savedOffer();
    if (!offer?.email) return;
    welcomeForm?.classList.add('hidden');
    welcomeUnlocked?.classList.remove('hidden');
    if (welcomeEmailDisplay) welcomeEmailDisplay.textContent = offer.email;
    if (welcomeHeaderTrigger) welcomeHeaderTrigger.textContent = '5% + 10% PASS ACTIVE';
  }
  function openWelcomePopup() {
    if (!welcomePopup) return;
    syncOffer();
    welcomePopup.classList.remove('hidden');
    welcomePopup.classList.add('flex');
  }
  function closeWelcomePopup() {
    welcomePopup?.classList.add('hidden');
    welcomePopup?.classList.remove('flex');
  }
  if (welcomePopup) {
    if (!savedOffer()) openWelcomePopup();
    else syncOffer();
  }
  welcomeHeaderTrigger?.addEventListener('click', openWelcomePopup);
  document.querySelectorAll('[data-close-welcome]').forEach((button) => button.addEventListener('click', closeWelcomePopup));
  welcomeForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = (document.getElementById('welcome-offer-email')?.value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if (welcomeError) {
        welcomeError.textContent = 'Please enter a valid email address.';
        welcomeError.classList.remove('hidden');
      }
      return;
    }
    welcomeError?.classList.add('hidden');
    try { localStorage.setItem(WELCOME_OFFER_STORAGE_KEY, JSON.stringify({ email, instantCode: 'RWND5NOW', nextOrderCode: 'RWND10NEXT' })); } catch {}
    syncOffer();
    showToast('ARCHIVE PASS UNLOCKED', `Your offers are ready for ${email}.`);
  });

  // Wishlist persistence and product-card toggles.
  function wishlistItems() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveWishlist(items) {
    try { localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items)); } catch {}
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => { el.textContent = String(items.length); });
  }
  saveWishlist(wishlistItems());
  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle-wishlist]');
    if (toggle) {
      const card = toggle.closest('[data-product-card]');
      if (!card) return;
      const handle = card.getAttribute('data-handle');
      const items = wishlistItems();
      const existing = items.findIndex((item) => item.handle === handle);
      if (existing >= 0) {
        items.splice(existing, 1);
        toggle.textContent = '♥';
        showToast('REMOVED FROM WISHLIST', 'Item removed from your archive list.');
      } else {
        items.push({
          handle,
          title: card.getAttribute('data-title'),
          price: card.getAttribute('data-price-formatted'),
          comparePrice: card.getAttribute('data-compare-formatted'),
          image: card.getAttribute('data-image'),
          variantId: card.getAttribute('data-variant-id')
        });
        toggle.textContent = '★';
        showToast('SAVED TO WISHLIST', 'Item added to your archive list.');
      }
      saveWishlist(items);
      return;
    }

    const removeWishlist = event.target.closest('[data-remove-wishlist]');
    if (removeWishlist) {
      const handle = removeWishlist.getAttribute('data-remove-wishlist');
      saveWishlist(wishlistItems().filter((item) => item.handle !== handle));
      removeWishlist.closest('.wishlist-item-card')?.remove();
      showToast('WISHLIST UPDATED', 'Item removed from saved list.');
      return;
    }

    const menuToggle = event.target.closest('[data-toggle-mobile-menu]');
    if (menuToggle) {
      const menu = document.getElementById('rwnd-mobile-menu');
      if (menu) {
        const willOpen = menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !willOpen);
        menu.classList.toggle('flex', willOpen);
        document.body.style.overflow = willOpen ? 'hidden' : '';
      }
    }
  });

  // Archive product filtering and sorting.
  const filterButtons = document.querySelectorAll('[data-filter-category]');
  const searchInput = document.getElementById('rwnd-archive-search');
  const sortSelect = document.getElementById('rwnd-archive-sort');
  const productGrid = document.getElementById('rwnd-product-grid');
  const count = document.getElementById('rwnd-showing-count');
  let category = 'all';
  let query = '';
  let sort = 'featured';
  function filterProducts() {
    if (!productGrid) return;
    const cards = [...productGrid.querySelectorAll('[data-product-card]')];
    let visible = 0;
    cards.forEach((card) => {
      const haystack = ['data-category', 'data-tags', 'data-title', 'data-subtitle']
        .map((key) => (card.getAttribute(key) || '').toLowerCase());
      const categoryMatch = category === 'all' || haystack.some((text) => text.includes(category));
      const searchMatch = !query || haystack.some((text) => text.includes(query));
      card.style.display = categoryMatch && searchMatch ? '' : 'none';
      if (categoryMatch && searchMatch) visible++;
    });
    const shown = cards.filter((card) => card.style.display !== 'none');
    shown.sort((a, b) => {
      const priceA = Number(a.getAttribute('data-price')) || 0;
      const priceB = Number(b.getAttribute('data-price')) || 0;
      return sort === 'price-asc' ? priceA - priceB : sort === 'price-desc' ? priceB - priceA : 0;
    }).forEach((card) => productGrid.appendChild(card));
    if (count) count.textContent = `SHOWING ${visible} PIECES · FREE SHIPPING ABOVE ₹999`;
  }
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    category = button.getAttribute('data-filter-category') || 'all';
    filterProducts();
  }));
  searchInput?.addEventListener('input', (event) => { query = event.target.value.trim().toLowerCase(); filterProducts(); });
  sortSelect?.addEventListener('change', (event) => { sort = event.target.value; filterProducts(); });

  // Countdown display.
  const hours = document.getElementById('rwnd-countdown-h');
  const minutes = document.getElementById('rwnd-countdown-m');
  const seconds = document.getElementById('rwnd-countdown-s');
  if (hours && minutes && seconds) {
    let remaining = 14 * 3600 + 28 * 60 + 19;
    setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      hours.textContent = `${String(Math.floor(remaining / 3600)).padStart(2, '0')}H`;
      minutes.textContent = `${String(Math.floor((remaining % 3600) / 60)).padStart(2, '0')}M`;
      seconds.textContent = `${String(remaining % 60).padStart(2, '0')}S`;
    }, 1000);
  }
  refreshCartBadges();
});
  
