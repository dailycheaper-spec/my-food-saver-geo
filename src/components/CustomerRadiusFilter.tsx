import { useEffect, useRef } from "react";

export const RADIUS_OPTIONS = [1, 3, 5, 10, 20] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

interface Props {
  value: RadiusOption;
  onChange: (v: RadiusOption) => void;
  /** Debounced callback fired after the user stops tapping. */
  onDebouncedChange?: (v: RadiusOption) => void;
}

export function CustomerRadiusFilter({ value, onChange, onDebouncedChange }: Props) {
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!onDebouncedChange) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onDebouncedChange(value), 220);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [value, onDebouncedChange]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {RADIUS_OPTIONS.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={`px-3 h-11 sm:h-8 rounded-full text-xs font-semibold border transition ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            {r} კმ
          </button>
        );
      })}
    </div>
  );
}
