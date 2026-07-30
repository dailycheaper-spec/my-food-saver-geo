import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export type LocationStatus = "idle" | "prompting" | "granted" | "denied" | "unsupported" | "error";

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

interface Ctx {
  location: UserLocation | null;
  status: LocationStatus;
  error: string | null;
  /** Show the in-app explanation dialog. */
  askPermission: () => void;
  /** Called from the explanation dialog when user consents. */
  request: () => Promise<UserLocation | null>;
  /** Dismiss dialog without prompting the browser. */
  cancel: () => void;
  /** True when the explanation modal should be visible. */
  isExplaining: boolean;
  clear: () => void;
}

const LocationContext = createContext<Ctx | null>(null);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  const L = useCallback(
    (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
      language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka,
    [language],
  );
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isExplaining, setExplaining] = useState(false);
  const inFlight = useRef<Promise<UserLocation | null> | null>(null);

  const askPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError(L(
        "თქვენი ბრაუზერი არ უჭერს მხარს მდებარეობის განსაზღვრას.",
        "Your browser does not support geolocation.",
        "Ваш браузер не поддерживает геолокацию.",
        "Tarayıcınız konum belirlemeyi desteklemiyor.",
        "مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.",
      ));
      return;
    }
    setExplaining(true);
  }, [L]);

  const cancel = useCallback(() => {
    setExplaining(false);
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    setStatus("idle");
    setError(null);
  }, []);

  const request = useCallback(async () => {
    setExplaining(false);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return null;
    }
    if (inFlight.current) return inFlight.current;
    setStatus("prompting");
    setError(null);
    const promise = new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const loc: UserLocation = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            timestamp: Date.now(),
          };
          setLocation(loc);
          setStatus("granted");
          resolve(loc);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setStatus("denied");
            setError(L(
              "მდებარეობის წვდომა უარყოფილია. შეგიძლიათ ხელახლა სცადოთ.",
              "Location access denied. You can try again.",
              "Доступ к геолокации отклонён. Можно попробовать снова.",
              "Konum erişimi reddedildi. Tekrar deneyebilirsiniz.",
              "دسترسی به موقعیت مکانی رد شد. می‌توانید دوباره تلاش کنید.",
            ));
          } else {
            setStatus("error");
            setError(L(
              "მდებარეობის განსაზღვრა ვერ მოხერხდა. სცადეთ ხელახლა.",
              "Could not determine your location. Please try again.",
              "Не удалось определить местоположение. Попробуйте снова.",
              "Konumunuz belirlenemedi. Lütfen tekrar deneyin.",
              "موقعیت شما مشخص نشد. لطفاً دوباره تلاش کنید.",
            ));
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    }).finally(() => {
      inFlight.current = null;
    });
    inFlight.current = promise;
    return promise;
  }, [L]);

  const value = useMemo<Ctx>(
    () => ({ location, status, error, askPermission, request, cancel, isExplaining, clear }),
    [location, status, error, askPermission, request, cancel, isExplaining, clear],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
      <LocationExplainModal />
    </LocationContext.Provider>
  );
}

export function useUserLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside UserLocationProvider");
  return ctx;
}

function LocationExplainModal() {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka;
  const { isExplaining, request, cancel } = useUserLocation();
  if (!isExplaining) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={cancel}
    >
      <div
        className="w-full max-w-sm bg-card rounded-3xl shadow-elevated p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-2">📍</div>
        <h3 className="font-display text-lg font-bold">
          {L("მდებარეობის ჩართვა", "Enable location", "Включить геолокацию", "Konumu aç", "فعال‌سازی موقعیت مکانی")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {L(
            "ჩართეთ მდებარეობა, რათა გაჩვენოთ თქვენთან ახლოს არსებული შეთავაზებები. თქვენი კოორდინატები არსად არ ინახება.",
            "Enable location so we can show offers near you. Your coordinates are not stored anywhere.",
            "Включите геолокацию, чтобы показать предложения рядом. Ваши координаты нигде не сохраняются.",
            "Yakınınızdaki fırsatları gösterebilmemiz için konumu açın. Koordinatlarınız hiçbir yerde saklanmaz.",
            "موقعیت مکانی را فعال کنید تا پیشنهادهای نزدیک شما را نشان دهیم. مختصات شما در هیچ جایی ذخیره نمی‌شود.",
          )}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void request()}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press"
          >
            {L("მდებარეობის ჩართვა", "Enable location", "Включить геолокацию", "Konumu aç", "فعال‌سازی موقعیت مکانی")}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="w-full h-11 rounded-2xl bg-secondary text-foreground font-semibold text-sm press"
          >
            {L("არა ახლა", "Not now", "Не сейчас", "Şimdi değil", "الان نه")}
          </button>
        </div>
      </div>
    </div>
  );
}
