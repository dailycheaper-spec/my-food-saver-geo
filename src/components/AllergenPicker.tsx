import { ALLERGEN_KEYS, allergenLabel } from "@/lib/allergens";
import { useI18n } from "@/lib/i18n";

/** Shared allergen chip picker used by the offer form and the saved-products menu. */
export function AllergenPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { language } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {ALLERGEN_KEYS.map((k) => {
        const active = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(active ? value.filter((x) => x !== k) : [...value, k])}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              active ? "bg-amber-500 text-white border-amber-500" : "bg-card border-border text-muted-foreground"
            }`}
          >
            {active ? "✓ " : ""}{allergenLabel(k, language)}
          </button>
        );
      })}
    </div>
  );
}
