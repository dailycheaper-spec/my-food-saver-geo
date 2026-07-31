## Goal

Make pages feel instant and stable on mobile web, iOS and Android webviews: no image pop-in, no layout jumps, one smooth fade instead of piecemeal rendering.

Approach follows the pro-tip: never a blank blocking screen — skeletons render immediately, content cross-fades in as it becomes ready.

## 1. Reusable image component

New `src/components/ImageWithSkeleton.tsx`:

- Wrapper div owns the geometry (`aspect` class or explicit height passed via `className`), `overflow-hidden`, and a pulsing themed skeleton layer (`bg-muted animate-pulse`).
- `<img>` sits absolutely on top at `opacity-0`, transitions to `opacity-100` over 250ms on `onLoad`; skeleton fades out at the same time.
- `onError` falls back to a provided fallback source (keeps current fallback-image behaviour) and still resolves the fade so nothing stays stuck pulsing.
- Props: `src`, `alt`, `aspect` (default `4/3`), `priority` (sets `loading="eager"` + `fetchpriority="high"`, otherwise `lazy` + `decoding="async"`), `objectFit`, `className`, `imgClassName`, `fallbackSrc`.
- Cached images that are already complete skip the fade (no flash on back navigation).

## 2. Adopt it everywhere remote images render

- `src/components/OfferCard.tsx` — card image (keeps existing `aspect-[16/10]` / `aspect-[4/3]`), lazy except when the card is marked featured/first.
- `src/components/PromoCarousel.tsx` — hero banner slides; slide 0 eager, others lazy.
- `src/routes/offer.$id.tsx` — offer hero (already `aspect-[4/3]`), eager.
- `src/routes/store.$id.tsx` — store cover, eager.
- `src/routes/search.tsx` — 40x40 result thumbs (fixed size, so no CLS) get the skeleton treatment.
- `src/components/StoreLogo.tsx` — logo `<img>` gets a fixed-size skeleton so avatar rows don't jump.

## 3. Prevent layout shift

Audit each of the above: every image container gets an explicit `aspect-*` or fixed `w-/h-` box before the image resolves. Search thumbs and store logos get fixed square boxes; carousel and card containers already have ratios and keep them.

## 4. Page-level readiness transition

New tiny hook `src/hooks/use-page-ready.ts`:

- Takes `{ dataReady, images }` — a boolean for critical route data plus an optional list of above-the-fold image URLs.
- Preloads those URLs with `new Image()`, resolving on load/error, and applies a short safety timeout (~1200ms) so a slow 3G asset never blocks the screen.
- Returns `isReady`.

New `src/components/PageFade.tsx`: wraps route content with `opacity-0 → opacity-100`, `transition-opacity duration-250 ease-in-out`, and `will-change: opacity`. While not ready it renders the page's skeleton children (not a blank screen).

Applied to the routes that currently feel laggiest: `/` (home), `/search`, `/offer/$id`, `/store/$id`. Home's critical asset set = first promo banner image + first offer card images; other routes = their hero image.

## 5. Skeleton parity

Extend `src/components/Skeleton.tsx` with a `PromoBannerSkeleton` and a home-page skeleton block so the pre-ready home render matches the real layout's geometry — that's what removes the perceived jump when content swaps in.

## Technical notes

- Pure frontend/presentation change: no data-fetching, backend, or business-logic edits. Existing hooks (`useLiveDbData`, banners query) keep their current behaviour; only their loading states are consumed differently.
- Transitions use Tailwind utilities and standard React state, no new dependencies.
- `prefers-reduced-motion` disables the fades (kept via existing CSS conventions in `src/styles.css`).
