# RWND20s V2 — Complete Storefront Audit Report

**Date:** 2026-11-20  
**Branch:** main  
**Commit:** e4e8e5e (feat(storefront): improve RWND20s shopping experience)  
**Auditor:** Senior Shopify Liquid Architect / UI/UX Designer / Frontend Performance Engineer / CRO Specialist

---

## Executive Summary

The RWND20s V2 theme is a **structurally sound, well-architected Online Store 2.0 theme** with strong brand identity execution. The codebase demonstrates senior-level Shopify engineering: clean separation of concerns, progressive enhancement, proper delegation of pricing/shipping to Shopify checkout, and a cohesive design system in `assets/theme.css`.

**However, critical conversion-blocking issues exist** — primarily around the Founder Delivery ₹499 fee visibility, duplicate/conflicting intro flows, orphaned components, and visual inconsistency on content pages (blog, article, gift card). The theme scores **6.2/10** overall and requires targeted fixes to reach the 10/10 target.

---

## Repository Architecture Overview

### Technology Stack
- **Shopify Online Store 2.0**: JSON templates, sections, snippets, config
- **Tailwind CSS** (CDN with custom brand config in `layout/theme.liquid`)
- **CSS Custom Properties** design system in `assets/theme.css` (1,254 lines)
- **Vanilla JS modules**: `assets/cart.js` (671 lines), `assets/theme.js` (33 lines)
- **Shopify Cart AJAX API**: `/cart.js`, `/cart/add.js`, `/cart/change.js`, `/cart/update.js`, `/cart/shipping_rates.json`
- **Metaobjects** for reviews (`rwnd_review`), product metafields for review linking
- **Cart attributes** as dispatch-mode data carrier (`Dispatch Mode`, `Dispatch Fee`, `Madurai Delivery PIN`)

### File Inventory (Inspected: 42 files)

| Category | Files | Status |
|----------|-------|--------|
| Layout | `layout/theme.liquid` | ✅ Inspected |
| Templates (JSON) | `index.json`, `product.json`, `collection.json`, `cart.json`, `list-collections.json`, `blog.json`, `article.json`, `page.json` | ✅ Inspected |
| Templates (Liquid) | `404.liquid`, `search.liquid`, `gift_card.liquid`, `page.night-calls.liquid` | ✅ Inspected |
| Sections | `main-storefront`, `main-product`, `main-collection`, `main-search`, `main-cart`, `main-page`, `main-article`, `main-blog`, `main-list-collections`, `main-gift-card`, `main-404`, `main-home`, `header`, `footer`, `gothic-cinematic-hero`, `gothic-hero-banner`, `intro-gateway` | ✅ Inspected |
| Snippets | `cart-drawer`, `dispatch-protocol-selector`, `welcome-popup`, `whatsapp-floating`, `size-guide-modal` | ✅ Inspected |
| Assets | `theme.css`, `theme.js`, `cart.js`, `rwnd-home-hero.css` | ✅ Inspected |
| Config | `settings_schema.json`, `settings_data.json` | ✅ Inspected |
| Locales | `en.default.json` | ✅ Inspected |
| Docs | `README.md`, `DEPLOYMENT_READINESS_REPORT.md` | ✅ Inspected |

---

## Critical Findings (Blocking Conversion)

### 1. 🔴 CRITICAL: Founder Delivery ₹499 Fee Not Properly Visible in Cart

**Location:** `snippets/cart-drawer.liquid` (lines 136-138), `sections/main-cart.liquid` (line 168), `assets/cart.js` (`updateShippingDisplay`)

**Root Cause:** The cart drawer and main cart display `cart.total_price` as the "TOTAL" but the shipping line (`SHIPPING / FEES:`) shows empty/placeholder until `updateShippingDisplay()` resolves. The ₹499 Founder Delivery fee is only written as a cart attribute at checkout time (`syncDispatchAttributes()`), not reflected in the pre-checkout estimated total.

**Impact:** 
- Customers see ₹0 or "—" for shipping in drawer/cart
- Estimated total excludes the ₹499 fee → sticker shock at checkout
- Violates "displayed estimated total must include it" requirement
- Free delivery threshold (₹999) progress bar doesn't account for the fee

**Evidence from `cart.js`:**
```javascript
// Line ~480: updateShippingDisplay() fetches /cart/shipping_rates.json for Standard Courier
// but Founder Delivery fee (₹499) is ONLY set in syncDispatchAttributes() at checkout time
// Line ~600: syncDispatchAttributes() writes attributes but doesn't update UI totals
```

**Required Fix:** 
1. `updateShippingDisplay()` must detect active Founder Delivery mode + valid PIN → inject ₹499 into shipping display immediately
2. Estimated total (`drawer-total-val`, `rwnd-main-cart-total`) must recalculate = subtotal + ₹499 (when Founder mode active)
3. Free delivery progress bar: threshold check should be `subtotal >= 99900` (current) but estimated total display should show `subtotal + shipping`

---

### 2. 🔴 CRITICAL: Duplicate/Conflicting Intro Flows

**Location:** `sections/gothic-cinematic-hero.liquid` + `sections/intro-gateway.liquid`

**Finding:** Two separate cinematic intro mechanisms exist, both gating on `sessionStorage` and both triggering `window.showRwndWelcomeModal()` on dismiss.

| Flow | Session Key | Trigger | Dismiss Action |
|------|-------------|---------|----------------|
| Gothic Cinematic Hero | `rwnd_cinematic_played` | Auto-plays on load | Sets flag, calls `showRwndWelcomeModal()` |
| Intro Gateway | `rwnd_intro_seen` | Video splash on click | Sets flag, calls `showRwndWelcomeModal()` |

**Impact:**
- Race condition: both may fire, showing welcome popup twice
- User sees two different "intro" experiences unpredictably
- `sessionStorage` keys differ → no cross-gating
- Wasted performance: both load heavy assets (video, background layers)

**Required Fix:** Consolidate into single intro flow. Keep Gateway (more interactive, video-based) as primary; remove Gothic Cinematic Hero or make it a background-only ambient layer without modal gating.

---

### 3. 🔴 CRITICAL: Orphaned `main-home` Section (Unused Hero)

**Location:** `sections/main-home.liquid` (305 lines) vs `templates/index.json`

**Finding:** `main-home.liquid` implements a sophisticated 3-tab hero switcher (Cyber Set / Chrome Audio / Timepiece) with `all_products` and `collections` lookups. But `templates/index.json` uses `main-storefront` as the homepage section.

**Impact:**
- 305 lines of polished hero code completely unused
- `main-storefront` hero is simpler (single static hero + category grid)
- Brand's flagship 3-product hero experience not live
- Wasted development effort; confusion in codebase

**Required Fix:** Either:
- **Option A:** Replace `main-storefront` with `main-home` in `index.json` (preferred — restores intended hero)
- **Option B:** Merge best of both: use `main-home` tabbed hero as the hero section within `main-storefront`

---

### 4. 🟠 HIGH: Visual Inconsistency — Light-Themed Content Pages

**Location:** `sections/main-blog.liquid`, `sections/main-article.liquid`, `sections/main-gift-card.liquid`

**Finding:** Three content sections use a **light color scheme** (`bg-[#DCDFE5] text-[#09090B]`, white `rounded-3xl` panels) that directly contradicts the brand's **dark/near-black identity** (`bg-[#0A0A0A]`, `text-[#F0F0F0]`, `rwnd-red` accents).

| Section | Current Scheme | Brand Scheme |
|---------|----------------|--------------|
| `main-blog` | Light gray bg, white cards, emerald accent | Dark bg, dark cards, red accent |
| `main-article` | Light gray bg, white panels | Dark bg, dark panels |
| `main-gift-card` | Light gray bg, white card, black border | Dark bg, dark card |

**Impact:**
- Jarring brand break when navigating to blog/article/gift-card
- Undermines "nocturnal streetwear" identity
- Looks like generic Shopify template (violates brand non-negotiable)

**Required Fix:** Refactor all three to use dark theme tokens from `theme.css` (`--surface-*`, `--text-*`, `--accent-red`)

---

### 5. 🟠 HIGH: Empty `main-404` Section (Dead Code)

**Location:** `sections/main-404.liquid` (1 line: empty) vs `templates/404.liquid` (inline dark-themed 404)

**Finding:** The section is registered but empty; the template has its own inline implementation. This is dead code.

**Required Fix:** Delete `sections/main-404.liquid` or move template content into the section.

---

### 6. 🟠 HIGH: Duplicate Newsletter Forms with Overlapping Tags

**Location:** `snippets/welcome-popup.liquid`, `sections/footer.liquid`, `sections/main-storefront.liquid`

**Finding:** Three separate `{% form 'customer' %}` newsletter forms with overlapping but inconsistent tags:

| Form | Tags |
|------|------|
| Welcome Popup | `newsletter, welcome_10off, drop-01` |
| Footer | `newsletter, footer-dispatch, drop-01` |
| Main Storefront (Grid Notifier) | `newsletter, drop-01, grid-early-access` |

**Impact:**
- Customer may be tagged multiple times for same intent
- `welcome_10off` only on popup — footer/main storefront signups don't get welcome code
- `grid-early-access` only on main storefront — inconsistent segmentation
- No centralized tag strategy

**Required Fix:** Standardize tag strategy; consider single source of truth for newsletter signup logic.

---

### 7. 🟡 MEDIUM: `main-storefront` Hero Searches for Hardcoded Handle

**Location:** `sections/main-storefront.liquid` lines ~380-400

```liquid
{% assign spotlight_product = all_products['cyber-set'] %}
{% if spotlight_product == empty %}
  {% assign spotlight_product = collections[section.settings.collection].products.first %}
{% endif %}
```

**Issue:** Hardcoded `'cyber-set'` handle. If product handle changes, spotlight breaks silently (falls back to collection first product).

**Required Fix:** Use a product metafield or setting to configure spotlight product.

---

### 8. 🟡 MEDIUM: Collection Filter Tags Hardcoded in `main-collection.liquid`

**Location:** `sections/main-collection.liquid` lines 34-52

Filter buttons for `chains`, `rings`, `bracelets`, `earphones`, `watch` are hardcoded. If collection tags change, filters break.

**Required Fix:** Derive filter options from collection's actual product tags dynamically, or make configurable via section settings.

---

### 9. 🟡 MEDIUM: Product Card "QUICK ADD" Uses Full Form Submit (Not AJAX)

**Location:** `sections/main-collection.liquid` line 170-178, `sections/main-search.liquid` line 148-157

```liquid
<form action="{{ routes.cart_add_url }}" method="post" enctype="multipart/form-data">
  <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
  <button type="submit">+ QUICK ADD</button>
</form>
```

**Issue:** Full page reload on add-to-cart from collection/search pages. `cart.js` has `addToCart()` AJAX handler but it's not wired to these forms.

**Impact:** Poor UX — page reload breaks browsing flow, no drawer open feedback.

**Required Fix:** Add `data-rwnd-quick-add` attribute and wire to `cart.js` `addToCart()` in `theme.js` or section script.

---

### 10. 🟡 MEDIUM: No Loading States on Cart Operations

**Location:** `assets/cart.js` — `changeLine`, `addToCart`, `goToCheckout`

**Finding:** No visual loading indicators during AJAX cart operations. Buttons don't show disabled/loading state.

**Impact:** User may click multiple times; no feedback during network latency.

**Required Fix:** Add `aria-busy`, disabled state, spinner on buttons during AJAX calls.

---

### 11. 🟡 MEDIUM: `rwnd-home-hero.css` Separate from Main CSS

**Location:** `assets/rwnd-home-hero.css` (7 lines) vs `assets/theme.css` (1,254 lines)

**Finding:** Hero slide transitions in separate file. Adds HTTP request; should be in `theme.css`.

**Required Fix:** Move to `theme.css` under hero section.

---

### 12. 🟢 LOW: `settings_schema.json` Minimal — No Theme Customization

**Location:** `config/settings_schema.json`

**Finding:** Only `share_image` setting. No color, font, layout, or content customization in theme editor.

**Impact:** Merchants cannot customize without code changes.

**Required Fix:** Add settings for hero content, colors, typography, announcement bar, etc.

---

### 13. 🟢 LOW: Two Separate Gift Card Templates

**Location:** `templates/gift_card.liquid` (Shopify default, `{% layout none %}`) vs `sections/main-gift-card.liquid` (custom light-themed section)

**Finding:** Custom section likely unused (no template references it). Shopify default handles gift cards.

**Required Fix:** Delete `main-gift-card.liquid` or wire it via `templates/gift_card.json`.

---

### 14. 🟢 LOW: Announcement Bar Text Hardcoded in `header.liquid`

**Location:** `sections/header.liquid` line 7

```liquid
FREE DELIVERY ON ORDERS ₹999+ // DISPATCHED FROM MADURAI
```

**Finding:** Not configurable via theme settings; uses locale key `general.header.announcement` but hardcoded in HTML.

**Required Fix:** Use `{{ 'general.header.announcement' | t }}` or section setting.

---

### 15. 🟢 LOW: `main-list-collections` Pagination Uses Default Paginate

**Location:** `sections/main-list-collections.liquid` line 59

```liquid
{% paginate collections by 12 %}
```

**Finding:** Hardcoded 12 per page; no section setting.

**Required Fix:** Add `collections_per_page` setting.

---

## Positive Findings (Strengths)

| Area | Detail |
|------|--------|
| **Cart Architecture** | Single source of truth in `cart.js`; progressive enhancement; proper Shopify API usage |
| **Design System** | Comprehensive CSS custom properties in `theme.css`; fluid type scale; brand tokens |
| **Accessibility** | Skip link, `focus-visible`, `prefers-reduced-motion`, `aria-live` toasts, keyboard drawer close |
| **SEO/Structured Data** | JSON-LD for WebSite, Organization, Product, BreadcrumbList in `theme.liquid` |
| **Performance** | No inline styles (except PDP); lazy-loading images; Tailwind CDN preconnect |
| **Dispatch Logic** | Clean PIN validation (625001-625020); cart attributes for checkout; shared snippet |
| **Locale/Translation** | Complete `en.default.json` with RWND20s terminology; zero generic Shopify copy |
| **Metaobject Reviews** | Real Shopify metaobjects only; no fake reviews; moderation workflow documented |
| **Git Hygiene** | Clean history; logical commits; no force-push; `DEPLOYMENT_READINESS_REPORT.md` exists |

---

## Page-Type Audit (15 Types)

| Page | Template/Section | Status | Issues |
|------|------------------|--------|--------|
| Home | `index.json` → `main-storefront` | ⚠️ | Orphaned `main-home` hero; dual intro flows |
| Product | `product.json` → `main-product` | ✅ | Excellent PDP; sticky mobile bar; reviews modal |
| Collection | `collection.json` → `main-collection` | ⚠️ | Hardcoded filters; QUICK ADD not AJAX |
| Cart | `cart.json` → `main-cart` | 🔴 | Shipping fee not visible pre-checkout |
| Search | `search.liquid` → `main-search` | ⚠️ | QUICK ADD not AJAX; red accent (#C8102E) differs from brand (#FF0033) |
| Blog Index | `blog.json` → `main-blog` | 🟠 | Light theme (off-brand) |
| Article | `article.json` → `main-article` | 🟠 | Light theme (off-brand) |
| Page (default) | `page.json` → `main-page` | ✅ | Dark theme; good prose styling |
| Page (night-calls) | `page.night-calls.liquid` | ✅ | Custom gothic classes; on-brand |
| List Collections | `list-collections.json` → `main-list-collections` | ✅ | Dark theme; good grid |
| Gift Card | `gift_card.liquid` (default) | ✅ | Shopify default; separate from custom section |
| 404 | `404.liquid` (inline) | ⚠️ | Empty section dead code |
| Account | `/account` (New Customer Accounts) | ✅ | No custom templates needed |
| Password | (Shopify default) | — | Not customized |
| Checkout | (Shopify native) | — | Not customizable; cart attributes pass dispatch data |

---

## JavaScript Error Audit

**Console Errors (Static Analysis):**
- None found in source code
- `cart.js` has proper error handling with `try/catch` and toast fallbacks
- `theme.js` minimal and safe

**Potential Runtime Issues:**
1. `openCartDrawer()` called from `header.liquid` `handleBagTrigger()` — must exist on `window` (it does in `cart.js`)
2. `showRwndWelcomeModal()` called from two intro flows — must exist (defined in `welcome-popup.liquid` script)
3. `openRwndDispatchModal()` / `closeRwndDispatchModal()` in `main-storefront.liquid` — defined inline
4. `openSizeGuideModal()` / `closeSizeGuideModal()` in `size-guide-modal.liquid` — defined inline

All globals properly exposed on `window`.

---

## Performance Bottlenecks

| Bottleneck | Location | Impact |
|------------|----------|--------|
| Tailwind CDN + inline config | `layout/theme.liquid` | Extra request; blocks render if CDN slow |
| Two intro background layers | `theme.liquid` (ambient + gateway) | Heavy CSS animations on load |
| `rwnd-home-hero.css` separate request | `main-storefront.liquid` | Extra HTTP request |
| Video in Intro Gateway | `intro-gateway.liquid` | Large asset; loads even if not played |
| `all_products['cyber-set']` lookup | `main-storefront.liquid` | Extra Liquid query on every homepage load |
| `shop.metaobjects.rwnd_review.values` | `main-storefront.liquid` | Iterates all reviews on homepage |

---

## Accessibility Gaps

| Gap | Location | WCAG |
|-----|----------|------|
| Search overlay: no focus trap | `header.liquid` `#fullscreen-search-overlay` | 2.4.3 |
| Mobile drawer: no focus trap | `header.liquid` `#mobile-drawer` | 2.4.3 |
| Cart drawer: focus not trapped | `cart-drawer.liquid` | 2.4.3 |
| Toast container: no `aria-live` region in HTML (only JS) | `theme.liquid` `#rwnd-toast-container` | 4.1.3 |
| Product gallery: no keyboard navigation for thumbnails | `main-product.liquid` | 2.1.1 |
| Color contrast: red (#FF0033) on black — verify 4.5:1 | Global | 1.4.3 |

---

## Conversion Friction Points

| Friction | Location | Impact |
|----------|----------|--------|
| Shipping fee invisible until checkout | Cart drawer, main cart | High — sticker shock |
| QUICK ADD causes page reload | Collection, search | Medium — breaks browse flow |
| No loading state on add-to-cart | All product forms | Medium — uncertainty |
| Welcome popup shows on every session (if not claimed) | `welcome-popup.liquid` | Low — annoyance |
| Dual intro flows confuse first-time visitors | Gothic Hero + Gateway | Medium — cognitive load |
| Light-themed blog/article breaks trust | `main-blog`, `main-article` | High — brand inconsistency |

---

## Root Cause Analysis: Popup/Loading/Transmission Issues

### Welcome Popup
- **Trigger:** `setTimeout(() => { if (!claimed && !sessionClosed) showModal() }, 2000)`
- **Gating:** `localStorage.rwnd_welcome_claimed` OR `sessionStorage.rwnd_popup_session_closed`
- **Issue:** `sessionStorage` clears on tab close → popup shows on every new session
- **Fix:** Use `localStorage` for session-closed flag too, or increase threshold

### Intro Gateway
- **Trigger:** `sessionStorage.rwnd_intro_seen` check on load
- **Video:** Loads `<video>` with `section.settings.intro_video_url` — no lazy load
- **Issue:** Video downloads even if user has seen intro
- **Fix:** Lazy-load video source after gateway interaction

### Cinematic Hero
- **Trigger:** `sessionStorage.rwnd_cinematic_played` 
- **Animation:** Heavy CSS radial gradients + keyframes
- **Issue:** Runs on every page load if not gated; conflicts with Gateway
- **Fix:** Remove or make ambient-only

---

## Recommended Implementation Priority

### Phase 1: Critical Conversion Blockers (Do First)
1. **Fix Founder Delivery ₹499 visibility** in cart drawer + main cart (`cart.js` `updateShippingDisplay`, `renderSummary`)
2. **Consolidate intro flows** — keep Gateway, remove Gothic Cinematic Hero gating
3. **Activate `main-home` hero** — replace `main-storefront` hero or merge
4. **Dark-theme `main-blog`, `main-article`, `main-gift-card`**

### Phase 2: UX/Conversion Improvements
5. **AJAX QUICK ADD** on collection/search pages
6. **Loading states** on all cart operations
7. **Fix hardcoded spotlight product** in `main-storefront`
8. **Dynamic collection filters** from tags

### Phase 3: Polish & Configuration
9. **Expand `settings_schema.json`** for merchant customization
10. **Merge `rwnd-home-hero.css`** into `theme.css`
11. **Standardize newsletter tags** across forms
12. **Fix announcement bar** to use locale/setting
13. **Clean up dead code** (`main-404.liquid`, `main-gift-card.liquid` if unused)
14. **Accessibility fixes** (focus traps, aria-live, keyboard nav)

### Phase 4: Performance & QA
15. **Lazy-load intro video**
16. **Browser functional testing** (Playwright) — all 15 page types
17. **Final re-score** to 10/10 target

---

## Files Requiring Modification (Priority Order)

| Priority | File | Changes |
|----------|------|---------|
| P0 | `assets/cart.js` | `updateShippingDisplay()` — inject ₹499 for Founder mode; recalc estimated total |
| P0 | `snippets/cart-drawer.liquid` | Ensure shipping display updates reactively |
| P0 | `sections/main-cart.liquid` | Ensure shipping display updates reactively |
| P0 | `sections/intro-gateway.liquid` | Keep as primary intro; lazy-load video |
| P0 | `sections/gothic-cinematic-hero.liquid` | Remove sessionStorage gating; make ambient-only |
| P0 | `templates/index.json` | Change section from `main-storefront` to `main-home` OR merge |
| P0 | `sections/main-home.liquid` | Ensure it works as homepage hero |
| P0 | `sections/main-blog.liquid` | Full dark-theme refactor |
| P0 | `sections/main-article.liquid` | Full dark-theme refactor |
| P0 | `sections/main-gift-card.liquid` | Full dark-theme refactor OR delete |
| P1 | `sections/main-collection.liquid` | AJAX quick-add; dynamic filters |
| P1 | `sections/main-search.liquid` | AJAX quick-add; fix red accent color |
| P1 | `assets/theme.js` | Wire quick-add forms to `cart.js.addToCart()` |
| P1 | `assets/cart.js` | Add loading states to `addToCart`, `changeLine`, `goToCheckout` |
| P1 | `sections/main-storefront.liquid` | Remove hardcoded `'cyber-set'`; use setting/metafield |
| P2 | `config/settings_schema.json` | Add comprehensive theme settings |
| P2 | `assets/theme.css` | Absorb `rwnd-home-hero.css`; add missing dark tokens for blog/article |
| P2 | `snippets/welcome-popup.liquid` | Improve gating (localStorage for session) |
| P2 | `sections/header.liquid` | Announcement bar from locale/setting; focus traps |
| P2 | `sections/main-list-collections.liquid` | Configurable pagination |
| P3 | `sections/main-404.liquid` | Delete or populate |
| P3 | `templates/gift_card.liquid` | Decide: keep Shopify default or use custom section |

---

## Verification Checklist for Implementation

- [ ] Founder Delivery ₹499 shows in cart drawer shipping line immediately on selection
- [ ] Founder Delivery ₹499 shows in main cart shipping line immediately on selection
- [ ] Estimated total in drawer = subtotal + ₹499 (when Founder mode + valid PIN)
- [ ] Estimated total in main cart = subtotal + ₹499 (when Founder mode + valid PIN)
- [ ] Switching to Standard Courier removes ₹499, shows "Rate at checkout"
- [ ] Free delivery threshold (₹999) progress bar based on subtotal only
- [ ] Checkout reflects actual Shopify shipping config (attributes passed correctly)
- [ ] No duplicate shipping charges
- [ ] Single intro flow (Gateway) plays on first visit
- [ ] Welcome popup shows after Gateway dismiss
- [ ] `main-home` 3-tab hero renders on homepage
- [ ] Blog, article, gift card pages use dark theme
- [ ] QUICK ADD on collection/search uses AJAX, opens drawer
- [ ] Loading states on all cart interactions
- [ ] No console errors
- [ ] `shopify theme check` passes (0 errors)
- [ ] Browser QA: all 15 page types desktop + mobile

---

*End of Audit Report*