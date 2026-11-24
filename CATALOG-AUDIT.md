# Catalogue audit — categories, titles, tags, badges

_Audited 22 Nov 2026 against `products_export_1.csv` (23 rows = 19 products, 4 of them multi-variant)._
_Everything in §4 is already implemented in the theme. §5 is the Shopify-admin work that only you can apply._

---

## 1. What the store had before this pass

### 1.1 Shopify product categories in the export (7 different values, 19 products)

| Shopify "Product Category" | Products |
|---|---|
| `Apparel & Accessories > Jewelry > Necklaces` | earring-3, chain-3, chain-2, chain-1 |
| `Apparel & Accessories > Jewelry > Earrings` | earring-2, earring-1 |
| `Apparel & Accessories > Jewelry > Bracelets` | bracelet-1, bracelet-2, bracelet-3 |
| `Apparel & Accessories > Jewelry > Body Jewelry` | ring-3 |
| `Apparel & Accessories > Jewelry > Rings` | ring-2, ring-1 |
| `Apparel & Accessories > Jewelry > Jewelry Sets` | 3-piece-y2k-cyber-set |
| `Apparel & Accessories > Jewelry` (generic — wrong) | y2k-watch, y2k-earrings, pink-chrome-earphones, y2k-chain-bracelet, y2k-heavy-chain-pendant, y2k-cyber-signet-ring |

### 1.2 What the theme showed (3 separate, disagreeing systems)

| Surface | Items | Missing |
|---|---|---|
| Header / footer nav collections | rings, chains, bracelets, earrings, earphones, watches (6) | necklaces, sets — and `earrings` still advertised though nothing is an earring |
| Collection page filter tabs | ALL, CHAINS, RINGS, BRACELETS, AUDIO, TIMEPIECES (5) | sets, necklaces/pendants |
| Card classification | substring match on handle + title ("earphone", "watch", "cyber set") | anything category-truthful — a mis-titled product drags itself into the wrong card |

### 1.3 Concrete mismatches found

| Product | Stored as | Actually is | Evidence |
|---|---|---|---|
| `earring-3` Thorned Romance | Necklaces + handle "earring" | Necklace / pendant | 50 cm chain + lobster clasp copy |
| `earring-2` Nocturne Cross | **Earrings** category | Necklace / pendant | copy + `necklaces, y2k-necklaces` tags |
| `earring-1` Scarlet Nova | **Earrings** category | Necklace / pendant | copy + `necklaces, y2k-necklaces` tags |
| `y2k-earrings` Ruby Edge | generic Jewelry | Necklace / pendant | copy + `necklaces` tags (SEO said "Cyber Studs" — stale) |
| `ring-3` Orbit Star | Body Jewelry | Ring | `rings, y2k-rings` tags + necklace copy pasted into a ring |
| `ring-2` Crimson Web | Rings | Ring | correct category, necklace copy pasted in |
| `y2k-cyber-signet-ring` Serpent Cross | generic Jewelry | Ring | `rings, y2k-rings`, handle "signet-ring", necklace copy pasted in |
| `y2k-chain-bracelet` | generic Jewelry, **title "Metallic Wired Chrome Earphones (TYPE-C)"**, earphone body | Bracelet | handle, SKU `B-01-1`, `bracelets, y2k-bracelets` tags, "Wrist Fit 19cm" option |
| `y2k-heavy-chain-pendant` Bonebound Heart | generic Jewelry | Necklace / pendant | `chains, pendants, y2k-chains` tags |
| `pink-chrome-earphones` | generic Jewelry | Audio | Type-C earphones |
| `y2k-watch` | **Jewelry** | Watch | Type `Watch`, SKU `W-01-*` |
| `bracelet-1/2/3` | Bracelets | Bracelets | placeholder titles `bracelet 1/2/3` |
| `earring-3`, `chain-1` | Vendor `My Store 2` | RWND20s | every other product is `RWND20s` |
| `earring-3` | tag `under-300` at ₹399 | `under-500` | price band tag drifted from price |
| `chain-1` | no `Type`, no `under-*` tag | Necklace, `under-600` | incomplete row |

---

## 2. The category model now (6 categories, 19 products)

| # | Category | Products | Canonical tags | Shopify category | Nav / tab label |
|---|---|---|---|---|---|
| 1 | **Necklaces & Pendants** | 8 — chain-1 Pink Relic, chain-2 Crimson Relic, chain-3 Silver Fang, earring-1 Scarlet Nova Pendant, earring-2 Nocturne Cross Pendant, earring-3 Thorned Romance Pendant, y2k-earrings Ruby Edge Pendant, y2k-heavy-chain-pendant Bonebound Heart | `necklaces`, `y2k-necklaces` | Jewelry > Necklaces | `NECKLACES` |
| 2 | **Rings** | 4 — ring-1 Stardust Relic, ring-2 Crimson Web, ring-3 Orbit Star, y2k-cyber-signet-ring Serpent Cross | `rings`, `y2k-rings` | Jewelry > Rings | `RINGS` |
| 3 | **Bracelets** | 4 — bracelet-1 Chrome Lattice, bracelet-2 Static Link, bracelet-3 Vault Chain, y2k-chain-bracelet Chrome Link | `bracelets`, `y2k-bracelets` | Jewelry > Bracelets | `BRACELETS` |
| 4 | **Audio** | 1 — pink-chrome-earphones Pink Chrome Wired Earphones (TYPE-C) | `earphones`, `type-c-earphones` | Electronics > Audio > Audio Components > Headphones & Headsets > Headphones > In-Ear Headphones | `AUDIO` |
| 5 | **Timepieces** | 1 — y2k-watch Y2K WATCH (prepaid + COD variants) | `watch`, `y2k-watch` | Jewelry > Watches | `TIMEPIECES` |
| 6 | **Sets** | 1 — 3-piece-y2k-cyber-set 3-Piece Y2K Mystery Cyber Set | `bundle`, `cyber-set` | Jewelry > Jewelry Sets | `SETS` |

**There are no earrings in the catalogue.** The earring handle/naming was the error, not the products — all four are pendants on a 50 cm chain.

---

## 3. Price + sale check (from the same export)

| Category | Price | Compare-at | Discount |
|---|---|---|---|
| Necklaces & Pendants | ₹199 – ₹549 | ₹398 – ₹1,098 | 50% |
| Rings | ₹349 | ₹698 – ₹998 | 50% – 65% |
| Bracelets | ₹549 | ₹1,098 – ₹1,598 | 50% – 66% |
| Audio | ₹999 | ₹2,998 | 67% |
| Timepieces | ₹1,999 prepaid / ₹2,199 COD | ₹4,998 / ₹5,198 | 60% / 58% |
| Sets | ₹1,199 | ₹2,894 | 59% (matches the ₹248 bundle claim: 549 + 549 + 349 = ₹1,447) |

Every product is below its compare-at price, so every card is a sale card. Price bands (`under-300 / -500 / -600 / -1000`) have been re-derived from the actual price in the fixed CSV.

---

## 4. What changed in the theme (this branch, PR #12)

| File | Change |
|---|---|
| `snippets/product-category.liquid` **(new)** | One resolver for the whole storefront. Renders `set \| watch \| audio \| bracelet \| necklace \| ring`, tags first (merchant-controlled), title/handle only when a product has no taxonomy tag at all. Prevents the "bracelet titled Earphones" class of bug from ever returning. |
| `sections/main-product.liquid` | PDP flags (`is_watch/is_earphone/is_bundle`) now derive from the resolver, plus new `is_ring/is_bracelet/is_necklace`; spec table "FIT PROFILE" and the top chip are category-aware instead of a single hard-coded line. |
| `sections/main-collection.liquid` | Tabs are now **ALL · NECKLACES · RINGS · BRACELETS · SETS · AUDIO · TIMEPIECES**; each card carries `data-category` so filters match exactly instead of by title substring; the sub-label under each card name is category-aware (`CHAIN + PENDANT`, `SIGNET RING`, `LINK BRACELET`, `TYPE-C AUDIO`, …). |
| `sections/main-search.liquid` | Same resolver; results now print the category above the vendor line; badges split (see below). |
| `sections/main-storefront.liquid` | Category tile 02 relabelled **NECKLACES & PENDANTS** (was "RINGS & CHAINS"; it never linked to chains); grid cards gained the SAVE badge. |
| `sections/header.liquid`, `sections/footer.liquid` | "Chains" + "Earrings" nav entries merged into **Necklaces & Pendants**; "3-Piece Cyber Set" now points at the `sets` collection with the product as fallback. All guarded — a missing collection falls back to the full catalogue. |

### Badge rule (your answer #3)

SAVE is now the **left** slot on every card, and the taxonomy badge keeps the **right** slot — so a discounted watch shows both `SAVE ₹2,999` and `PRE-ORDER` instead of PRE-ORDER hiding the saving:

* collection grid, storefront grid, search results: `SAVE ₹x` (left) + `MYSTERY VAULT / PRE-ORDER / TYPE-C AUDIO / DROP 01` (right)
* PDP + spotlight keep their variant-matched strikethrough + SAVE (already correct)

---

## 5. Admin work only you can do (in this order)

1. **Import `products_export_fixed.csv`** (repo root) — Shopify admin → Products → Import → *Overwrite existing products with matching handles*.
   It fixes, for all 19 products: Title, Type, Product Category, Vendor (`My Store 2` → `RWND20s`), Tags (canonical + correct price band) and the body copy that contradicted the category (3 rings + 1 bracelet). Prices, compare-at prices, SKUs, quantities and images are untouched.
2. **Create two smart collections** (Products → Collections → Create → Automated):
   * `necklaces` — condition: product tag **is equal to** `necklaces` (or Type = `Necklace`)
   * `sets` — condition: product tag **is equal to** `bundle` (or Type = `Set`)
   Until they exist the nav links fall back to the full catalogue, so nothing 404s.
3. **Retire the `earrings` collection** (or empty it) — the nav no longer links to it, but it is still publicly reachable.
4. Optional: rename the `chains` collection to `necklaces`, or keep it as an alias with the same rules.

### Titles changed by the import

| Handle | Was | Now |
|---|---|---|
| earring-3 | Thorned Romance | **Thorned Romance Pendant** |
| earring-2 | Nocturne Cross | **Nocturne Cross Pendant** |
| earring-1 | Scarlet Nova | **Scarlet Nova Pendant** |
| y2k-earrings | Ruby Edge | **Ruby Edge Pendant** (+ SEO title/description de-earringed, was "Y2K Cyber Studs") |
| y2k-chain-bracelet | Metallic Wired Chrome Earphones (TYPE-C) | **Chrome Link Bracelet** |
| bracelet-1 | bracelet 1 | **Chrome Lattice Bracelet** |
| bracelet-2 | bracelet 2 | **Static Link Bracelet** |
| bracelet-3 | bracelet 3 | **Vault Chain Bracelet** |

Everything else keeps its name (they were already accurate); only their Type / category / tags / vendor changed.

---

## 6. Deliberately left alone

* **Handles** (`earring-1`, `y2k-earrings`, `y2k-chain-bracelet`) — renaming a handle through CSV import creates a *new* product and kills the old URL, so the URLs stay. Say the word and I will map redirects (`/products/earring-1` → `/products/scarlet-nova-pendant`) if you want to do a proper rename later.
* **`Ruby Edge` variant label** "Pair Edition Silver Cyber Pair + Pouch" — reads like a pair of earrings. Left as-is because it is order history data; change it in admin if the item is a single pendant.
* **Stock at 0** on all rings, necklaces and bracelets (`continue selling when out of stock` is not set) — those PDPs render SOLD OUT. That is an inventory decision, not a theme bug.
* **Product body SEO mentions** of "Cyber Studs" only on Ruby Edge (fixed above).

## 7. Verification performed

* `snippets/product-category.liquid` rendered against all 19 products, both the current live rows and the fixed rows → **19/19 classify correctly** in both states.
* Liquid parse check on all 7 touched files: clean (Shopify-only `schema` / `paginate` / `form` / `section` tags neutralised by the checker).
* No `chains_url` / `earrings_url` references left dangling anywhere in `sections/`, `snippets/`, `layout/`.
