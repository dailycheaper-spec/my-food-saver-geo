import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { APP_BUILD_ID } from "@/lib/build-id";
import { useI18n } from "@/lib/i18n";

const POLL_MS = 5 * 60 * 1000; // background check every 5 minutes
const MIN_GAP_MS = 60 * 1000; // never check more often than once a minute

async function fetchBuildId(): Promise<string | null> {
  try {
    const res = await fetch("/api/public/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return typeof data.buildId === "string" ? data.buildId : null;
  } catch {
    return null;
  }
}

/**
 * Lightweight "new version available" prompt.
 *
 * Compares the build id baked into this bundle with the one served by
 * /api/public/version. When they differ a small banner offers a reload, which
 * also activates any waiting service worker and drops the cached HTML so the
 * PWA / native WebView really picks up the new build.
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const [available, setAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);
  const lastCheck = useRef(0);
  const dismissed = useRef(false);

  const check = useCallback(async () => {
    if (dismissed.current || available) return;
    const now = Date.now();
    if (now - lastCheck.current < MIN_GAP_MS) return;
    lastCheck.current = now;

    const latest = await fetchBuildId();
    if (!latest || latest === APP_BUILD_ID) return;

    // Let the service worker fetch the new assets before we offer the reload.
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((regs ?? []).map((r) => r.update().catch(() => undefined)));
    } catch {
      /* noop */
    }
    setAvailable(true);
  }, [available]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!import.meta.env.PROD) return; // dev/preview reloads on its own

    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // First check shortly after boot, not during hydration.
    const boot = window.setTimeout(() => void check(), 15_000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(boot);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [check]);

  const reload = async () => {
    setReloading(true);
    try {
      await caches?.delete?.("cheaper-html");
    } catch {
      /* noop */
    }
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
      const waiting = regs.find((r) => r.waiting)?.waiting;
      if (waiting) {
        // register-sw.ts reloads the page on controllerchange.
        waiting.postMessage({ type: "SKIP_WAITING" });
        window.setTimeout(() => window.location.reload(), 1500);
        return;
      }
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  if (!available) return null;

  const title = t("system.update.title");
  const body = t("system.update.body");
  const action = t("system.update.action");
  const later = t("system.update.later");

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+84px)] animate-fade-in"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-elevated backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{body}</p>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={reloading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 min-h-11 text-sm font-semibold text-primary-foreground press disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} aria-hidden="true" />
          {action}
        </button>
        <button
          type="button"
          aria-label={later}
          onClick={() => {
            dismissed.current = true;
            setAvailable(false);
          }}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground press"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
