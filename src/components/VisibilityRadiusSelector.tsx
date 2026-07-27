import { useI18n } from "@/lib/i18n";
import { formatRadiusLabel } from "@/lib/geo";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

const VALUES = [1, 2, 3, 5, 10, 20, 50] as const;

export function VisibilityRadiusSelector({ value, onChange }: Props) {
  const { t, language } = useI18n();
  const isCityWide = value >= 50;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {VALUES.map((v) => {
          const active = value === v;
          const label = v >= 50 ? t("map.radiusCityWide") : formatRadiusLabel(v, language);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border hover:bg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {isCityWide
          ? t("map.visibilityCityHint")
          : t("map.visibilityRadiusHint").replace("{value}", String(value))}
      </p>
    </div>
  );
}

export default VisibilityRadiusSelector;
