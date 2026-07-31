import type { Language } from "@/lib/i18n";

/**
 * Nested-by-domain translation packs.
 *
 * Every new user-facing string lives here under a dotted domain key
 * (`admin.users.title`, `partner.store.saveButton`, `map.popup.openStore`).
 * All five languages are required for every key — `checkKeyParity()` in
 * `i18n.tsx` reports any gap in development.
 */
export type DomainPack = Record<Language, Record<string, string>>;

export function mergePacks(...packs: DomainPack[]): DomainPack {
  const out: DomainPack = { ka: {}, en: {}, ru: {}, tr: {}, fa: {} };
  for (const pack of packs) {
    for (const lang of Object.keys(out) as Language[]) {
      Object.assign(out[lang], pack[lang] ?? {});
    }
  }
  return out;
}
