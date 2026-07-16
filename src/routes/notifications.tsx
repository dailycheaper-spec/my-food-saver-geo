import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, MapPin, Check } from "lucide-react";
import { CATEGORIES } from "@/lib/mock-data";
import { saveNotifSettings, useNotifSettings } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "შეტყობინებები — Cheaper" }, { name: "description", content: "მიიღე შეტყობინება, როცა ახლომდებარე უბანში ახალი შემოთავაზება გამოჩნდება." }] }),
  component: Notifications,
});

function Notifications() {
  const { t } = useI18n();
  const settings = useNotifSettings();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [demo, setDemo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setPermission("unsupported");
    else setPermission(Notification.permission);
  }, []);

  async function requestNotif() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") saveNotifSettings({ ...settings, enabled: true });
  }

  function requestLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: 41.7151, lng: 44.8271 }), // Tbilisi fallback
    );
  }

  function triggerDemo() {
    const title = "🥖 ახალი პაკეტი 1.2 კმ-ში";
    const body = `პური გულიანი — სიურპრიზ პაკეტი 10 ${t("currency")}-ად`;
    if (permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
    setDemo(`${title}\n${body}`);
    setTimeout(() => setDemo(null), 4500);
  }

  function toggleCategory(id: string) {
    const has = settings.categories.includes(id);
    saveNotifSettings({
      ...settings,
      categories: has ? settings.categories.filter((c) => c !== id) : [...settings.categories, id],
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="font-display text-2xl font-bold">{t("notificationsTitle")}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {t("notificationsText")}
      </p>

      {/* Permission card */}
      <div className="mt-5 bg-card rounded-2xl p-5 border border-border shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{t("pushNotifications")}</div>
            <div className="text-xs text-muted-foreground">
              {permission === "granted" ? t("enabled") :
               permission === "denied" ? t("denied") :
               permission === "unsupported" ? t("unsupported") :
               t("enableNotifs")}
            </div>
          </div>
          {permission !== "granted" && permission !== "unsupported" && (
            <button onClick={requestNotif} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {t("enable")}
            </button>
          )}
          {permission === "granted" && <Check className="w-5 h-5 text-success" />}
        </div>
      </div>

      {/* Location */}
      <div className="mt-3 bg-card rounded-2xl p-5 border border-border shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/20 grid place-items-center">
            <MapPin className="w-6 h-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{t("address")}</div>
            <div className="text-xs text-muted-foreground">
              {location ? `✓ ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "ვერ ვხედავ შენს ლოკაციას"}
            </div>
          </div>
          <button onClick={requestLocation} className="px-4 py-2 rounded-full bg-card border border-border text-sm font-semibold">
            {location ? t("refresh") : t("enable")}
          </button>
        </div>
      </div>

      {/* Radius */}
      <div className="mt-3 bg-card rounded-2xl p-5 border border-border shadow-card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{t("radius")}</div>
          <div className="text-sm font-bold text-primary">{settings.radiusKm} კმ</div>
        </div>
        <input
          type="range" min={0.5} max={5} step={0.5}
          value={settings.radiusKm}
          onChange={(e) => saveNotifSettings({ ...settings, radiusKm: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>0.5 კმ</span><span>2 კმ</span><span>5 კმ</span>
        </div>
      </div>

      {/* Categories */}
      <div className="mt-3 bg-card rounded-2xl p-5 border border-border shadow-card">
        <div className="font-semibold mb-3">{t("categories")}</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.id !== "ყველა").map((c) => {
            const on = settings.categories.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                }`}
              >
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{t("emptyMeansAll")}</p>
      </div>

      {/* Demo */}
      <div className="mt-3 bg-warm text-warm-foreground rounded-2xl p-5">
        <div className="font-semibold">{t("test")}</div>
        <p className="text-xs opacity-80 mt-1">{t("testText")}</p>
        <button onClick={triggerDemo} className="mt-3 px-4 py-2 rounded-full bg-warm-foreground text-warm text-sm font-semibold">
          {t("send")}
        </button>
        {demo && (
          <div className="mt-3 bg-card rounded-xl p-3 border border-border shadow-soft animate-in fade-in slide-in-from-bottom-2 text-foreground">
            <div className="text-xs text-muted-foreground">{t("brand")} • {t("now")}</div>
            <div className="whitespace-pre-line text-sm font-medium mt-1">{demo}</div>
          </div>
        )}
      </div>
    </div>
  );
}
