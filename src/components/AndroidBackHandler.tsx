import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { isNative } from "@/lib/native";
import { useI18n } from "@/lib/i18n";

/**
 * Standard Android back-button-to-exit pattern.
 * - At the router-history root (nothing to go back to in-app): show a native
 *   confirm dialog; OK → App.exitApp(), Cancel → stay.
 * - Anywhere else: normal in-app back navigation (router.history.back()).
 * - No effect on web or iOS.
 */
export function AndroidBackHandler() {
  const router = useRouter();
  const { t } = useI18n();

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
        const { value } = await Dialog.confirm({
          title: t("exitApp.title"),
          message: t("exitApp.message"),
          okButtonTitle: t("exitApp.ok"),
          cancelButtonTitle: t("cancel"),
        });
        if (value) {
          await App.exitApp();
        }
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
  }, [router, t]);

  return null;
}
