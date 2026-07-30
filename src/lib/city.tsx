import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language } from "./i18n";

/**
 * Supported cities for Cheaper. Stored in DB as the Georgian string
 * (matches the `stores.city` CHECK constraint), translated for display.
 */
export const CITIES = ["თბილისი", "ქუთაისი", "ბათუმი", "გორი", "რუსთავი", "ზუგდიდი"] as const;
export type City = (typeof CITIES)[number];

/** Approx city centers [lat, lng] for map defaults and geo-fallbacks. */
export const CITY_CENTERS: Record<City, [number, number]> = {
  "თბილისი": [41.7151, 44.7873],
  "ქუთაისი": [42.2679, 42.7180],
  "ბათუმი": [41.6168, 41.6367],
  "გორი": [41.9847, 44.1094],
  "რუსთავი": [41.5497, 45.0087],
  "ზუგდიდი": [42.5088, 41.8709],
};

/** Default map zoom for each city (Tbilisi tighter, others slightly wider). */
export const CITY_ZOOM: Record<City, number> = {
  "თბილისი": 12,
  "ქუთაისი": 13,
  "ბათუმი": 13,
  "გორი": 13,
  "რუსთავი": 13,
  "ზუგდიდი": 13,
};

const STORAGE_KEY = "cheaper:city";

export function cityLabel(c: City, lang: Language): string {
  if (lang === "ka") return c;
  if (c === "თბილისი") return lang === "en" ? "Tbilisi" : "Тбилиси";
  if (c === "ქუთაისი") return lang === "en" ? "Kutaisi" : "Кутаиси";
  if (c === "ბათუმი") return lang === "en" ? "Batumi" : "Батуми";
  if (c === "გორი") return lang === "en" ? "Gori" : "Гори";
  if (c === "რუსთავი") return lang === "en" ? "Rustavi" : "Рустави";
  return lang === "en" ? "Zugdidi" : "Зугдиди";
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
