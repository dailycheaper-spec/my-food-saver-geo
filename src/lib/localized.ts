// Shared helper for reading optional per-language content
// (e.g. `title_en`, `title_ru` alongside the original `title`).
//
// Usage:
//   localizedField(row, "title", language)
//   localizedField(order.offer, "description", language)
//
// Rules:
// - "en" → row.title_en if non-empty, otherwise row.title
// - "ru" → row.title_ru if non-empty, otherwise row.title
// - "ka" (or unknown) → row.title
// Never returns undefined — always a string ("" only if the base is also missing).

import type { Language } from "@/lib/i18n";

type WithField<F extends string> = {
  [K in F]?: string | null;
} & Partial<Record<`${F}_en` | `${F}_ru` | `${F}_tr` | `${F}_fa`, string | null>>;

export function localizedField<F extends string>(
  row: WithField<F> | null | undefined,
  field: F,
  language: Language,
): string {
  if (!row) return "";
  const base = (row[field] as string | null | undefined) ?? "";
  if (language === "en") {
    const v = (row as Record<string, unknown>)[`${field}_en`];
    if (typeof v === "string" && v.trim()) return v;
  } else if (language === "ru") {
    const v = (row as Record<string, unknown>)[`${field}_ru`];
    if (typeof v === "string" && v.trim()) return v;
  } else if (language === "tr") {
    const v = (row as Record<string, unknown>)[`${field}_tr`];
    if (typeof v === "string" && v.trim()) return v;
  } else if (language === "fa") {
    const v = (row as Record<string, unknown>)[`${field}_fa`];
    if (typeof v === "string" && v.trim()) return v;
  }
  return base;
}
