import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * iOS-style edge swipe-back for the native (Capacitor) shell.
 *
 * WKWebView's own back/forward gesture does not drive SPA history reliably, so
 * we implement the interaction: a drag that starts within EDGE px of the
 * leading edge translates the page with the finger and, past the commit
 * threshold (or on a fast flick), pops the router history.
 *
 * No-op on the web, on Android, and inside horizontally scrollable regions.
 */
const EDGE = 24;
const COMMIT_RATIO = 0.25;
const FLICK_VELOCITY = 0.5; // px per ms

export function IosSwipeBack() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled) return;
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

      const surface = document.getElementById("content");
      if (!surface) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let startX = 0;
      let startY = 0;
      let startTime = 0;
      let dragging = false;
      let armed = false;

      const isRtl = () => document.documentElement.dir === "rtl";

      const inScrollableRow = (target: EventTarget | null) =>
        target instanceof Element &&
        !!target.closest(".scroll-row, .horizontal-scroll, .scrollbar-hide, .leaflet-container");

      const setTransform = (dx: number) => {
        if (reduceMotion) return;
        surface.style.transform = dx ? `translateX(${dx}px)` : "";
        surface.style.transition = "";
      };

      const release = (commit: boolean) => {
        if (!reduceMotion) {
          surface.style.transition = "transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1)";
          surface.style.transform = "";
          window.setTimeout(() => {
            surface.style.transition = "";
          }, 240);
        }
        dragging = false;
        armed = false;
        if (commit) router.history.back();
      };

      const onStart = (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const fromLeadingEdge = isRtl()
          ? t.clientX >= window.innerWidth - EDGE
          : t.clientX <= EDGE;
        if (!fromLeadingEdge) return;
        if (inScrollableRow(e.target)) return;
        if (router.history.length <= 1) return;
        armed = true;
        dragging = false;
        startX = t.clientX;
        startY = t.clientY;
        startTime = e.timeStamp;
      };

      const onMove = (e: TouchEvent) => {
        if (!armed) return;
        const t = e.touches[0];
        const dxRaw = t.clientX - startX;
        const dx = isRtl() ? -dxRaw : dxRaw;
        const dy = t.clientY - startY;

        if (!dragging) {
          // Let a mostly-vertical gesture fall through to normal scrolling.
          if (Math.abs(dy) > Math.abs(dx)) {
            armed = false;
            return;
          }
          if (dx < 8) return;
          dragging = true;
        }
        if (dx <= 0) {
          setTransform(0);
          return;
        }
        e.preventDefault();
        setTransform(isRtl() ? -dx : dx);
      };

      const onEnd = (e: TouchEvent) => {
        if (!armed) return;
        if (!dragging) {
          armed = false;
          return;
        }
        const t = e.changedTouches[0];
        const dxRaw = t.clientX - startX;
        const dx = isRtl() ? -dxRaw : dxRaw;
        const elapsed = Math.max(1, e.timeStamp - startTime);
        const commit = dx > window.innerWidth * COMMIT_RATIO || dx / elapsed > FLICK_VELOCITY;
        release(commit);
      };

      const onCancel = () => {
        if (armed && dragging) release(false);
        armed = false;
        dragging = false;
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
  }, [router]);

  return null;
}
