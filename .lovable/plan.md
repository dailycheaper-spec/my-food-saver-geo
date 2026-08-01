## Goal

Two things: (1) make Google stop showing the old Cheaper logo in search/social previews, and (2) bring the site's SEO up to best practice.

## Why the old logo persists

Google and social platforms cache images by URL. The brand files were replaced but the URLs stayed the same (`/og-image.png`, `/favicon.png`, `/icon-512.png`), so crawlers keep serving what they cached. There is also no `Organization` structured data telling Google which image is the official brand logo, and no sitemap `Sitemap:` hint, so re-crawling is slow.

## 1. Logo / preview refresh

- Publish the current brand assets under new, versioned filenames (e.g. `og-image-v2.png`, `favicon-v2.png`, `icon-192-v2.png`, `icon-512-v2.png`, `icon-maskable-512-v2.png`, `apple-touch-icon-v2.png`, `logo-lockup-v2.png`, `logo-tile-v2.png`), keeping the same artwork.
- Point `__root.tsx` head links, `public/manifest.webmanifest`, and `src/components/Logo.tsx` at the new URLs.
- Add `Organization` JSON-LD in `__root.tsx` with `name`, `url: https://cheaper.ge`, and `logo` pointing to the new 512px logo — this is the signal Google uses for the brand knowledge panel / favicon.
- Keep the old files in place so existing shared links don't break.

Note: crawler-side caches still refresh on Google's own schedule; the new URLs make it happen at the next crawl instead of never. I'll also point out where to request re-indexing.

## 2. Metadata quality (fixes current SEO findings)

- Add self-referencing `<link rel="canonical">` and `og:url` on every public leaf route (`/`, `/about`, `/privacy`, `/terms`, `/search`, `/map`, `/store/$id`, `/offer/$id`, `/favorites`, `/notifications`).
- Differentiate the homepage title/description from the root defaults (root keeps sitewide fallbacks only).
- Expand short descriptions on `/about`, `/privacy`, `/terms`, `/search`, `/store/$id` into unique 50–160 character Georgian copy.
- Add unique `og:title` / `og:description` to those same routes; set `og:type: product` on `/offer/$id`.
- Keep `noindex` on `/auth`, `/orders/*`, `/analytics`, native-return and admin/partner routes.

## 3. Structured data

- `WebSite` + `Organization` (with `logo` and `SearchAction`) at root.
- `Product` JSON-LD on `/offer/$id` from loader data: name, image, description, `offers.price`, `priceCurrency: GEL`, availability.
- `LocalBusiness` JSON-LD on `/store/$id`: name, logo, address, geo coordinates, city.

## 4. Crawlability

- `public/robots.txt`: keep `Allow: /`, add `Disallow:` for `/admin`, `/partner`, `/auth`, `/orders`, `/analytics`, and add a `Sitemap: https://cheaper.ge/sitemap.xml` line.
- `src/routes/sitemap[.]xml.ts`: set `BASE_URL = "https://cheaper.ge"` (currently empty, so the sitemap emits path-only `<loc>` values that Google rejects), drop the noindex routes (`/orders`, `/notifications`, `/profile`, `/favorites` are user-only), and generate offer/store entries from the live database instead of the mock `OFFERS` array.

## 5. On-page content signals

- Add a single `<h1>` to `/search`, `/map`, and `/profile` (currently missing), and an `aria-label` on the map back button.

## Technical notes

All head tags stay in each route's `head()` option per TanStack Start; canonical goes on leaf routes only (root would duplicate it). JSON-LD ships via the `scripts` array. No backend or business-logic changes.

## Follow-up after publish

Once live, I can connect Google Search Console and submit the sitemap so the new logo and pages get re-crawled quickly rather than waiting for an organic crawl.
