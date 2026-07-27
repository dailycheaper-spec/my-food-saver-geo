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
