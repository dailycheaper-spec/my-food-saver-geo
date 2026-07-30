import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { isNative } from "@/lib/native";

/**
 * Standard Android back-button-to-exit pattern.
 * - At the router-history root (nothing to go back to in-app): exit the app
 *   immediately, with no confirmation dialog.
 * - Anywhere else: normal in-app back navigation (router.history.back()).
 * - No effect on web or iOS.
 */
export function AndroidBackHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;
    try {
      if (Capacitor.getPlatform() !== "android") return;
    } catch {
      return;
    }

    let removed = false;
    let remove: (() => void) | null = null;

    (async () => {
      const sub = await App.addListener("backButton", async ({ canGoBack }) => {
        const atRoot = !canGoBack || router.history.length <= 1;
        if (!atRoot) {
          router.history.back();
          return;
        }
        await App.exitApp();
      });
      if (removed) {
        sub.remove();
      } else {
        remove = () => { sub.remove(); };
      }
    })();

    return () => {
      removed = true;
      if (remove) remove();
    };
  }, [router]);

  return null;
}
