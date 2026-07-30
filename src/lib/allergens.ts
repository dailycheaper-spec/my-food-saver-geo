// Common allergen options — canonical value is the lowercase English key
// stored in offers.allergens; labels are localized for display.
import type { Language as UiLanguage } from "@/lib/i18n";

export type AllergenKey =
  | "gluten"
  | "dairy"
  | "eggs"
  | "nuts"
  | "peanuts"
  | "soy"
  | "fish"
  | "shellfish"
  | "sesame";

export const ALLERGEN_KEYS: AllergenKey[] = [
  "gluten", "dairy", "eggs", "nuts", "peanuts", "soy", "fish", "shellfish", "sesame",
];

const LABELS: Record<AllergenKey, Record<UiLanguage, string>> = {
  gluten:    { ka: "გლუტენი",         en: "Gluten",    ru: "Глютен",        tr: "Gluten",       fa: "گلوتن" },
  dairy:     { ka: "რძის პროდუქტი",   en: "Dairy",     ru: "Молочные",      tr: "Süt ürünü",    fa: "لبنیات" },
  eggs:      { ka: "კვერცხი",          en: "Eggs",      ru: "Яйца",          tr: "Yumurta",      fa: "تخم‌مرغ" },
  nuts:      { ka: "თხილი",            en: "Nuts",      ru: "Орехи",         tr: "Kuruyemiş",    fa: "آجیل" },
  peanuts:   { ka: "არაქისი",          en: "Peanuts",   ru: "Арахис",        tr: "Yer fıstığı",  fa: "بادام‌زمینی" },
  soy:       { ka: "სოია",             en: "Soy",       ru: "Соя",           tr: "Soya",         fa: "سویا" },
  fish:      { ka: "თევზი",            en: "Fish",      ru: "Рыба",          tr: "Balık",        fa: "ماهی" },
  shellfish: { ka: "ზღვის პროდუქტები", en: "Shellfish", ru: "Морепродукты",  tr: "Kabuklu deniz ürünleri", fa: "صدف‌داران" },
  sesame:    { ka: "სეზამი",           en: "Sesame",    ru: "Кунжут",        tr: "Susam",        fa: "کنجد" },
};

export function allergenLabel(key: string, language: UiLanguage): string {
  const rec = LABELS[key as AllergenKey];
  return rec ? rec[language] : key;
}

export function allergenLabels(keys: string[] | null | undefined, language: UiLanguage): string[] {
  if (!keys || keys.length === 0) return [];
  return keys.map((k) => allergenLabel(k, language));
}
