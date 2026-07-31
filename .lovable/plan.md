## What's wrong now

The app icons, favicon, splash screens and Android/iOS assets already use the green-background version. But the in-app logo (`src/components/Logo.tsx`) still renders two separate transparent PNGs — a **green mark on the page's white background** (`/logo-mark.png` + `/logo-wordmark.png`). That's what you see in the header, footer and auth page, and it doesn't match the attached official logo.

Confirmed usages of that component: homepage header (`src/routes/index.tsx:235`), homepage footer (`:615`), and the auth page (`src/routes/auth.tsx:199`). The admin sidebar renders `/logo-mark.png` directly.

## The fix

1. **Generate one official lockup tile** from the approved image: a rounded green (`#0C6E14`) plate with the white "C + discount tag" mark and white "Cheaper" wordmark, exact proportions from the source file — no redrawing, no font substitution.
   - `public/logo-tile.png` — square green tile with just the white mark (for compact/narrow spots and the admin sidebar).
   - `public/logo-lockup.png` — horizontal green plate with white mark + wordmark (header, footer, auth).

2. **Rewrite `src/components/Logo.tsx`** to render a single official asset instead of composing two transparent images:
   - default: the horizontal green lockup;
   - `compact`: the square green tile;
   - the `variant` prop collapses to one behaviour — the logo always carries its own green background, so it looks identical on white and dark surfaces (rule respected: never a green mark on a dark background).
   - Tagline text under the lockup stays available via `showTagline` for the footer.

3. **Update the admin sidebar** (`src/routes/_authenticated/admin.tsx`) to use the same green tile.

4. **Delete the now-unused split assets** — `public/logo-mark.png`, `logo-mark-white.png`, `logo-wordmark.png`, `logo-wordmark-white.png` — so only the one official logo family remains.

5. **Verify visually** with a browser screenshot of the homepage header/footer and the auth page, plus a dark-surface check, so the rendered logo matches the attached image exactly.

No colour tokens change — the official green `#0C6E14` is already the primary brand colour across the project.
