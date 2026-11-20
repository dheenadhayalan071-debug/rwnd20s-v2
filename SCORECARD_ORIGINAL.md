# RWND20s V2 — Original 13-Category Scorecard (Pre-Fix)

**Date:** 2026-11-20  
**Branch:** main  
**Commit:** e4e8e5e  
**Overall Score: 6.2/10**

---

## Scoring Methodology

Each category scored 1–10:
- **1-3**: Critical failure — blocks conversion or breaks brand
- **4-6**: Significant gaps — degrades UX, misses brand standard
- **7-8**: Solid — minor polish needed
- **9-10**: Exceptional — best-in-class, conversion-optimized

---

## 1. Visual Identity & Brand Execution

**Score: 7/10**

**Weakness:** 
- Strong brand system in `theme.css` (colors, fonts, tokens, ambient backgrounds)
- Hero, product pages, cart, collection, 404, night-calls all execute dark/nocturnal identity well
- **BUT:** Blog, article, gift card pages use light theme (`bg-[#DCDFE5]`, white cards) — jarring brand break
- Search page uses `#C8102E` red instead of brand `#FF0033`
- Two conflicting intro flows (Gothic Hero + Gateway) dilute "first impression" brand moment

**Impact:** 
- High — content pages (blog/article) are trust-building surfaces; light theme reads as "generic Shopify"
- Search color inconsistency breaks visual coherence
- Dual intro = confused brand narrative

**Recommended Improvement:**
1. Refactor `main-blog.liquid`, `main-article.liquid`, `main-gift-card.liquid` to dark theme using `--surface-*`, `--text-*`, `--accent-red` tokens
2. Fix `main-search.liquid` accent color to `#FF0033`
3. Consolidate intro to single Gateway flow

**Priority:** P0 (Critical)

---

## 2. UI Consistency & Design System

**Score: 6/10**

**Weakness:**
- Excellent CSS custom property system in `theme.css` (1,254 lines of tokens)
- Consistent spacing, typography, border radius (0px), hairline borders across most components
- **BUT:** Inline `<style>` block in `main-product.liquid` (PDP-specific classes) — breaks "all styles in CSS" rule
- `rwnd-home-hero.css` separate file — fragments design system
- Light-themed pages use completely different token set (white bg, emerald accent, rounded-3xl)
- Form controls: mixed styling (some Tailwind, some custom CSS)

**Impact:**
- Medium — maintenance burden; inconsistency creeps in
- PDP inline styles hard to override; FOUC risk if CSS loads late
- Separate hero CSS = extra request

**Recommended Improvement:**
1. Move PDP inline styles to `theme.css` under `.rwnd-pdp-*` namespace
2. Merge `rwnd-home-hero.css` into `theme.css`
3. Extend dark tokens to cover blog/article/gift-card
4. Standardize form control classes (`.rwnd-input`, `.rwnd-select`, `.rwnd-btn`)

**Priority:** P1 (High)

---

## 3. UX & Navigation

**Score: 6/10**

**Weakness:**
- Sticky header with mega menu — good desktop navigation
- Mobile drawer + full-screen search overlay — solid patterns
- Breadcrumbs on all pages
- **BUT:** 
  - Mega menu "DROP 01 HERO" card links to `/collections/drop-01` but no such collection guaranteed
  - MANIFESTO link points to `/#about` (anchor) but no `#about` section exists on homepage
  - Collection filter tags hardcoded — breaks if tags change
  - Search overlay: no focus trap (accessibility)
  - Mobile drawer: no focus trap
  - Cart drawer: no focus trap

**Impact:**
- Medium-High — broken links confuse users; hardcoded filters brittle; focus traps are WCAG failures

**Recommended Improvement:**
1. Verify all header nav links resolve to real routes/pages
2. Make collection filters dynamic (derive from collection tags) or configurable
3. Add focus traps to search overlay, mobile drawer, cart drawer
4. Fix MANIFESTO link to point to real page (e.g., `/pages/manifesto`)

**Priority:** P1 (High)

---

## 4. Mobile Responsiveness

**Score: 7/10**

**Weakness:**
- Breakpoints at 639px, 640px, 1024px in `theme.css` — good coverage
- Mobile-first grid layouts (2/3/4 cols)
- Sticky mobile conversion bar on PDP (z-[110])
- Cart drawer full-width on mobile (sm:w-[420px])
- **BUT:**
  - Sticky filter bar `top-[64px] sm:top-[72px]` assumes fixed header height — may misalign if header changes
  - PDP media gallery thumbnails: horizontal scroll on mobile but no scroll indicator
  - Dispatch protocol selector: radio labels tight on small screens
  - Welcome popup: 2000ms delay may feel slow on mobile

**Impact:**
- Medium — mostly solid but edge cases degrade experience

**Recommended Improvement:**
1. Use CSS `env(safe-area-inset-top)` for sticky positioning
2. Add scroll shadows/indicators to PDP thumbnail strip
3. Test dispatch selector at 375px; consider stacked layout
4. Reduce welcome popup delay to 1000ms on mobile

**Priority:** P2 (Medium)

---

## 5. Product Discovery

**Score: 6/10**

**Weakness:**
- Collection page: good grid, tag filters, sort dropdown, quick search, AJAX load more
- Search page: good results grid, taxonomy badges, pagination
- Homepage: category selection grid (4 tiles), featured spotlight, product grid (8 products)
- **BUT:**
  - Spotlight product hardcoded to `'cyber-set'` handle — breaks if handle changes
  - Category grid URLs depend on section settings (collection handles) — no fallbacks shown
  - QUICK ADD on collection/search uses full form submit (page reload) — not AJAX
  - No "recently viewed" or "recommended for you" personalization
  - Load more on collection respects filters but search has no load more (only pagination)

**Impact:**
- High — QUICK ADD page reload breaks browse flow; hardcoded spotlight fragile

**Recommended Improvement:**
1. Wire QUICK ADD forms to `cart.js.addToCart()` AJAX handler
2. Make spotlight product configurable via section setting or product metafield
3. Add load more to search results
4. Validate category grid collection handles exist; show fallback

**Priority:** P0/P1 (Critical/High)

---

## 6. Product Pages (PDP)

**Score: 8/10**

**Weakness:**
- Excellent: variant detection (watch/earphone/bundle), media gallery with thumbnails, buy box with live price, inventory ticker, loadout manifest for bundles, variant chips, quantity selector, trust grid, accordions, Complete the Look, reviews terminal with modal, sticky mobile bar
- **BUT:**
  - Inline `<style>` block (PDP-specific) — should be in `theme.css`
  - Review submission posts to `/contact` — not a true review endpoint; relies on manual moderation
  - No video support in media gallery (only images)
  - Variant chips: no keyboard navigation between options
  - `switchRwndProductImage`, `adjustRwndQty`, `updateVariantUI`, `selectRwndVariant` defined inline — should be in `theme.js` or `cart.js`

**Impact:**
- Low-Medium — PDP is strongest page; issues are maintainability/polish

**Recommended Improvement:**
1. Move inline styles to `theme.css`
2. Move inline JS functions to `theme.js` or `cart.js`
3. Add keyboard navigation for variant chips
4. Consider video support in gallery

**Priority:** P2 (Medium)

---

## 7. Cart Experience

**Score: 4/10** ⚠️ **CRITICAL**

**Weakness:**
- **Cart Drawer:** Server-rendered fallback, free delivery progress bar, dispatch protocol selector, item qty controls, checkout link, trust badges — GOOD STRUCTURE
- **Main Cart:** Server-rendered, promo code input, dispatch selector, COD charge row, trust row — GOOD STRUCTURE
- **BOTH CRITICALLY BROKEN:** 
  - Founder Delivery ₹499 fee NOT visible in shipping line until checkout
  - Estimated total (`cart.total_price`) excludes ₹499 when Founder mode selected
  - `updateShippingDisplay()` only fetches rates for Standard Courier; Founder mode hardcoded to "RATE AT CHECKOUT"
  - Free delivery progress bar uses `cart.total_price` (excludes shipping) — should use subtotal
  - Switching dispatch modes doesn't update estimated total reactively
  - No loading state when fetching shipping rates

**Impact:**
- **Critical** — Conversion blocker. Customers see wrong total, get sticker shock at checkout, abandon cart.

**Recommended Improvement:**
1. In `cart.js` `updateShippingDisplay()`: detect active Founder mode + valid PIN → set shipping = ₹499 immediately
2. Recalculate estimated total = `cart.items_subtotal_price + shipping` (not `cart.total_price`)
3. Update both drawer (`drawer-shipping-val`, `drawer-total-val`) and main cart (`rwnd-cart-shipping-msg`, `rwnd-main-cart-total`)
4. Free delivery bar: progress = `subtotal / 99900` (current correct) but estimated total display must include shipping
5. Add loading state during `/cart/shipping_rates.json` fetch

**Priority:** P0 (Critical — Do First)

---

## 8. Checkout Experience

**Score: 7/10**

**Weakness:**
- Shopify native checkout — not customizable (correct)
- Cart attributes pass dispatch data correctly: `Dispatch Mode`, `Dispatch Fee`, `Madurai Delivery PIN`
- `syncDispatchAttributes()` validates Founder PIN before checkout redirect
- `goToCheckout()` waits for attribute write then navigates
- **BUT:**
  - No validation that Shopify Admin shipping rates actually match (₹499 for Madurai zone)
  - If admin rates misconfigured, customer pays wrong amount
  - COD fee shown in cart but not validated against Shopify checkout config
  - Instant checkout buttons bypass drawer but work correctly (add via AJAX then redirect)

**Impact:**
- Medium — relies on correct Shopify Admin config; theme can't enforce

**Recommended Improvement:**
1. Document exact Shopify Admin shipping config required (Madurai zone 625001-625020, ₹499 rate)
2. Add admin config checklist to deployment docs
3. Consider pre-checkout validation: fetch `/cart/shipping_rates.json` with test address to verify ₹499 rate exists

**Priority:** P1 (High — requires admin config approval)

---

## 9. Copywriting & Brand Voice

**Score: 8/10**

**Weakness:**
- `locales/en.default.json` comprehensive: all RWND20s terminology (Dispatch Protocol, Founder Delivery, Madurai PIN, Standard Courier, 24H MDU)
- Zero generic Shopify copy — fully branded
- Consistent uppercase/terminal voice
- Toast messages, cart copy, product states all on-brand
- **BUT:**
  - Three newsletter forms with different tag strategies — copy inconsistent (RWND10 only mentioned in welcome popup)
  - "RATE AT CHECKOUT / FREE" vs "MDU · RATE AT CHECKOUT" — slightly inconsistent phrasing
  - Search page uses "RWND20S.SYS // QUERY ENGINE" — good but different from "DROP 01 // ARCHIVE COLLECTION"

**Impact:**
- Low — copy is strong; minor inconsistencies only

**Recommended Improvement:**
1. Standardize newsletter signup copy/tags across all three forms
2. Unify dispatch fee phrasing
3. Consider centralizing copy constants in a snippet

**Priority:** P2 (Medium)

---

## 10. Animations & Interactions

**Score: 6/10**

**Weakness:**
- CSS-only ambient background layers (`rwnd-ambient-bg`, `rwnd-ambient-glow`) — performant
- Gateway background (`rwnd-gateway-bg`) with layered animations
- Gothic cinematic hero with radial/moon/road layers — heavy but CSS-only
- Hero slide transitions in `rwnd-home-hero.css` (220ms ease)
- `prefers-reduced-motion` handled at line 313 of `theme.css` — disables transitions
- **BUT:**
  - Two intro flows both animate on load — performance cost
  - No micro-interactions on buttons (hover/tap feedback minimal)
  - Cart drawer slide-in: 300ms transform — good
  - Toast: 4200ms auto-dismiss — no progress indicator
  - PDP thumbnail switch: no transition
  - Load more button: text change only, no spinner
  - No page transition animations (instant navigation)

**Impact:**
- Medium — brand expects "cinematic" feel; current animations are background-only, no UI micro-motion

**Recommended Improvement:**
1. Consolidate to single intro flow (reduce animation load)
2. Add button micro-interactions (scale/tap, ripple)
3. Add PDP image cross-fade on thumbnail click
4. Add spinner to load more button
5. Consider view transitions API for page navigation (progressive enhancement)

**Priority:** P2 (Medium)

---

## 11. Performance

**Score: 6/10**

**Weakness:**
- Tailwind CDN + inline config in `<head>` — blocks render
- Two ambient background layers with CSS animations — paint cost
- `rwnd-home-hero.css` separate request
- Intro Gateway video loads even if not played (no lazy load)
- `all_products['cyber-set']` lookup on every homepage load
- `shop.metaobjects.rwnd_review.values` iterates all reviews on homepage
- No critical CSS inlining
- Images: lazy loading present but no `fetchpriority` on hero
- No resource hints beyond Google Fonts preconnect

**Impact:**
- Medium — LCP likely impacted by Tailwind CDN + background animations

**Recommended Improvement:**
1. Self-host Tailwind (build step) or move to async load with fallback
2. Lazy-load intro video source
3. Merge `rwnd-home-hero.css` into `theme.css`
4. Add `fetchpriority="high"` to hero image
5. Consider limiting homepage review iteration (max 6 already in section)
6. Add `preload` for critical fonts

**Priority:** P2/P3 (Medium/Low)

---

## 12. Accessibility

**Score: 5/10** ⚠️ **NEEDS WORK**

**Weakness:**
- ✅ Skip-to-content link on every page
- ✅ `focus-visible` styles in `theme.css`
- ✅ `prefers-reduced-motion` respected
- ✅ `aria-live` toasts via JS
- ✅ Keyboard drawer close (Escape)
- ✅ Semantic HTML (nav, main, section, article)
- ✅ Alt text on product images
- ❌ **Search overlay:** No focus trap — Tab cycles out of modal
- ❌ **Mobile drawer:** No focus trap
- ❌ **Cart drawer:** No focus trap
- ❌ **Toast container:** No `aria-live` in HTML (only JS adds)
- ❌ **PDP gallery thumbnails:** No keyboard navigation (click only)
- ❌ **Variant chips:** Radio inputs but no `fieldset`/`legend` grouping
- ❌ **Color contrast:** `#FF0033` on `#0A0A0A` — need to verify 4.5:1
- ❌ **Announcement bar:** Not announced to screen readers (no `aria-live`)
- ❌ **Load more button:** No `aria-busy` during fetch

**Impact:**
- High — WCAG 2.1 AA failures on critical interactive components

**Recommended Improvement:**
1. Add focus trap utility to `theme.js`; apply to search overlay, mobile drawer, cart drawer
2. Add `aria-live="polite"` to `#rwnd-toast-container` in HTML
3. Add keyboard navigation to PDP thumbnail strip (Arrow keys)
4. Wrap variant chips in `<fieldset><legend>Select variant</legend>`
5. Verify color contrast; adjust red if needed
6. Add `aria-live` to announcement bar
7. Add `aria-busy` to load more button during fetch

**Priority:** P1 (High)

---

## 13. Conversion Optimization

**Score: 5/10** ⚠️ **NEEDS WORK**

**Weakness:**
- ✅ Cart drawer (low-friction add-to-cart)
- ✅ Free delivery progress bar (₹999 threshold) — psychological trigger
- ✅ Dispatch protocol selector (Founder Delivery as premium option)
- ✅ Sticky mobile conversion bar on PDP
- ✅ Trust badges in cart (SECURE, COD AVAIL, 24H MDU)
- ✅ Instant checkout buttons (bypass cart)
- ✅ Welcome popup with RWND10 incentive
- ✅ Email capture on homepage (Grid Notifier)
- ✅ Social proof wall (metaobject reviews)
- ❌ **Shipping fee invisible until checkout** — #1 conversion killer
- ❌ QUICK ADD causes page reload — breaks momentum
- ❌ No loading states — uncertainty
- ❌ No exit-intent or cart recovery
- ❌ No urgency/scarcity on product pages (stock ticker only)
- ❌ No upsell/cross-sell in cart (Complete the Look only on PDP)
- ❌ Welcome popup shows every session (sessionStorage gate)
- ❌ Dual intro flows delay access to products

**Impact:**
- Critical — multiple friction points directly reduce conversion rate

**Recommended Improvement:**
1. **P0:** Fix shipping fee visibility (see Cart Experience)
2. **P0:** AJAX QUICK ADD on collection/search
3. **P1:** Loading states on all cart actions
4. **P1:** Welcome popup gating — use localStorage for "seen" flag
5. **P1:** Consolidate intro to single flow
6. **P2:** Add "Only X left" urgency when inventory low
7. **P2:** Cart upsell: "Complete the Look" in drawer
8. **P2:** Exit-intent email capture

**Priority:** P0/P1 (Critical/High)

---

## Summary: Original Scores

| Category | Score | Priority |
|----------|-------|----------|
| 1. Visual Identity | 7/10 | P0 |
| 2. UI Consistency | 6/10 | P1 |
| 3. UX & Navigation | 6/10 | P1 |
| 4. Mobile Responsiveness | 7/10 | P2 |
| 5. Product Discovery | 6/10 | P0/P1 |
| 6. Product Pages | 8/10 | P2 |
| 7. Cart Experience | **4/10** | **P0** |
| 8. Checkout Experience | 7/10 | P1 |
| 9. Copywriting | 8/10 | P2 |
| 10. Animations | 6/10 | P2 |
| 11. Performance | 6/10 | P2/P3 |
| 12. Accessibility | **5/10** | **P1** |
| 13. Conversion Optimization | **5/10** | **P0/P1** |

**Overall: 6.2/10**

**Target: 10/10** — Requires fixing 3 critical (Cart, Visual Identity on content pages, Product Discovery QUICK ADD), 3 high (Accessibility, UX/Navigation, Checkout admin config), and multiple medium items.

---

*End of Original Scorecard*