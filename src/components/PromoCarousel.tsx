import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PROMO_BANNERS, localizedText, type PromoBanner } from "@/lib/promo-banners";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";


// Banner targets come from data, so the typed Link surface is widened here.
const AnyLink = Link as unknown as React.FC<Record<string, unknown>>;

const ROTATE_MS = 6000;
const SWIPE_THRESHOLD = 48;

export function PromoCarousel({ banners = PROMO_BANNERS }: { banners?: PromoBanner[] }) {
  const { language, t } = useI18n();
  const slides = useMemo(() => banners.filter((b) => b.active !== false), [banners]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [announce, setAnnounce] = useState("");
  const touchStartX = useRef<number | null>(null);
  const reducedMotion = useRef(false);

  const count = slides.length;
  const safeIndex = count ? index % count : 0;

  const L = {
    carousel:
      t("promo.promotions"),
    slideWord:
      t("promo.slide"),
    of:
      t("promo.of"),
    prev:
      t("promo.previousSlide"),
    next:
      t("promo.nextSlide"),
    goTo:
      t("promo.goToSlide"),
  };

  const slideLabel = useCallback(
    (i: number) => `${L.slideWord} ${i + 1} ${L.of} ${count}`,
    [L.slideWord, L.of, count],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const goTo = useCallback(
    (next: number, manual = false) => {
      if (!count) return;
      const target = ((next % count) + count) % count;
      setIndex(target);
      if (manual) setAnnounce(slideLabel(target));
    },
    [count, slideLabel],
  );

  // Auto-rotation — paused on hover, focus, hidden tab, touch, reduced motion.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion.current) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!count) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(safeIndex + 1, true);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(safeIndex - 1, true);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 mt-4 sm:mt-5">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={L.carousel}
        className="group relative"
        // Vertical page scroll always wins over the horizontal swipe handler.
        style={{ touchAction: "pan-y pinch-zoom" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
        }}
        onKeyDown={onKeyDown}

        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          setPaused(false);
          if (start == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) < SWIPE_THRESHOLD) return;
          goTo(dx < 0 ? safeIndex + 1 : safeIndex - 1, true);
        }}
      >
        <div className="relative overflow-hidden rounded-3xl shadow-elevated min-h-[200px] sm:min-h-[280px]">
          {slides.map((b, i) => {
            const active = i === safeIndex;
            return (
              <div
                key={b.id}
                role="group"
                aria-roledescription="slide"
                aria-label={slideLabel(i)}
                aria-hidden={!active}
                className={`transition-opacity duration-500 ${
                  active
                    ? "relative opacity-100"
                    : "absolute inset-0 opacity-0 pointer-events-none"
                }`}
              >
                <AnyLink
                  to={b.buttonAction.to}
                  search={b.buttonAction.search}
                  tabIndex={active ? 0 : -1}
                  className="block relative min-h-[200px] sm:min-h-[280px] active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-3xl"
                >
                  {b.imageSource && (
                    <ImageWithSkeleton
                      src={b.imageSource}
                      alt=""
                      priority={i === 0}
                      aspect="absolute inset-0 w-full h-full"
                    />

                  )}
                  <div
                    className={
                      b.overlayClass ??
                      "absolute inset-0 bg-gradient-to-r from-primary/75 via-primary/25 to-transparent"
                    }
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="relative pt-4 sm:pt-6 pl-12 sm:pl-16 pr-12 sm:pr-16 pb-10 sm:pb-12 text-primary-foreground flex flex-col justify-end min-h-[200px] sm:min-h-[280px]">
                    {b.badge && (
                      <div className="inline-flex self-start items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" aria-hidden="true" />
                        {localizedText(b.badge, language)}
                      </div>
                    )}
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight mt-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                      {localizedText(b.headline, language)}
                    </h2>
                    <p className="text-sm sm:text-base text-primary-foreground/95 mt-1 max-w-[85%] drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
                      {localizedText(b.subtext, language)}
                    </p>
                    <span className="mt-3 self-start inline-flex items-center gap-1.5 bg-card text-foreground text-sm font-bold px-4 py-2 rounded-full">
                      {localizedText(b.buttonText, language)}
                      <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </div>
                </AnyLink>
              </div>
            );
          })}

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label={L.prev}
                onClick={() => goTo(safeIndex - 1, true)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 shrink-0 rounded-full grid place-items-center bg-card/85 text-foreground shadow-sm backdrop-blur-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={L.next}
                onClick={() => goTo(safeIndex + 1, true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 shrink-0 rounded-full grid place-items-center bg-card/85 text-foreground shadow-sm backdrop-blur-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>


              <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
                {slides.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`${L.goTo} ${i + 1}`}
                    aria-current={i === safeIndex ? "true" : undefined}
                    onClick={() => goTo(i, true)}
                    className="h-11 w-6 grid place-items-center focus-visible:outline-none"
                  >
                    <span
                      className={`block rounded-full transition-all ${
                        i === safeIndex
                          ? "w-5 h-1.5 bg-primary-foreground"
                          : "w-1.5 h-1.5 bg-primary-foreground/55"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
      </div>
    </section>
  );
}

export default PromoCarousel;
