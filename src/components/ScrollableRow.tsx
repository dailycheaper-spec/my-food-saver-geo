import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontally scrolling row with smooth click-drag (mouse) and release momentum.
 *
 * - Pointer moves are coalesced into a single rAF write per frame (no jitter).
 * - On release the row glides with exponential decay, clamped at both edges.
 * - Touch / pen keep native scrolling (native momentum is better than ours).
 * - Respects `prefers-reduced-motion` by skipping the glide.
 */
export function ScrollableRow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ canPrev: false, canNext: false });

  const drag = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    targetLeft: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0, // px per ms (positive = content moving left)
  });
  const rafRef = useRef(0);
  const glideRef = useRef(0);

  const cancelGlide = () => {
    if (glideRef.current) {
      cancelAnimationFrame(glideRef.current);
      glideRef.current = 0;
    }
  };

  const updateScrollState = () => {
    const element = ref.current;
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    setScrollState({
      canPrev: element.scrollLeft > 4,
      canNext: element.scrollLeft < maxScroll - 4,
    });
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [children]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    cancelGlide();
  }, []);

  const clamp = (element: HTMLDivElement, value: number) =>
    Math.max(0, Math.min(element.scrollWidth - element.clientWidth, value));

  const scheduleFrame = (element: HTMLDivElement) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      element.scrollLeft = clamp(element, drag.current.targetLeft);
    });
  };

  const startGlide = (element: HTMLDivElement) => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let velocity = drag.current.velocity;
    if (reduced || Math.abs(velocity) < 0.05) return;
    velocity = Math.max(-4, Math.min(4, velocity));

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const next = clamp(element, element.scrollLeft + velocity * dt);
      if (next === element.scrollLeft) return void (glideRef.current = 0);
      element.scrollLeft = next;
      velocity *= Math.pow(0.9965, dt * 2);
      if (Math.abs(velocity) < 0.02) return void (glideRef.current = 0);
      glideRef.current = requestAnimationFrame(step);
    };
    glideRef.current = requestAnimationFrame(step);
  };

  const stopDrag = (element: HTMLDivElement, pointerId: number) => {
    const wasDragging = drag.current.active && drag.current.moved;
    drag.current.active = false;
    try {
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    if (wasDragging) startGlide(element);
  };

  const scrollByPage = (direction: -1 | 1) => {
    const element = ref.current;
    if (!element) return;
    cancelGlide();
    element.scrollBy({
      left: direction * Math.max(180, element.clientWidth * 0.8),
      behavior: "smooth",
    });
    window.setTimeout(updateScrollState, 320);
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        draggable={false}
        // Allow vertical page scroll to pass through when the gesture is vertical.
        style={{
          touchAction: "pan-x pan-y pinch-zoom",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
        }}

        className={`flex gap-3 overflow-x-auto scrollbar-hide horizontal-scroll cursor-grab active:cursor-grabbing ${className}`}
        onWheel={(event) => {
          const element = event.currentTarget;
          const maxScroll = element.scrollWidth - element.clientWidth;
          if (maxScroll <= 0) return;

          const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);
          const shiftWheel = event.shiftKey && Math.abs(event.deltaY) > 0;
          if (!horizontalIntent && !shiftWheel) return;

          const delta = horizontalIntent ? event.deltaX : event.deltaY;
          const next = Math.max(0, Math.min(maxScroll, element.scrollLeft + delta));
          if (next !== element.scrollLeft) {
            event.preventDefault();
            cancelGlide();
            element.scrollLeft = next;
          }
        }}
        onPointerDownCapture={(event) => {
          cancelGlide();
          // Only handle click-drag for mouse. Touch/pen use native scrolling.
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          const element = event.currentTarget;
          if (element.scrollWidth <= element.clientWidth) return;

          drag.current = {
            active: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: element.scrollLeft,
            moved: false,
            targetLeft: element.scrollLeft,
            lastX: event.clientX,
            lastT: performance.now(),
            velocity: 0,
          };
        }}
        onPointerMoveCapture={(event) => {
          const state = drag.current;
          if (!state.active || state.pointerId !== event.pointerId) return;
          if (event.pointerType !== "mouse") return;

          const deltaX = event.clientX - state.startX;
          if (!state.moved && Math.abs(deltaX) > 6) {
            state.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          if (!state.moved) return;
          event.preventDefault();

          const now = performance.now();
          const dt = now - state.lastT;
          if (dt > 0) {
            const instant = (state.lastX - event.clientX) / dt;
            // low-pass filter for a stable release velocity
            state.velocity = state.velocity * 0.7 + instant * 0.3;
            state.lastX = event.clientX;
            state.lastT = now;
          }

          state.targetLeft = state.scrollLeft - deltaX;
          scheduleFrame(event.currentTarget);
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerUpCapture={(event) => stopDrag(event.currentTarget, event.pointerId)}
        onPointerCancelCapture={(event) => stopDrag(event.currentTarget, event.pointerId)}
        onClickCapture={(event) => {
          if (!drag.current.moved) return;
          drag.current.moved = false;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {children}
        <div className="w-12 shrink-0 snap-none" aria-hidden="true" />
      </div>

      {scrollState.canPrev && (
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollByPage(-1)}
          className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-card backdrop-blur sm:grid"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {scrollState.canNext && (
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollByPage(1)}
          className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-card backdrop-blur sm:grid"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
