## Android back-to-exit confirmation

Implement the standard Android pattern: press back at root → native confirm dialog → OK exits app; anywhere else → normal in-app back navigation. No effect on web or iOS.

### Files

1. **`package.json`** — add `@capacitor/dialog` (^8.x). Runs `bun add`.

2. **`src/lib/i18n.tsx`** — add three keys in `ka`, `en`, `ru` blocks:
   - `exitApp.title` → "Cheaper-ის დახურვა" / "Close Cheaper" / "Закрыть Cheaper"
   - `exitApp.message` → "დარწმუნებული ხართ, რომ გსურთ გასვლა?" / "Are you sure you want to exit?" / "Вы уверены, что хотите выйти?"
   - `exitApp.ok` → "კი" / "Yes" / "Да"
   - (reuse existing `cancel` key for the Cancel button)

3. **`src/components/AndroidBackHandler.tsx`** (new) — client component, returns `null`. On mount:
   - Guard: `if (!isNative() || Capacitor.getPlatform() !== "android") return;`
   - `App.addListener("backButton", async ({ canGoBack }) => { ... })`.
   - Determine "at root" by combining Capacitor's `canGoBack` flag with `router.history.length <= 1` (via `useRouter()` from `@tanstack/react-router`) — this uses the router's history state, not the URL, so a user who navigated to `/` from elsewhere still has back-history and gets normal back nav.
   - If at root: `Dialog.confirm({ title: t("exitApp.title"), message: t("exitApp.message"), okButtonTitle: t("exitApp.ok"), cancelButtonTitle: t("cancel") })`. On `{ value: true }` → `App.exitApp()`. On cancel → no-op.
   - If not at root: `router.history.back()`.
   - Cleanup: `sub.remove()` in effect return.

4. **`src/routes/__root.tsx`** — mount `<AndroidBackHandler />` once inside the providers tree (below `I18nProvider`, alongside `AppTracker`), so `useI18n()` and `useRouter()` are available. No other changes.

### Verification
- `bun run build` and `tsgo` — zero errors.
- Web/iOS: listener never registers; behavior unchanged.
- Android APK: back at `/` → native AlertDialog with Georgian text (or current language), Cancel closes it, OK calls `App.exitApp()`. Back on any inner route → normal back navigation.
