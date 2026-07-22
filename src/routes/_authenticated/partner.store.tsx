import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";
import { Save, MapPin, LocateFixed } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { VisibilityRadiusSelector } from "@/components/VisibilityRadiusSelector";
import { isValidLatLng } from "@/lib/geo";

const StoreLocationPicker = lazy(() =>
  import("@/components/StoreLocationPicker").then((m) => ({ default: m.StoreLocationPicker }))
);

const STORE_TYPES = [
  { value: "restaurant", label: "რესტორანი" },
  { value: "bakery", label: "საცხობი" },
  { value: "cafe", label: "კაფე" },
  { value: "market", label: "მარკეტი" },
  { value: "grocery", label: "სასურსათო" },
  { value: "other", label: "სხვა" },
];

export const Route = createFileRoute("/_authenticated/partner/store")({
  head: () => ({ meta: [{ title: "Store — Cheaper" }] }),
  component: StoreSettings,
});

type FormState = {
  name: string;
  logo: string;
  category: string;
  district: string;
  address: string;
  phone: string;
  description: string;
  lat: number | null;
  lng: number | null;
  visibility_radius_km: number;
};

function StoreSettings() {
  const { t } = useI18n();
  const { stores, loading, reload } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const [form, setForm] = useState<FormState>({
    name: "",
    logo: "",
    category: "restaurant",
    district: "",
    address: "",
    phone: "",
    description: "",
    lat: null,
    lng: null,
    visibility_radius_km: 3,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => {
    if (store) {
      const anyStore = store as unknown as Record<string, unknown>;
      setForm({
        name: store.name,
        logo: store.logo ?? "",
        category: store.category ?? "restaurant",
        district: store.district ?? "",
        address: store.address ?? "",
        phone: store.phone ?? "",
        description: store.description ?? "",
        lat: typeof anyStore.lat === "number" ? (anyStore.lat as number) : null,
        lng: typeof anyStore.lng === "number" ? (anyStore.lng as number) : null,
        visibility_radius_km:
          typeof anyStore.visibility_radius_km === "number"
            ? (anyStore.visibility_radius_km as number)
            : 3,
      });
    }
  }, [store]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noStoreShort")}</div>;

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg({ text: "თქვენი ბრაუზერი ლოკაციის ავტომატურ განსაზღვრას არ უჭერს მხარს.", kind: "err" });
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setMsg({ text: "მდებარეობა წარმატებით განისაზღვრა.", kind: "ok" });
      },
      (err) => {
        setLocBusy(false);
        let text = "მდებარეობის განსაზღვრა ვერ მოხერხდა. სცადეთ რუკაზე ხელით მონიშვნა.";
        if (err.code === err.PERMISSION_DENIED) text = "ლოკაციაზე წვდომა არ არის ნებადართული. მონიშნეთ ობიექტი რუკაზე.";
        else if (err.code === err.TIMEOUT) text = "მდებარეობის განსაზღვრას ძალიან დიდი დრო დასჭირდა. სცადეთ ხელახლა.";
        setMsg({ text, kind: "err" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;

    if (!isValidLatLng(form.lat, form.lng)) {
      setMsg({ text: "გთხოვთ, მონიშნოთ ობიექტის მდებარეობა რუკაზე.", kind: "err" });
      return;
    }

    setSaving(true);
    setMsg(null);
    const payload = {
      name: form.name,
      logo: form.logo,
      category: form.category,
      district: form.district,
      address: form.address,
      phone: form.phone,
      description: form.description,
      lat: form.lat,
      lng: form.lng,
      visibility_radius_km: form.visibility_radius_km,
    } as never;
    const { error } = await supabase.from("stores").update(payload).eq("id", store.id);
    setSaving(false);
    if (error) setMsg({ text: t("errorPrefix") + error.message, kind: "err" });
    else {
      setMsg({ text: t("savedMsg"), kind: "ok" });
      reload();
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-1">{t("storeSettingsTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("statusLbl")}: <span className="font-semibold text-success">{store.status}</span></p>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">რა ტიპის ობიექტია? *</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            {STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <Field label={t("nameLbl")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label={t("logoEmoji")} value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} placeholder="🥐" />
        <Field label={t("districtLbl")} value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
        <Field label={t("addressLbl")} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label={t("phoneLbl")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label={t("descriptionLbl")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
      </div>

      {/* Location section */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 mt-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">ობიექტის მდებარეობა</h2>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locBusy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-60"
        >
          <LocateFixed className="w-4 h-4" />
          {locBusy ? "მდებარეობის მოძიება…" : "ჩემი მიმდინარე მდებარეობის გამოყენება"}
        </button>

        <Suspense fallback={<div className="h-80 w-full rounded-2xl bg-muted animate-pulse" />}>
          <StoreLocationPicker
            value={{ lat: form.lat, lng: form.lng }}
            onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))}
            radiusKm={form.visibility_radius_km < 50 ? form.visibility_radius_km : undefined}
            storageKey="cheaper-partner-store-map"
          />
        </Suspense>

        <p className="text-xs text-muted-foreground">
          ეს არის ტერიტორია, სადაც თქვენი ობიექტი გამოჩნდება მომხმარებლების რუკაზე.
        </p>

        <div className="text-xs text-muted-foreground font-mono">
          {form.lat != null && form.lng != null ? (
            <>
              Latitude: {form.lat.toFixed(6)} · Longitude: {form.lng.toFixed(6)}
            </>
          ) : (
            <span>დააკლიკეთ რუკაზე ან გამოიყენეთ მიმდინარე მდებარეობა.</span>
          )}
        </div>

      </div>

      {/* Radius section */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3 mt-4">
        <h2 className="font-semibold">მომხმარებლებისთვის ხილვადობის რადიუსი</h2>
        <p className="text-xs text-muted-foreground">
          აირჩიეთ, რა მაქსიმალური მანძილიდან გამოჩნდეს თქვენი ობიექტი მომხმარებლების ლოკაციაზე დაფუძნებულ შეთავაზებებში.
        </p>
        <VisibilityRadiusSelector
          value={form.visibility_radius_km}
          onChange={(v) => setForm((f) => ({ ...f, visibility_radius_km: v }))}
        />
      </div>

      {msg && (
        <div
          className={`mt-3 text-sm ${msg.kind === "err" ? "text-destructive" : "text-success"}`}
          role="status"
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60"
      >
        <Save className="w-4 h-4" /> {saving ? t("savingProgress") : t("save")}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      )}
    </label>
  );
}
