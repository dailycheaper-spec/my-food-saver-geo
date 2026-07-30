import { useState, useRef, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { CITIES, cityLabel, useCity, type City } from "@/lib/city";
import { useI18n } from "@/lib/i18n";

type Variant = "compact" | "pill" | "block";

export function CitySelector({
  variant = "compact",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { city, setCity } = useCity();
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const labelText =
    language === "en" ? "City" : language === "ru" ? "Город" : language === "tr" ? "Şehir" : language === "fa" ? "شهر" : "ქალაქი";

  const trigger =
    variant === "compact" ? (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labelText}
        className="flex items-center gap-1.5 min-w-0 press rounded-2xl focus-visible:outline-none"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 text-left">
          <div className="hidden sm:block text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
            {labelText}
          </div>
          <div className="text-sm font-bold leading-tight flex items-center gap-1 min-w-0">
            <span className="truncate">{cityLabel(city, language)}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          </div>
        </div>

      </button>
    ) : variant === "pill" ? (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary border border-border text-sm font-semibold press focus-visible:outline-none"
      >
        <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        {cityLabel(city, language)}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 h-11 px-3 rounded-xl bg-card border border-input text-sm font-medium press focus-visible:outline-none"
      >
        <span className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
          {cityLabel(city, language)}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      </button>
    );

  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger}
      {open && (
        <ul
          role="listbox"
          aria-label={labelText}
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-2xl bg-popover border border-border shadow-elevated overflow-hidden animate-scale-in"
        >
          {CITIES.map((c: City) => {
            const active = c === city;
            return (
              <li key={c}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { setCity(c); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    active ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                    {cityLabel(c, language)}
                  </span>
                  {active && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
