## Goal

Move the homepage promo carousel from a hard-coded file (`src/lib/promo-banners.ts`) to content the admin can add, edit, reorder, hide, and delete from the admin panel — with the three banners currently on the homepage carried over as real, fully editable and deletable records.

## Migrating the existing banners

The three current banners (`daily-discount`, `save-more`, `popular-dish`) are inserted into the new table as part of the same migration, keeping:

- all five language variants of badge, headline, subtext and button text exactly as they are today,
- their current images (`hero-bakery-clean.jpg`, `bag-bakery.jpg`, `bag-khachapuri.jpg`),
- their current order and `/search` link target.

After the change they behave like any other banner: editable, hideable, reorderable, and deletable from the admin page. The homepage looks identical the moment the change lands.

## What the admin will get

A new **"ბანერები / Banners"** item in the admin sidebar (`/admin/banners`) with:

- A list of all banners in display order, each showing its image thumbnail, headline, active/hidden state, and link target.
- **Add banner** and **Edit banner** form with:
  - Badge, headline, subtext, button text — each with all five language fields (Georgian required, EN/RU/TR/FA optional and falling back to Georgian, the same rule the carousel already uses).
  - Link target: a dropdown of real app routes (`/`, `/search`, `/map`, `/favorites`) plus an optional category filter, so no one can type a broken URL.
  - Image: upload from device (stored in backend storage) or leave empty for the plain brand-green banner.
  - Active toggle (hide without deleting).
- **Reorder** with up/down buttons (controls the rotation order).
- **Delete** with a confirmation.
- Live preview of the banner as it will look on the homepage.

Public homepage behaviour is unchanged visually: same carousel, same animation, same accessibility. It just reads its slides from the database now.

## Technical details

**Database migration**
- New table `public.promo_banners`: ordering position, `active`, image path/url, overlay class override, link target (`link_to`, `link_search`), and per-language text columns for badge / headline / subtext / button text (`*_ka`, `*_en`, `*_ru`, `*_tr`, `*_fa`), plus `created_at` / `updated_at` with the existing update trigger.
- GRANTs: `SELECT` to `anon` and `authenticated` (banners are public content), full CRUD to `authenticated`, `ALL` to `service_role`.
- RLS: anyone may read rows where `active = true`; only admins (`has_role(auth.uid(), 'admin')`) may read all rows and insert/update/delete.
- Literal `INSERT` statements seeding the three existing banners, as described above.
- New public storage bucket `promo-banners` for uploaded images, with admin-only write policies. The three existing images stay as bundled assets referenced by URL, so nothing needs re-uploading.

**Code**
- `src/lib/promo-banners.ts`: keep the `PromoBanner` / `LocalizedText` types and `localizedText()`, keep the current array only as an offline fallback, and add a mapper from a database row to `PromoBanner`.
- `src/lib/banners-admin.ts`: hook for the admin list plus create/update/delete/reorder helpers (browser Supabase client, RLS-protected).
- `src/routes/_authenticated/admin.banners.tsx`: the new admin page, matching existing admin page styling (rounded cards, `L(ka, en, ru)` helper, LTR-forced admin shell).
- `src/routes/_authenticated/admin.tsx`: add the sidebar/drawer nav entry.
- `src/routes/index.tsx`: fetch active banners and pass them into `<PromoCarousel banners={...} />`; on empty/error it falls back to the built-in three so the homepage is never blank.
- `PromoCarousel.tsx` needs no structural change — it already accepts a `banners` prop.

Not touched: the TBC payments work from the previous turn, the partner panel, or any customer-facing copy.
