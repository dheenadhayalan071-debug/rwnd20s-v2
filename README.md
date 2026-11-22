# RWND20s — Shopify Theme (V2)

Online Store 2.0 theme for **RWND20s** (Y2K hardware, 316L stainless steel jewelry,
watches, Type-C audio). Everything is rendered by Shopify Liquid; there is no
custom backend, database, or build step in this repository.

- Storefront copy and pricing come from Shopify admin.
- Money is only ever displayed from Shopify's own values (`price`, `total_price`,
  `final_line_price`, `/cart.js`). The theme never calculates a payable total.
- Shipping, COD fees, discounts, and taxes are resolved by Shopify checkout.

---

## 1. Requirements

- A Shopify store on an Online Store 2.0 theme.
- Products published to the **Online Store** sales channel.
- Collections: `rings`, `chains`, `bracelets`, `earrings`, `earphones`, `watches`
  (missing handles fall back to `/collections/all`, so the theme still works
  before every collection exists).
- Pages used by navigation: `size-guide`, `track-order`, `faq`, `contact`,
  `shipping`, `returns`, `cancellation`, `pre-order`, `privacy-policy`, `terms`.
- Blog handle `journal` for `/blogs/journal` (the footer falls back to the
  contact page if it does not exist).

---

## 2. Product reviews (metaobjects)

Reviews are **real Shopify metaobjects only**. There are no demo reviews, no
seeded fallbacks, and no `localStorage` review rendering.

### 2.1 Metaobject definition

Create a metaobject definition in **Shopify admin → Content → Metaobjects**:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `author` | Single line text | Yes | Display name, e.g. `ARJUN K.` |
| `city` | Single line text | No | e.g. `CHENNAI` |
| `rating` | Rating | Yes | 1–5 |
| `body` | Multi-line text | Yes | Review body shown on the storefront |
| `product` | Product reference | Recommended | Used by admin tooling / moderation |
| `approved` | Boolean | Recommended | Only publish approved entries |

Definition type: `rwnd_review`.

- The homepage reads published entries from `shop.metaobjects.rwnd_review.values`.
- Product pages read the product metafield `custom.reviews`.

### 2.2 Product metafield

Create a product metafield definition:

- Namespace and key: `custom.reviews`
- Type: **List of metaobject references** → `rwnd_review`

Assign approved reviews to each product. The product page computes the average
rating and count from that list. If the list is empty the UI shows
`NO APPROVED REVIEWS YET` — no placeholder reviews are injected.

### 2.3 Submitting a review

The **LOG TRANSMISSION** form posts the review to Shopify's `/contact` endpoint
with the product, rating, name, city, and body. It checks `response.ok` and
surfaces the real error text. A moderator creates the `rwnd_review` entry and
links it to the product's `custom.reviews` metafield; only then does it render.
No review text is written to `localStorage` and no card is added client-side
before moderation.

---

## 3. Cart and checkout

### 3.1 Files

- `assets/cart.js` — the single cart module: add, change, render, dispatch
  attributes, founder fee, checkout hand-off. Loaded globally from
  `layout/theme.liquid`.
- `sections/main-cart.liquid` — `/cart`, server-rendered with Liquid so the page
  works without JavaScript. `assets/cart.js` progressively enhances it.

There is exactly one `form[action*="/cart/add"]` submit handler (in `cart.js`).
Do not add another global add-to-cart handler in `theme.liquid` or `theme.js`.

### 3.2 Authoritative totals

| UI value | Source |
| --- | --- |
| Line price | `item.final_line_price` |
| Items subtotal | `cart.items_subtotal_price` |
| Discounts | `cart.total_discount` |
| Total | `cart.total_price` |
| Founder fee (indicative) | global setting `founder_delivery_fee` (see below) |

Shipping and COD are always shown as **CALCULATED AT CHECKOUT**. The ₹999 free
delivery progress bar is informational only; checkout remains the source of
truth.

### 3.2a Founder hand-delivery fee (indicative)

The cart shows a `+ ₹499` row and an **ESTIMATED TOTAL** row when the Madurai
PIN is valid (`625001`–`625020`). The fee comes from the global theme setting
**Settings → Theme settings → Founder delivery → Founder hand-delivery fee**
(default `₹499`, `0` disables it). The fee row is a display-only estimate:
checkout remains authoritative, and the actual charge must be enforced by a
Shopify shipping rate (see §4).

### 3.3 Discounts

No code is auto-applied. `RWND10` is only a welcome/newsletter code that a
customer enters manually. The promo field forwards the code to checkout as
`/checkout?discount=CODE`, where Shopify validates it. Create the discount in
**Shopify admin → Discounts**; the theme does not create or store it.

### Promo-code signup popup

`snippets/welcome-popup.liquid` is a native `{% form 'customer' %}` (rendered on
the theme layout, so it is present on every page). Success detection is
server-side via `form.posted_successfully?` **inside** the `{% form %}` tag —
never via client-side URL-marker guessing. A hidden `return_to` keeps the user
on the current page after the submit; the server-rendered success state shows
the RWND10 code once and is remembered in localStorage so the popup never
re-opens for that visitor. Spam protection (hCaptcha) is Shopify's own
anti-bot layer and applies to the native submit unchanged.

### 3.4 Instant checkout

"Instant checkout" buttons are `type="button"` elements handled by `cart.js`:
they add the selected variant through `/cart/add.js`, wait for the real response,
and only then redirect to `/checkout`. They never link straight to `/checkout`
with an empty cart.

---

## 4. Dispatch modes and Madurai PIN validation

The cart offers two modes:

1. **Standard Courier (PAN-India)** — rate configured in Shopify admin.
2. **Hand Delivery by Founders (Madurai only)** — PIN codes `625001`–`625020`.

On checkout the theme writes cart attributes:

| Attribute | Example |
| --- | --- |
| `Dispatch Mode` | `Hand Delivery by Founders (Madurai Only)` |
| `Dispatch Fee` | `₹499` or `Standard` |
| `Madurai Delivery PIN` | `625020` |

Client-side validation is a UX guard only. The charge must be enforced by a
real Shopify shipping rate:

1. **Settings → Shipping and delivery → Local delivery** (or a shipping profile).
2. Create a Madurai zone covering PIN codes `625001`–`625020`.
3. Add the founder hand-delivery rate (₹499) to that zone.
4. Add the standard PAN-India rate to the rest of India.

If the admin rates are not configured, checkout will not charge the ₹499 fee —
the theme deliberately does not invent a fee.

---

## 5. Templates

| Template | Section |
| --- | --- |
| `templates/index.json` | `main-storefront` |
| `templates/product.json` | `main-product` |
| `templates/collection.json` | `main-collection` |
| `templates/list-collections.json` | `main-list-collections` |
| `templates/cart.json` | `main-cart` |
| `templates/search.liquid` | `main-search` |
| `templates/blog.json` | `main-blog` |
| `templates/article.json` | `main-article` |
| `templates/page.json` | `main-page` |
| `templates/404.liquid` | standalone |

`/account` uses **Shopify New Customer Accounts**, so there are intentionally no
`templates/customers/*` files in this theme. Keep the header account link
pointing at `/account`.

---

## 6. Local checks

The repository has no Node/Python/Ruby toolchain. If the Shopify CLI is
installed, run:

```bash
shopify theme check
```

Otherwise validate JSON and Liquid markup before pushing:

```bash
# JSON
perl -MJSON::PP -0777 -e 'decode_json(<STDIN>)' < templates/index.json

# Liquid schema JSON
perl -0777 -MJSON::PP -ne 'decode_json($1) if /{% schema %}(.*?){% endschema %}/s' sections/main-product.liquid
```

---

## 7. Conventions

- Theme copy is intentionally uppercase / terminal-style.
- Currency is INR; Shopify minor units are used in Liquid filters and JS
  (`99900` = ₹999).
- Never hardcode a price, saving, stock count, or review. Derive them from
  Shopify objects.
- Guard optional handles (`collections[...]`, `pages[...]`, `all_products[...]`)
  and fall back to `routes.all_products_collection_url` or the contact page.
- Accessibility: no `maximum-scale` in the viewport, a skip-to-content link on
  every page, labelled form controls, and `aria-current` on pagination.
