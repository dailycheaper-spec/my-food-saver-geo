import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa/register-sw";
import { useI18n } from "@/lib/i18n";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const IOS_HINT_KEY = "cheaper.iosInstallHintDismissed";
const ANDROID_HINT_KEY = "cheaper.androidInstallDismissed";

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

const COPY = {
  ka: {
    install: "აპლიკაციის ინსტალაცია",
    installNow: "დაინსტალირება",
    later: "მოგვიანებით",
    iosTitle: "დაამატე Cheaper მთავარ ეკრანზე",
    iosBody: 'დააჭირე გაზიარებას ⬆︎ Safari-ში და აირჩიე "მთავარ ეკრანზე დამატება".',
    updateTitle: "ხელმისაწვდომია განახლება",
    updateBody: "ახალი ვერსია მზადაა.",
    reload: "განახლება",
    dismiss: "დახურვა",
  },
  en: {
    install: "Install App",
    installNow: "Install",
    later: "Later",
    iosTitle: "Add Cheaper to your Home Screen",
    iosBody: 'Tap the Share icon ⬆︎ in Safari, then choose "Add to Home Screen".',
    updateTitle: "Update available",
    updateBody: "A new version is ready.",
    reload: "Reload",
    dismiss: "Dismiss",
  },
  ru: {
    install: "Установить приложение",
    installNow: "Установить",
    later: "Позже",
    iosTitle: "Добавьте Cheaper на главный экран",
    iosBody: 'Нажмите «Поделиться» ⬆︎ в Safari и выберите «На экран «Домой»».',
    updateTitle: "Доступно обновление",
    updateBody: "Новая версия готова.",
    reload: "Обновить",
    dismiss: "Закрыть",
  },
};

export function PwaInstall() {
  const { lang } = useI18n();
  const t = COPY[(lang as keyof typeof COPY) ?? "ka"] ?? COPY.ka;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [update, setUpdate] = useState<null | (() => void)>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    if (isIosSafari() && !localStorage.getItem(IOS_HINT_KEY)) {
      const t = setTimeout(() => setShowIos(true), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  useEffect(() => {
    registerServiceWorker((reload) => setUpdate(() => reload));
  }, []);

  const doInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  };

  const dismissAndroid = () => {
    localStorage.setItem(ANDROID_HINT_KEY, "1");
    setDeferred(null);
  };
  const dismissIos = () => {
    localStorage.setItem(IOS_HINT_KEY, "1");
    setShowIos(false);
  };

  const showAndroid =
    deferred &&
    typeof window !== "undefined" &&
    !localStorage.getItem(ANDROID_HINT_KEY);

  return (
    <>
      {update && (
        <div className="fixed left-1/2 top-3 z-[100] -translate-x-1/2 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg flex items-center gap-3 max-w-[92vw]">
          <div className="text-sm">
            <div className="font-semibold">{t.updateTitle}</div>
            <div className="opacity-90">{t.updateBody}</div>
          </div>
          <button
            onClick={() => update()}
            className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            {t.reload}
          </button>
        </div>
      )}

      {showAndroid && (
        <div className="fixed inset-x-3 bottom-20 z-[90] rounded-2xl border border-border bg-card p-4 shadow-xl flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">{t.install}</div>
            <div className="text-muted-foreground text-xs">Cheaper</div>
          </div>
          <button
            onClick={dismissAndroid}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground"
          >
            {t.later}
          </button>
          <button
            onClick={doInstall}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {t.installNow}
          </button>
        </div>
      )}

      {showIos && (
        <div className="fixed inset-x-3 bottom-20 z-[90] rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">{t.iosTitle}</div>
              <div className="mt-1 text-muted-foreground text-xs leading-relaxed">
                {t.iosBody}
              </div>
            </div>
            <button
              onClick={dismissIos}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground"
            >
              {t.dismiss}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
