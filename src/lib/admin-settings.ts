// Client-side admin settings persisted in localStorage.
// Not a security boundary — for UI preferences and platform defaults only.

const KEY = "gemo.admin.settings.v1";

export type AdminSettings = {
  commissionPct: number;
  deliveryEnabled: boolean;
  notificationsRadiusKm: number;
  language: "ka" | "en";
  paymentProviders: { bog: boolean; flitt: boolean; card: boolean; googlepay: boolean };
  rules: string;
};

const defaults: AdminSettings = {
  commissionPct: 10,
  deliveryEnabled: true,
  notificationsRadiusKm: 2,
  language: "ka",
  paymentProviders: { bog: true, flitt: true, card: true, googlepay: true },
  rules: "შემოთავაზება უნდა იყოს ხარისხიანი და შეესაბამებოდეს აღწერას.",
};

export function loadAdminSettings(): AdminSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed, paymentProviders: { ...defaults.paymentProviders, ...parsed.paymentProviders } };
  } catch { return defaults; }
}

export function saveAdminSettings(s: AdminSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

// Theme
const THEME_KEY = "gemo.admin.theme";
export function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem(THEME_KEY) as "light" | "dark") ?? "light";
}
export function saveTheme(t: "light" | "dark") {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, t);
}
