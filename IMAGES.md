# Image set — product photos, category art, crops

Two sources, one rule: every image sits under the product whose **name** it matches, in the category that product already belongs to.

---

## A. Your 10 product photos (attached 24 Nov)

Each shot is cropped 1200×1200 around the piece, graded +4% contrast and lightly sharpened, then written to `product-images/<handle>.jpg`. **Image Src is already in `products_export_fixed.csv`**, so the import attaches them for you — no manual media upload.

| # | Photo | → Product | Handle | Category | Confidence |
|---|---|---|---|---|---|
| 1 | heart-cut ruby ring, pavé halo, open band | **Stardust Relic** | `ring-1` | Rings | good |
| 2 | twin-star ring with crimson stone | **Orbit Star** | `ring-3` | Rings | strong |
| 3 | haloed heart pendant + steel spike | **Bonebound Heart** | `y2k-heavy-chain-pendant` | Chains | strong ("a heart with a spine") |
| 4 | crimson heart between barbed-wire arms | **Thorned Romance** | `earring-3` | Chains | strong (barbed wire) |
| 5 | engraved star pendant, spiral centre | **Silver Fang** | `chain-3` | Chains | **weak — name says fang, photo is a star** |
| 6 | cross pendant edged with crimson stones | **Nocturne Cross** | `earring-2` | Chains | strong |
| 7 | four-point star pendant, crimson centre | **Scarlet Nova** | `earring-1` | Chains | strong (nova = star) |
| 8 | dagger pendant with crimson stone | **Ruby Edge** | `y2k-earrings` | Chains | strong (edge = blade) |
| 9 | miniature lipstick charm + steel star | **Crimson Relic** | `chain-2` | Chains | good (crimson) |
| 10 | miniature milk-bottle charm + steel star | **Pink Relic** | `chain-1` | Chains | good (pink/white) |

**Still without a photo:** `ring-2` Crimson Web, `y2k-cyber-signet-ring` Serpent Cross (Rings), plus the watch, earphones and mystery set. They keep the category fallback art described below.

Because the photos now define the products, **the copy was rewritten to match the picture** for the ten above (Stardust Relic is a heart-halo ring, not a signet; Crimson Relic is a lipstick charm, not a relic cast; Silver Fang is a star, not a fang). Google-visible text stays honest, which is what the earlier copy audit was for.

### How the import attaches them

`Image Src` in the CSV points at the public raw file in this repo:

```
https://raw.githubusercontent.com/dheenadhayalan071-debug/rwnd20s-v2/arena/20b2e6b3-rwnd20s-v2/product-images/<handle>.jpg
```

Shopify downloads it during import and stores its own copy, so the link only has to survive the import. `Image Alt Text` and `Image Position` (1) are set too.

---

## B. The trio studio shot → three category placeholders

Source: one 1671×941 studio shot (`Y2K Silver Jewelry Trio with Ruby Ring.png`, also the current site hero).
It contains exactly three pieces, one per category, which is why it splits cleanly.

| Piece in the shot | Matched product | Category | Files (4:5 card · 1:1 PDP) |
|---|---|---|---|
| Ornate cross pendant on a box chain | **Nocturne Cross** (`earring-2`, ₹199) | Chains & Pendants | `image-lab/out/nocturne-cross-card.*` · `nocturne-cross-square.*` |
| Heavy interlocking link bracelet, lobster clasp | **Deadbolt** (`bracelet-3`, ₹549) | Bracelets | `image-lab/out/deadbolt-card.*` · `deadbolt-square.*` |
| Star-set signet ring with crimson stone | **Orbit Star** (`ring-3`, ₹349) | Rings | `image-lab/out/orbit-star-card.*` · `orbit-star-square.*` |
| Whole trio | **3-Piece Y2K Mystery Cyber Set** + site hero | Sets / home | `image-lab/out/hero-drop01.*` → live as `assets/hero-default.webp` |

Every file ships as `.webp` (86–88 quality) and `.jpg` (88–90) so Shopify accepts either.

## What "refine, crop, adjust" actually did

1. **Crop** — each piece is cropped from the master at its measured bounds, then expanded to two fixed ratios around its centre: **4:5 (800×1000)** for grid cards, **1:1 (1200×1200)** for the product page. No piece is cut at the frame edge.
2. **Adjust** — +7% contrast, +5% colour, +2% brightness, then `UnsharpMask(radius 1.4, 62%)`. The steel reads chrome instead of grey on small screens.
3. **Vignette** — an elliptical falloff to near-black at the corners, so the *other two* pieces in the trio dissolve instead of appearing as clipped debris (that was the first draft's flaw — the bracelet was visible in the pendant crop).
4. **Weight** — 43–48 KB per card webp, 65–73 KB per square, hero 101 KB (was 1.8 MB as a PNG, 63 KB as the old webp but visibly softer).

## Where the site already uses them (committed)

18 of the 19 products have **no product photo** in Shopify, so their cards used to render a text box. The theme now falls back to the category shot:

| Surface | Behaviour |
|---|---|
| Collection grid, home grid | `product.featured_image` → else `<category>-fallback.webp` (chains / rings / bracelets), alt = product title |
| Search results | same fallback, replacing the old "NO ASSET" label |
| Product page media | same fallback, replacing "MEDIA ARCHIVE PENDING" |
| Hero | `assets/hero-default.webp` replaced with the graded version |

The moment you upload a real photo to a product, it takes over automatically — the fallback only fills the gap.

## To attach a photo to a product (Shopify admin)

1. Products → open the product (e.g. **Nocturne Cross**).
2. Media → **Add** → upload `image-lab/out/nocturne-cross-square.jpg`.
3. Set **Alt text** to the line below (SEO + accessibility).
4. Save. Drag it to position 1 if it isn't already the featured image.

### Alt text, ready to paste
- Nocturne Cross — *Nocturne Cross — ornate 316L stainless steel cross pendant on a fine box chain, high-polish chrome*
- Deadbolt — *Deadbolt — heavy 316L stainless steel link bracelet with lobster clasp, high-polish chrome*
- Orbit Star — *Orbit Star — star-set 316L stainless steel signet ring with crimson stone, open adjustable band*
- Mystery Set — *RWND20S Drop 01 trio — steel cross pendant, link bracelet and star ring on a black podium*
- Hero — *RWND20S Drop 01 hardware trio — chain, bracelet and ring under red studio light*

## Hover choreography (in `assets/theme.css`)

`.rwnd-media` / `.rwnd-media-img` are now on every card frame, search card and the PDP media well:

* **push-in** — image scales to 1.06 over 650 ms, `cubic-bezier(.22,.61,.36,1)` (no bounce, reads as hardware)
* **chrome sweep** — one diagonal brand-red highlight crosses the frame in 850 ms
* **grade lift** — `saturate(1.10) contrast(1.05) brightness(1.03)`
* disabled entirely under `prefers-reduced-motion: reduce`, alongside the existing loader/lift animations

Live preview of all of it: `image-lab/preview.html` (served at port 8080 in this session).
