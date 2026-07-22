import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

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
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isExplaining, setExplaining] = useState(false);
  const inFlight = useRef<Promise<UserLocation | null> | null>(null);

  const askPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("თქვენი ბრაუზერი არ უჭერს მხარს მდებარეობის განსაზღვრას.");
      return;
    }
    setExplaining(true);
  }, []);

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
            setError("მდებარეობის წვდომა უარყოფილია. შეგიძლიათ ხელახლა სცადოთ.");
          } else {
            setStatus("error");
            setError("მდებარეობის განსაზღვრა ვერ მოხერხდა. სცადეთ ხელახლა.");
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
  }, []);

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
        <h3 className="font-display text-lg font-bold">მდებარეობის ჩართვა</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          ჩართეთ მდებარეობა, რათა გაჩვენოთ თქვენთან ახლოს არსებული შეთავაზებები.
          თქვენი კოორდინატები არსად არ ინახება.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void request()}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press"
          >
            მდებარეობის ჩართვა
          </button>
          <button
            type="button"
            onClick={cancel}
            className="w-full h-11 rounded-2xl bg-secondary text-foreground font-semibold text-sm press"
          >
            არა ახლა
          </button>
        </div>
      </div>
    </div>
  );
}
