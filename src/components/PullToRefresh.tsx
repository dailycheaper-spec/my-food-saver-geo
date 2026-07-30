import { useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

/**
 * Pull-to-refresh for the mobile app shell.
 *
 * A downward drag that starts at the very top of the page rubber-bands the
 * page and, past the commit threshold, re-runs route loaders and refetches
 * active queries. Enabled in the native Capacitor shell and in installed
 * (standalone) PWAs only — desktop and normal browser tabs are untouched.
 */
const THRESHOLD = 70;
const MAX_PULL = 90;
const DAMPING = 0.5;
const MIN_SPINNER_MS = 450;

export function PullToRefresh() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      let enabled = false;
      try {
        const { Capacitor } = await import("@capacitor/core");
        enabled = Capacitor.isNativePlatform();
      } catch {
        enabled = false;
      }
      if (!enabled) {
        enabled =
          typeof window !== "undefined" &&
          (window.matchMedia("(display-mode: standalone)").matches ||
            // iOS Safari home-screen apps
            (window.navigator as unknown as { standalone?: boolean }).standalone === true);
      }
      if (cancelled || !enabled) return;

      const surface = document.getElementById("content");
      if (!surface) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let startX = 0;
      let startY = 0;
      let armed = false;
      let dragging = false;

      const blocked = (target: EventTarget | null) =>
        target instanceof Element &&
        !!target.closest(
          ".scroll-row, .horizontal-scroll, .scrollbar-hide, .leaflet-container, [role='dialog']",
        );

      const setTranslate = (dy: number) => {
        if (reduceMotion) return;
        surface.style.transform = dy ? `translateY(${dy}px)` : "";
        surface.style.transition = "";
      };

      const springBack = () => {
        if (reduceMotion) return;
        surface.style.transition = "transform 260ms cubic-bezier(0.2, 0.7, 0.2, 1)";
        surface.style.transform = "";
        window.setTimeout(() => {
          surface.style.transition = "";
        }, 280);
      };

      const runRefresh = async () => {
        if (refreshingRef.current) return;
        refreshingRef.current = true;
        setRefreshing(true);
        const started = Date.now();
        try {
          await Promise.all([
            router.invalidate(),
            (async () => {
              await queryClient.invalidateQueries();
              await queryClient.refetchQueries({ type: "active" });
            })(),
          ]);
        } catch {
          /* refresh failures surface through the existing query error states */
        }
        const remaining = MIN_SPINNER_MS - (Date.now() - started);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
        refreshingRef.current = false;
        setRefreshing(false);
        setPull(0);
        springBack();
      };

      const onStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        if (refreshingRef.current) return;
        if (window.scrollY > 0) return;
        if (blocked(e.target)) return;
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        armed = true;
        dragging = false;
      };

      const onMove = (e: TouchEvent) => {
        if (!armed) return;
        const t = e.touches[0];
        const dy = t.clientY - startY;
        const dx = t.clientX - startX;

        if (!dragging) {
          // Horizontal or upward gestures fall through to scrolling / swipe-back.
          if (Math.abs(dx) > Math.abs(dy) || dy < 8) {
            armed = false;
            return;
          }
          dragging = true;
        }
        if (dy <= 0 || window.scrollY > 0) {
          armed = false;
          dragging = false;
          setPull(0);
          springBack();
          return;
        }
        e.preventDefault();
        const damped = Math.min(MAX_PULL, dy * DAMPING);
        setPull(damped);
        setTranslate(damped);
      };

      const onEnd = () => {
        if (!armed) return;
        const committed = dragging && pullRef.current >= THRESHOLD;
        armed = false;
        dragging = false;
        if (committed) {
          setTranslate(THRESHOLD);
          void runRefresh();
        } else {
          setPull(0);
          springBack();
        }
      };

      const onCancel = () => {
        armed = false;
        dragging = false;
        setPull(0);
        springBack();
      };

      surface.addEventListener("touchstart", onStart, { passive: true });
      surface.addEventListener("touchmove", onMove, { passive: false });
      surface.addEventListener("touchend", onEnd, { passive: true });
      surface.addEventListener("touchcancel", onCancel, { passive: true });

      cleanup = () => {
        surface.removeEventListener("touchstart", onStart);
        surface.removeEventListener("touchmove", onMove);
        surface.removeEventListener("touchend", onEnd);
        surface.removeEventListener("touchcancel", onCancel);
        surface.style.transform = "";
        surface.style.transition = "";
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [router, queryClient]);

  // Keep the latest pull distance readable from the (stable) listener closure.
  const pullRef = useRef(0);
  pullRef.current = pull;

  const visible = pull > 4 || refreshing;
  if (!visible) return null;

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      aria-hidden={!refreshing}
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      <div
        className="grid h-10 w-10 place-items-center rounded-full bg-card shadow-soft"
        style={{
          opacity: refreshing ? 1 : progress,
          transform: `translateY(${refreshing ? THRESHOLD * 0.5 : pull * 0.5}px) scale(${0.7 + progress * 0.3})`,
        }}
      >
        <RefreshCw
          className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
}
