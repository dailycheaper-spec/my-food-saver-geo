## Goal

Replace the single static promo banner on the home screen with a self-rotating, accessible carousel whose content comes from one easy-to-edit data file.

## 1. Banner content source (the "CMS")

New file: `src/lib/promo-banners.ts`

A plain exported array — the single place to add, edit, or remove banners. Each entry:

```ts
export type PromoBanner = {
  id: string;                     // stable key
  badge?: LocalizedText;          // small pill above the headline
  headline: LocalizedText;        // e.g. "ყოველდღე 50%+ ფასდაკლებით"
  subtext: LocalizedText;         // e.g. "გემრიელი საკვები საყვარელი ადგილებიდან!"
  buttonText: LocalizedText;      // e.g. "შეუკვეთე"
  buttonAction: { to: string; search?: Record<string, string> }; // internal route
  imageSource?: string;           // imported image; optional
  overlayClass?: string;          // gradient/colour override, defaults to brand green
  active?: boolean;               // false hides it without deleting
};
```

`LocalizedText` is `{ ka: string; en?: string; ru?: string; tr?: string; fa?: string }`, resolved with the existing `Language` type and falling back to `ka`. This keeps the carousel consistent with the app's 5-language support (KA/EN/RU/TR/FA) and RTL for Persian.

Three seeded entries, exactly as requested:
1. The current banner (hero-bakery image, "ყოველდღე 50%+ ფასდაკლებით" / "გემრიელი საკვები საყვარელი ადგილებიდან!" / "შეუკვეთე" → `/search`).
2. "დაზოგეთ მეტი" (Save More) with a matching subtext and CTA → `/search`.
3. "პოპულარული დღის კერძი" (Popular Dish of the Day) → `/search`.

Entries 2 and 3 reuse existing bundled images (`bag-bakery.jpg`, `bag-khachapuri.jpg`) so nothing new needs generating; swapping in dedicated artwork later is a one-line change.

The file will carry a commented developer note at the top showing exactly how to add/edit/remove an entry.

## 2. Carousel component

New file: `src/components/PromoCarousel.tsx`, rendered where the current banner block sits in `src/routes/index.tsx` (that inline markup is removed).

Behaviour:
- Auto-advance every 6s, looping.
- Pause on mouse hover, on keyboard focus within, when the tab is hidden, and while a touch/drag is in progress.
- Respects `prefers-reduced-motion`: no auto-rotation, controls still work.
- Slide transition is a simple cross-fade/slide, using existing motion conventions.

Controls:
- Small circular prev/next arrows, overlaid on the sides, sized to a 44×44 tap target, hidden-until-hover on desktop but always present for touch and keyboard.
- Dot indicators under/over the banner; each dot jumps to its slide.
- Horizontal swipe on touch.

Accessibility:
- Wrapper `role="region"` + `aria-roledescription="carousel"` + localized `aria-label`.
- Each slide `role="group"`, `aria-roledescription="slide"`, `aria-label="N of M"`, inactive slides `aria-hidden` and removed from the tab order.
- Arrows and dots are real `<button>`s with localized `aria-label`s (`aria-current` on the active dot).
- A polite `aria-live` region announcing the current slide only when the user navigates manually (silent during auto-rotation).
- The clickable banner surface is a single focusable link per slide (no nested interactive elements), so keyboard focus order stays logical; arrow keys move between slides when focus is inside the carousel.

Visuals match the reference exactly: rounded-3xl card, image with the green `from-primary/95` gradient plus bottom dark vignette, badge pill, headline, subtext, white pill CTA — all using existing semantic tokens, no hardcoded colours.

## 3. Localization

New strings (carousel label, previous/next slide, "go to slide N", pause/play) added to the existing i18n key sets for all five languages. Banner copy itself lives in `promo-banners.ts`, not i18n, so it can be edited in one place.

## Technical notes

- No backend/table is added — content is a typed constant, per the "mock API / structured data" option in the request. If you later want partner- or admin-editable banners, this array maps 1:1 to a `promo_banners` table and can be swapped for a query without touching the component.
- Files touched: new `src/lib/promo-banners.ts`, new `src/components/PromoCarousel.tsx`, edits to `src/routes/index.tsx` (remove inline banner, render carousel) and `src/lib/i18n*.ts(x)` (control labels).
