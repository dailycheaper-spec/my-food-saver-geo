import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "./i18n";

/**
 * Supported cities for Cheaper. Stored in DB as the Georgian string
 * (matches the `stores.city` CHECK constraint), translated for display.
 */
export const CITIES = ["თბილისი", "ქუთაისი", "ბათუმი"] as const;
export type City = (typeof CITIES)[number];

const STORAGE_KEY = "cheaper:city";

export function cityLabel(c: City, lang: Language): string {
  if (lang === "ka") return c;
  if (c === "თბილისი") return lang === "en" ? "Tbilisi" : "Тбилиси";
  if (c === "ქუთაისი") return lang === "en" ? "Kutaisi" : "Кутаиси";
  return lang === "en" ? "Batumi" : "Батуми";
}

type Ctx = { city: City; setCity: (c: City) => void };
const CityCtx = createContext<Ctx | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<City>("თბილისი");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as City | null;
      if (stored && (CITIES as readonly string[]).includes(stored)) {
        setCityState(stored);
      }
    } catch {}
  }, []);

  const setCity = (c: City) => {
    setCityState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  };

  return <CityCtx.Provider value={{ city, setCity }}>{children}</CityCtx.Provider>;
}

export function useCity(): Ctx {
  const ctx = useContext(CityCtx);
  if (!ctx) return { city: "თბილისი", setCity: () => {} };
  return ctx;
}
