## Confirmed diagnosis

The backend redirect allow-list is correct for both `https://cheaper.ge/**` and `https://www.cheaper.ge/**`, and the native scheme `ge.cheaper.app` is registered on Android and iOS.

The actual failure is routing inside the deployed app:

- `src/routes/auth.native-return.tsx` is generated as a **child route of `/auth`**.
- `src/routes/auth.tsx` does not render an `<Outlet />`, so visiting `/auth/native-return` renders the ordinary sign-in page instead of `NativeAuthReturn`.
- The live production URL confirms this: `https://cheaper.ge/auth/native-return?platform=android` currently returns the regular login screen shown in the screenshot.
- Therefore the OAuth credentials remain in the browser URL/session, while the code that forwards them to `ge.cheaper.app://auth-callback` never runs.

## Implementation plan

1. **Make the native return page a root-owned URL**
   - Rename the route using TanStack Router’s non-nested file convention so `/auth/native-return` remains the public URL but is no longer rendered through the `/auth` component.
   - Keep the OAuth `redirectTo` value on the HTTPS return URL already covered by the backend allow-list.

2. **Harden credential handoff to the installed app**
   - Preserve the complete OAuth query and hash when constructing `ge.cheaper.app://auth-callback`.
   - Retain automatic handoff plus the explicit “Open app” fallback button for browsers that block custom-scheme navigation without a user gesture.
   - Ensure OAuth errors are also forwarded so the app can show the real failure instead of a generic retry message.

3. **Make native completion race-safe**
   - Keep the app-side listener registered before session restoration.
   - On callback, exchange the authorization code or install the returned token session before closing the browser and navigating.
   - Prevent the browser-dismiss listener from showing a false failure while the deep-link callback is still being processed.
   - Clear the stored post-login redirect after successful navigation and allow a later retry URL after a failed callback.

4. **Verify the complete flow**
   - Confirm `/auth/native-return` renders only the native handoff page in both preview and production routing behavior.
   - Verify the generated OAuth authorization URL contains the HTTPS native return URL as `redirect_to`; Google’s own `redirect_uri` remains the backend callback URL.
   - Verify Android/iOS custom-scheme parsing for both hash-token and `?code=` callback forms.
   - Run targeted checks and browser route validation without changing the web Google sign-in behavior.