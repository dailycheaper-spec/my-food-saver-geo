// Thin runtime helpers for Capacitor native shell.
// Everything here is safe to import from browser code — Capacitor.isNativePlatform()
// returns false in a regular browser, so the code paths that open the system
// browser or listen for deep links only activate inside the packaged app.
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App, type URLOpenListenerEvent } from "@capacitor/app";

export const NATIVE_SCHEME = "ge.cheaper.app";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Open an external URL in the system browser (SFSafariViewController on iOS,
// Chrome Custom Tab on Android). Falls back to same-tab navigation on web so
// the browser flow is unchanged.
export async function openExternal(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url, presentationStyle: "fullscreen" });
    return;
  }
  window.location.href = url;
}

export async function closeExternal(): Promise<void> {
  if (isNative()) {
    try { await Browser.close(); } catch { /* already closed */ }
  }
}

// Fires when the system browser is dismissed (user taps Done / back) or closed
// programmatically. Used to recover the sign-in screen when the deep-link
// handoff never happened. No-op on web.
export async function onBrowserFinished(cb: () => void): Promise<() => void> {
  if (!isNative()) return () => {};
  const sub = await Browser.addListener("browserFinished", cb);
  return () => { void sub.remove(); };
}

// Register the single deep-link listener. The app receives
//   ge.cheaper.app://auth-callback#access_token=...&refresh_token=...
//   ge.cheaper.app://order-return?orderId=...&payment=success
// from the bounce pages hosted on cheaper.ge (see routes
// /auth/native-return and /orders/native-return).
type Handler = (event: URLOpenListenerEvent) => void;
export async function registerDeepLinkHandler(handler: Handler): Promise<() => void> {
  if (!isNative()) return () => {};
  const sub = await App.addListener("appUrlOpen", handler);
  return () => { sub.remove(); };
}

// Read the OS-level device language inside the packaged app. Some Android OEM
// WebViews report a wrong/stale navigator.language, so on native we ask the
// system directly and only fall back to the browser tags if that fails.
export async function getDeviceLanguageTags(): Promise<string[]> {
  const browserTags = () =>
    (typeof navigator === "undefined"
      ? []
      : [
          ...(Array.isArray(navigator.languages) ? navigator.languages : []),
          navigator.language,
        ]
    ).filter(Boolean) as string[];

  if (!isNative()) return browserTags();

  try {
    const { Device } = await import("@capacitor/device");
    const tags: string[] = [];
    try {
      const { value } = await Device.getLanguageTag();
      if (value) tags.push(value);
    } catch { /* older plugin versions */ }
    try {
      const { value } = await Device.getLanguageCode();
      if (value) tags.push(value);
    } catch { /* ignore */ }
    if (tags.length) return [...tags, ...browserTags()];
  } catch { /* plugin unavailable */ }

  return browserTags();
}
