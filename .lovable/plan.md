# Capacitor packaging plan for Cheaper

This project is a TanStack Start SSR app built with nitro targeting Cloudflare (not a static SPA), so there is no meaningful client-only `dist/` to ship inside the binary. The whole app — routes, server functions, BOG payments, delivery dispatch, payouts, admin — must keep running on https://cheaper.ge. Capacitor will be used as a **thin native shell** that loads the live site via `server.url`, plus a tiny local `webDir` placeholder (Capacitor requires one) that only shows if the network is unreachable before the remote loads.

Everything is staged. I'll stop after each stage, show you the diff / command output, and wait for your OK before continuing.

---

## Stage 1 — Core Capacitor setup

**App ID recommendation:** `ge.cheaper.app`.
- Matches the `.ge` brand domain, is a valid reverse-DNS identifier on both stores, and stays consistent with the `cheaper.ge` origin. `com.cheaper.app` would also be fine but `ge.` reads more naturally for a Georgia-first product. Once chosen it's effectively permanent on the stores, so I'll only proceed after you confirm this ID.
- App display name: `Cheaper`.

**webDir:** create `capacitor-webdir/` with a minimal `index.html` (Cheaper logo + "იტვირთება…" message + auto-reload). This is only ever shown if `https://cheaper.ge` is unreachable at cold start; `server.url` takes over immediately once online. Using the real `.output/` from nitro would ship a Cloudflare Worker SSR bundle that can't run inside the WebView, which is why we don't point `webDir` at the build output.

**`capacitor.config.ts`:**
```ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'ge.cheaper.app',
  appName: 'Cheaper',
  webDir: 'capacitor-webdir',
  server: {
    url: 'https://cheaper.ge',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'cheaper.ge', '*.cheaper.ge',
      'creaijcvpqerdxdazdqt.supabase.co',
      'accounts.google.com',           // fallback only; OAuth actually opens externally
      'payment.bog.ge', '*.bog.ge',    // fallback only; BOG actually opens externally
    ],
  },
  ios: { contentInset: 'always' },
  android: { allowMixedContent: false },
};
export default config;
```

**Deps to add:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/browser`, `@capacitor/app`, `@capacitor/assets` (dev).

**Verification:** `npx cap init` (non-interactive with the values above) → `npx cap add android` → `npx cap add ios` → `npx cap sync`. Report the output.

---

## Stage 2 — Google Sign-In in native shell

Google refuses OAuth inside embedded WebViews. Fix by branching only when `Capacitor.isNativePlatform()`:

1. In `src/integrations/lovable/index.ts` (or a small wrapper next to it — I'll pick whichever avoids editing auto-generated files; if `index.ts` is auto-generated, I'll add `src/lib/native-oauth.ts` and route the button through it), detect native and instead of the current in-WebView flow:
   - Build the same authorize URL the Lovable auth SDK would use, but set its `redirect_uri` to a **public bounce page on cheaper.ge** (e.g. `https://cheaper.ge/auth/native-return`) that we add as a small TanStack route. That page reads the `#access_token` / `?code` from the URL and immediately redirects to `ge.cheaper.app://auth-callback?...` (custom scheme).
   - Open the authorize URL with `Browser.open({ url })` — this uses SFSafariViewController / Chrome Custom Tab, which Google accepts.
2. Register the custom scheme `ge.cheaper.app` in `AndroidManifest.xml` (`<intent-filter>` with `BROWSABLE`) and iOS `Info.plist` (`CFBundleURLTypes`).
3. In `src/routes/__root.tsx`, add a `useEffect` that, when native, subscribes to `App.addListener('appUrlOpen', …)`, parses the returning URL, calls `supabase.auth.setSession()` (mirroring what `lovable.signInWithOAuth` does today), calls `Browser.close()`, and navigates to the intended post-login route.
4. Web path is untouched — the existing `lovable.auth.signInWithOAuth` continues to work in the browser.

The same `appUrlOpen` listener + custom scheme is reused for Stage 3, so there is only one deep-link handler.

**Verification I can do here:** typecheck + build. Actual OAuth round-trip needs a real emulator/device and you toggling to your own Google credentials — I'll flag this explicitly.

---

## Stage 3 — BOG payment redirect in native shell

`startBogCheckout` returns `{ redirectUrl }` and the client currently does `window.location.href = redirectUrl`. Change **only that client-side redirect** (in `src/routes/offer.$id.tsx` and the Google Pay path in `GooglePayButton.tsx` / wherever it navigates) so that when native:

1. Server-side: extend `getPublicOrigin()` / the `redirect_urls` in `bog.functions.ts` to accept an optional `returnBase` from the caller. When native, the client passes `returnBase = "https://cheaper.ge/orders/{id}/native-return"` — a small public route that, exactly like Stage 2, immediately 302s to `ge.cheaper.app://order-return?orderId=…&payment=success|failed|processing`.
2. Client: `await Browser.open({ url: redirectUrl })` instead of `window.location.href`.
3. The single `appUrlOpen` listener from Stage 2 handles `order-return` too — closes the in-app browser tab and navigates to `/orders/$id?payment=…`. Success, failure, and user-cancel (Browser dismiss event) all resolve back into the app.

Server-to-server BOG callback (`/api/public/payments/bog-callback`) is unaffected — that's a webhook, not a redirect.

**Verification I can do here:** typecheck + build. Actual BOG round-trip requires a real card / emulator and BOG sandbox — flagged.

---

## Stage 4 — Native permissions

- **iOS `Info.plist`** (bilingual, specific):
  - `NSCameraUsageDescription` = "Cheaper იყენებს კამერას QR კოდის სკანირებისთვის და შეთავაზების/ლოგოს/პროფილის ფოტოს გადასაღებად. / Cheaper uses the camera to scan pickup QR codes and to capture offer, store logo, and profile photos."
  - `NSPhotoLibraryUsageDescription` (needed alongside camera for save/attach flows) with matching bilingual text.
  - `NSLocationWhenInUseUsageDescription` = "Cheaper იყენებს მდებარეობას რუკაზე ახლომდებარე ფასდაკლებული შეთავაზებების საჩვენებლად. / Cheaper uses your location to show nearby discounted offers on the map."
- **Android `AndroidManifest.xml`:** `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, plus `INTERNET` (default) and the custom-scheme intent filter from Stage 2.

**Existing code compatibility (answer to your explicit question):**
- **Geolocation** (`use-user-location.tsx`, `StoreLocationPicker.tsx`): uses `navigator.geolocation`, which works in both iOS WKWebView and Android WebView as long as the OS permission strings above are present and iOS granted. **No code change needed**, only the manifests.
- **QR scanner** (`partner.scan.tsx`): uses `getUserMedia` / `<video>`. Works in iOS WKWebView from iOS 14.3+ and modern Android WebViews **only if** the WebView is served over HTTPS (it is — `server.url` is https) and iOS Info.plist has `NSCameraUsageDescription`. **No code change strictly needed**, but for reliability I recommend adding `@capacitor/camera` as a fallback in a follow-up if you hit issues on older Androids — I will NOT add it in this pass since you asked to keep the change surface tight.
- **Offer/logo/avatar photo capture**: same `getUserMedia` / `<input type="file" capture>` story — works as-is with manifest permissions.

I'll call out any device-specific issue if verification surfaces one.

---

## Stage 5 — Icons and splash

`npx capacitor-assets generate --iconBackgroundColor '#3d7a4a' --splashBackgroundColor '#3d7a4a' --assetPath public/brand-icon-1024.png` — generates every required Android + iOS icon and splash size from the existing logo. No new artwork.

---

## Verification & handoff

Before I hand back, I will:
- Run `bun run build` and `npx cap sync` and paste the output.
- Give you exact local run commands:
  - Android: `npx cap open android` → run from Android Studio (or `npx cap run android`).
  - iOS: `npx cap open ios` → run from Xcode (or `npx cap run ios`; requires macOS + CocoaPods installed, `cd ios/App && pod install` on first setup).
- Provide a per-stage changelog of every created/changed file, one sentence each.
- **Explicitly flag things I cannot verify from the sandbox:**
  - Google OAuth round-trip on a real device (needs Play Services / signed-in Google account).
  - BOG payment full round-trip (needs real card + your BOG merchant environment).
  - iOS build/codesign (requires macOS + Xcode + Apple Developer account).
  - Android Play Services quirks on older API levels.
  - Camera behavior on individual Android OEM WebViews.

## Technical notes

- We deliberately do **not** ship the nitro build output as `webDir`; it's a Worker SSR bundle, not a static site. The tiny placeholder `capacitor-webdir/index.html` exists only to satisfy Capacitor's requirement and to show a friendly offline message.
- `server.url` locks the app to the live origin — every server function, RLS check, cron, and webhook keeps running exactly where it does today.
- The single deep-link scheme `ge.cheaper.app://` handles both auth return and payment return via one `appUrlOpen` listener in `__root.tsx`.
- No changes to auto-generated Supabase files, and no changes to the web sign-in path.

**Please confirm the `ge.cheaper.app` App ID (or give an alternative) before I start Stage 1** — this is the one value that's costly to change later.
