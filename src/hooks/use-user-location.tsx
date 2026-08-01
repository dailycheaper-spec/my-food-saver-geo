import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/lib/i18n";

/**
 * `locating` = a position request is in flight (browser prompt may or may not be shown).
 * `prompting` = kept for backwards compatibility with existing callers; treated as "in flight".
 */
export type LocationStatus =
  | "idle"
  | "prompting"
  | "locating"
  | "granted"
  | "denied"
  | "unsupported"
  | "unavailable"
  | "timeout"
  | "error";

export type PermissionState = "unknown" | "granted" | "prompt" | "denied";

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
  /** Browser-reported permission state (probed via the Permissions API when available). */
  permission: PermissionState;
  /** True while a geolocation request is in flight. */
  isLocating: boolean;
  /** True when `location` came from cache and has not been refreshed this session. */
  isStale: boolean;
  /** GPS accuracy in metres, when known. */
  accuracy: number | null;
  /** When the current position was captured. */
  lastUpdatedAt: number | null;
  /** True when accuracy is too coarse to trust for a delivery pin. */
  isLowAccuracy: boolean;
  /**
   * Ask for the location. Shows the in-app explanation dialog only when the
   * browser has not granted permission yet; otherwise fetches silently.
   */
  askPermission: () => void;
  /** Fetch the position now (used by the explanation dialog and retry buttons). */
  request: () => Promise<UserLocation | null>;
  /** Force a fresh reading, ignoring the cache. */
  refresh: () => Promise<UserLocation | null>;
  /** Dismiss dialog without prompting the browser. */
  cancel: () => void;
  /** True when the explanation modal should be visible. */
  isExplaining: boolean;
  clear: () => void;
}

const LocationContext = createContext<Ctx | null>(null);

const CACHE_KEY = "cheaper:last-location";
/** A cached fix older than this is refreshed in the background. */
const FRESH_MS = 5 * 60 * 1000;
/** Never fire two browser requests closer together than this. */
const MIN_REQUEST_GAP_MS = 10 * 1000;
/** Above this accuracy (metres) we ask the user to confirm the pin manually. */
export const LOW_ACCURACY_M = 100;

function readCache(): UserLocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as UserLocation;
    if (!Number.isFinite(p?.lat) || !Number.isFinite(p?.lng)) return null;
    return p;
  } catch {
    return null;
  }
}

function writeCache(loc: UserLocation | null) {
  try {
    if (loc) localStorage.setItem(CACHE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const { language, t } = useI18n();
  const L = useCallback(
    (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
      language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka,
    [language],
  );
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [isExplaining, setExplaining] = useState(false);
  const [isStale, setStale] = useState(false);
  const inFlight = useRef<Promise<UserLocation | null> | null>(null);
  const lastRequestAt = useRef(0);

  const supported = typeof navigator !== "undefined" && !!navigator.geolocation;

  const runGeolocation = useCallback(
    (opts: { force?: boolean } = {}) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStatus("unsupported");
        return Promise.resolve(null);
      }
      if (inFlight.current) return inFlight.current;
      const now = Date.now();
      if (!opts.force && now - lastRequestAt.current < MIN_REQUEST_GAP_MS) {
        return Promise.resolve(location);
      }
      lastRequestAt.current = now;
      setStatus("locating");
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
            writeCache(loc);
            setStale(false);
            setPermission("granted");
            setStatus("granted");
            resolve(loc);
          },
          (err) => {
            // Keep any cached position visible — a failed refresh should never
            // wipe a perfectly usable last-known location.
            const cached = readCache();
            if (err.code === err.PERMISSION_DENIED) {
              setPermission("denied");
              setStatus("denied");
              setError(
                t("location.deniedHint"),
              );
            } else if (err.code === err.TIMEOUT) {
              setStatus("timeout");
              setError(
                t("location.timeoutHint"),
              );
            } else {
              setStatus("unavailable");
              setError(
                t("location.unavailableHint"),
              );
            }
            if (cached) {
              setLocation((prev) => prev ?? cached);
              setStale(true);
            }
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: opts.force ? 0 : 60000 },
        );
      }).finally(() => {
        inFlight.current = null;
      });
      inFlight.current = promise;
      return promise;
    },
    [L, location],
  );

  // Hydrate from cache + probe the permission state once, then auto-fetch when
  // the device has already granted access (no modal, no second prompt).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = readCache();
    if (cached) {
      setLocation(cached);
      setStale(Date.now() - cached.timestamp > FRESH_MS);
    }
    if (!navigator.geolocation) {
      setPermission("denied");
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    let permStatus: PermissionStatus | null = null;

    const applyState = (state: PermissionState) => {
      if (cancelled) return;
      setPermission(state);
      if (state === "granted") {
        const fresh = cached && Date.now() - cached.timestamp <= FRESH_MS;
        if (!fresh) void runGeolocation();
        else setStatus("granted");
      } else if (state === "denied") {
        setStatus("denied");
      }
    };

    const probe = async () => {
      const perms = navigator.permissions;
      if (!perms?.query) {
        // Safari <16 and some in-app webviews: assume "prompt" and stay silent
        // until a feature explicitly asks for the location.
        setPermission("unknown");
        return;
      }
      try {
        permStatus = await perms.query({ name: "geolocation" as PermissionName });
        applyState(permStatus.state as PermissionState);
        permStatus.onchange = () => {
          if (permStatus) applyState(permStatus.state as PermissionState);
        };
      } catch {
        setPermission("unknown");
      }
    };
    void probe();

    return () => {
      cancelled = true;
      if (permStatus) permStatus.onchange = null;
    };
    // Intentionally runs once: runGeolocation is stable enough for the initial probe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askPermission = useCallback(() => {
    if (!supported) {
      setStatus("unsupported");
      setError(
        t("location.unsupported"),
      );
      return;
    }
    // Already allowed (or previously refused) — no point re-explaining, just try.
    if (permission === "granted" || permission === "denied") {
      void runGeolocation({ force: true });
      return;
    }
    setExplaining(true);
  }, [L, permission, runGeolocation, supported]);

  const cancel = useCallback(() => setExplaining(false), []);

  const clear = useCallback(() => {
    setLocation(null);
    writeCache(null);
    setStatus("idle");
    setStale(false);
    setError(null);
  }, []);

  const request = useCallback(async () => {
    setExplaining(false);
    return runGeolocation();
  }, [runGeolocation]);

  const refresh = useCallback(async () => {
    setExplaining(false);
    return runGeolocation({ force: true });
  }, [runGeolocation]);

  const value = useMemo<Ctx>(
    () => ({
      location,
      status,
      error,
      permission,
      isLocating: status === "locating" || status === "prompting",
      isStale,
      accuracy: location?.accuracy ?? null,
      lastUpdatedAt: location?.timestamp ?? null,
      isLowAccuracy: location?.accuracy != null && location.accuracy > LOW_ACCURACY_M,
      askPermission,
      request,
      refresh,
      cancel,
      isExplaining,
      clear,
    }),
    [location, status, error, permission, isStale, askPermission, request, refresh, cancel, isExplaining, clear],
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
  const { language, t } = useI18n();
  const L = (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka;
  const { isExplaining, request, cancel, isLocating } = useUserLocation();
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
          {t("location.enableTitle")}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("location.enableExplain")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={isLocating}
            onClick={() => void request()}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60"
          >
            {isLocating
              ? t("address.locating")
              : t("location.enableTitle")}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="w-full h-11 rounded-2xl bg-secondary text-foreground font-semibold text-sm press"
          >
            {t("location.notNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
