import { useI18n } from "@/lib/i18n";

export const MIN_DISCOUNT_PCT = 35;

export function computePct(original: number, discounted: number): number {
  if (!original || original <= 0) return 0;
  const pct = ((original - discounted) / original) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function computeDiscounted(original: number, pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  const v = original * (1 - p / 100);
  return Math.round(v * 100) / 100;
}

type Props = {
  original: string;
  discounted: string;
  onChange: (next: { original: string; discounted: string }) => void;
  variant?: "stacked" | "grid";
};

export function DiscountFields({ original, discounted, onChange, variant = "grid" }: Props) {
  const { t } = useI18n();
  const origNum = Number(original) || 0;
  const discNum = Number(discounted) || 0;
  const pct = computePct(origNum, discNum);
  const invalid = origNum > 0 && discNum > 0 && pct < MIN_DISCOUNT_PCT;

  const handleOriginal = (v: string) => onChange({ original: v, discounted });
  const handleDiscounted = (v: string) => onChange({ original, discounted: v });
  const handlePct = (v: string) => {
    const p = Math.max(0, Math.min(100, Number(v) || 0));
    if (origNum > 0) {
      const d = computeDiscounted(origNum, p);
      onChange({ original, discounted: String(d) });
    }
  };

  const wrapCls = variant === "grid" ? "grid grid-cols-3 gap-3" : "space-y-3";

  return (
    <div>
      <div className={wrapCls}>
        <FieldBox label={t("originalPrice")}>
          <input
            type="number"
            step="0.01"
            min={0}
            required
            value={original}
            onChange={(e) => handleOriginal(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </FieldBox>
        <FieldBox label={t("discountedPrice")}>
          <input
            type="number"
            step="0.01"
            min={0}
            required
            value={discounted}
            onChange={(e) => handleDiscounted(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl bg-muted/40 border text-sm focus:outline-none focus:ring-2 ${invalid ? "border-destructive focus:ring-destructive/30" : "border-border focus:ring-primary/30"}`}
          />
        </FieldBox>
        <FieldBox label={t("discountPct")}>
          <input
            type="number"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => handlePct(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 ${invalid ? "bg-destructive/10 border-destructive text-destructive focus:ring-destructive/30" : "bg-primary/10 border-primary/30 text-primary focus:ring-primary/30"}`}
          />
        </FieldBox>
      </div>
      {invalid && (
        <div className="mt-1.5 text-xs text-destructive font-medium">⚠ {t("minDiscount50")}</div>
      )}
    </div>
  );
}

function FieldBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col">
      <div className="text-xs font-medium text-muted-foreground mb-1.5 leading-tight min-h-[2rem] flex items-end">{label}</div>
      {children}
    </label>
  );
}
