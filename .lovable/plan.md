## What's happening

On native, sign-in opens the Google page in a system browser tab (Chrome Custom Tab / Safari view). Google returns to the backend, which redirects to the bounce page `https://cheaper.ge/auth/native-return`. That page tries to jump to `ge.cheaper.app://auth-callback...` with an automatic `window.location.replace()`.

Two failure points, both confirmed by reading the code:

1. **Automatic scheme jump is often blocked.** Chrome Custom Tab and Safari view controller suppress automatic (non-user-initiated) navigations to a custom app scheme. When suppressed, the tab simply stays open — and because that tab is a real browser session on cheaper.ge, it ends up signed in while the app does not. This matches exactly what you're seeing.
2. **Only one token format is handled.** The deep-link handler in the app root only accepts `access_token` + `refresh_token`. If the backend returns an authorization `code` instead, the handler silently does nothing and the app stays signed out.

## The fix

**1. Make the bounce page reliably hand off to the app**
- Trigger the app-scheme jump via a synthetic anchor click immediately on load (survives more browser restrictions than `location.replace`), and retry once shortly after.
- Always render a large, prominent "Open the app" button so there is a real user gesture path when auto-handoff is blocked — instead of today's small text link.
- Show a short status ("returning to the app…") and, after a couple of seconds without success, switch the copy to instruct tapping the button. Georgian/EN/RU/TR/FA strings added to i18n.

**2. Accept both return formats in the app**
- In the deep-link handler: keep the token path, and add handling for a `code` parameter by exchanging it for a session; if neither is present or the exchange fails, surface a clear error toast instead of failing silently.
- After a successful session set, close the external browser, then navigate to the saved redirect target.

**3. Recover when the handoff still doesn't fire**
- When the system browser is dismissed (user taps Done/back) without a deep link having arrived, re-check the session once and, if still signed out, clear the loading spinner on the sign-in screen and show a retry message — today the spinner stays forever.

**4. Sign out the browser tab side effect**
- The bounce page will not leave a signed-in web session lingering: it hands off and closes, so the stray "browser is signed in, app isn't" state disappears.

## Technical notes

- Files: `src/routes/auth.native-return.tsx` (handoff logic + button), `src/routes/__root.tsx` (deep-link handler: code exchange, error surfacing), `src/routes/auth.tsx` (browser-dismissed recovery, spinner reset), `src/lib/native.ts` (listen for browser-finished event), plus i18n strings.
- No database, auth-provider, or OAuth-client configuration changes are needed; the Google client and redirect URIs stay as they are.
- Android manifest already declares the `ge.cheaper.app` scheme filter, so no native project changes.
