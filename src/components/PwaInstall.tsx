import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";
import { useI18n } from "@/lib/i18n";

const IOS_HINT_KEY = "cheaper.iosInstallHintDismissed";
function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PwaInstall() {
  const { t } = useI18n();
  const [showIos, setShowIos] = useState(false);
  const [update, setUpdate] = useState<null | (() => void)>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (isIosSafari() && !localStorage.getItem(IOS_HINT_KEY)) {
      const timer = setTimeout(() => setShowIos(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    registerServiceWorker((reload) => setUpdate(() => reload));
  }, []);

  const dismissIos = () => {
    localStorage.setItem(IOS_HINT_KEY, "1");
    setShowIos(false);
  };


  return (
    <>
      {update && (
        <div className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg flex items-center gap-3 max-w-[92vw]">
          <div className="text-sm">
            <div className="font-semibold">{t("system.pwa.updateTitle")}</div>
            <div className="opacity-90">{t("system.pwa.updateBody")}</div>
          </div>
          <button
            onClick={() => update()}
            className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            {t("system.pwa.reload")}
          </button>
        </div>
      )}

      {showIos && (
        <div className="fixed inset-x-3 bottom-20 z-[90] rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">{t("system.pwa.iosTitle")}</div>
              <div className="mt-1 text-muted-foreground text-xs leading-relaxed">
                {t("system.pwa.iosBody")}
              </div>
            </div>
            <button
              onClick={dismissIos}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground"
            >
              {t("system.pwa.dismiss")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
