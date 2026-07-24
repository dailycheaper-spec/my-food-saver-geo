import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";
import { Save, MapPin, LocateFixed, Landmark } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { VisibilityRadiusSelector } from "@/components/VisibilityRadiusSelector";
import { isValidLatLng } from "@/lib/geo";
import { useStoreBankAccount, upsertStoreBankAccount, isValidGeorgianIban, normalizeIban } from "@/lib/bank-account";

const StoreLocationPicker = lazy(() =>
  import("@/components/StoreLocationPicker").then((m) => ({ default: m.StoreLocationPicker }))
);

const STORE_TYPES: { value: string; ka: string; en: string; ru: string }[] = [
  { value: "restaurant", ka: "რესტორანი", en: "Restaurant", ru: "Ресторан" },
  { value: "bakery", ka: "საცხობი", en: "Bakery", ru: "Пекарня" },
  { value: "cafe", ka: "კაფე", en: "Cafe", ru: "Кафе" },
  { value: "market", ka: "მარკეტი", en: "Market", ru: "Маркет" },
  { value: "grocery", ka: "სასურსათო", en: "Grocery", ru: "Продукты" },
  { value: "other", ka: "სხვა", en: "Other", ru: "Другое" },
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
  company_name: string;
  company_id_number: string;
  contact_email: string;
};

function StoreSettings() {
  const { t, language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
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
    company_name: "",
    company_id_number: "",
    contact_email: "",
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
        company_name: (anyStore.company_name as string | null) ?? "",
        company_id_number: (anyStore.company_id_number as string | null) ?? "",
        contact_email: (anyStore.contact_email as string | null) ?? "",
      });
    }
  }, [store]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noStoreShort")}</div>;

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg({ text: L("თქვენი ბრაუზერი ლოკაციის ავტომატურ განსაზღვრას არ უჭერს მხარს.", "Your browser doesn't support automatic location.", "Ваш браузер не поддерживает автоматическое определение местоположения."), kind: "err" });
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setMsg({ text: L("მდებარეობა წარმატებით განისაზღვრა.", "Location detected successfully.", "Местоположение определено."), kind: "ok" });
      },
      (err) => {
        setLocBusy(false);
        let text = L("მდებარეობის განსაზღვრა ვერ მოხერხდა. სცადეთ რუკაზე ხელით მონიშვნა.", "Couldn't detect location. Try picking it on the map.", "Не удалось определить местоположение. Отметьте на карте.");
        if (err.code === err.PERMISSION_DENIED) text = L("ლოკაციაზე წვდომა არ არის ნებადართული. მონიშნეთ ობიექტი რუკაზე.", "Location access denied. Please pick the store on the map.", "Доступ к геолокации запрещён. Отметьте магазин на карте.");
        else if (err.code === err.TIMEOUT) text = L("მდებარეობის განსაზღვრას ძალიან დიდი დრო დასჭირდა. სცადეთ ხელახლა.", "Location took too long. Try again.", "Определение местоположения заняло слишком много времени. Попробуйте снова.");
        setMsg({ text, kind: "err" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;

    if (!isValidLatLng(form.lat, form.lng)) {
      setMsg({ text: L("გთხოვთ, მონიშნოთ ობიექტის მდებარეობა რუკაზე.", "Please mark the store location on the map.", "Пожалуйста, отметьте местоположение магазина на карте."), kind: "err" });
      return;
    }

    setSaving(true);
    setMsg(null);
    const cid = form.company_id_number.trim();
    if (cid && !/^\d{9}$/.test(cid)) {
      setSaving(false);
      setMsg({ text: L("საიდენტიფიკაციო ნომერი უნდა შედგებოდეს 9 ციფრისგან.", "Company ID must be exactly 9 digits.", "Идентификационный номер должен состоять из 9 цифр."), kind: "err" });
      return;
    }
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
      company_name: form.company_name.trim() || null,
      company_id_number: cid || null,
      contact_email: form.contact_email.trim() || null,
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
          <span className="text-xs font-medium text-muted-foreground">{L("რა ტიპის ობიექტია?", "Store type", "Тип заведения")} *</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            {STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{L(type.ka, type.en, type.ru)}</option>)}
          </select>
        </label>
        <Field label={t("nameLbl")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label={t("logoEmoji")} value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} placeholder="🥐" />
        <Field label={t("districtLbl")} value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
        <Field label={t("addressLbl")} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label={t("phoneLbl")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label={t("descriptionLbl")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 mt-4">
        <h2 className="font-semibold">{L("კომპანიის მონაცემები", "Company details", "Данные компании")}</h2>
        <Field label={L("კომპანიის სახელი", "Company name", "Название компании")} value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} placeholder={L("შპს ...", "LLC ...", "ООО ...")} />
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{L("კომპანიის საიდენტიფიკაციო ნომერი (9 ციფრი)", "Company ID number (9 digits)", "Идентификационный номер компании (9 цифр)")}</span>
          <input
            value={form.company_id_number}
            onChange={(e) => setForm({ ...form, company_id_number: e.target.value.replace(/\D/g, "").slice(0, 9) })}
            inputMode="numeric"
            maxLength={9}
            placeholder="123456789"
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{L("ელფოსტა", "Email", "Эл. почта")}</span>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            placeholder="name@example.com"
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </label>
      </div>

      {/* Location section */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 mt-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">{L("ობიექტის მდებარეობა", "Store location", "Местоположение магазина")}</h2>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locBusy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-60"
        >
          <LocateFixed className="w-4 h-4" />
          {locBusy ? L("მდებარეობის მოძიება…", "Detecting location…", "Определяем местоположение…") : L("ჩემი მიმდინარე მდებარეობის გამოყენება", "Use my current location", "Использовать моё текущее местоположение")}
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
          {L("ეს არის ტერიტორია, სადაც თქვენი ობიექტი გამოჩნდება მომხმარებლების რუკაზე.", "This is the area where your store appears on the customer map.", "Это область, где ваш магазин будет показан на карте пользователей.")}
        </p>

        <div className="text-xs text-muted-foreground font-mono">
          {form.lat != null && form.lng != null ? (
            <>
              Latitude: {form.lat.toFixed(6)} · Longitude: {form.lng.toFixed(6)}
            </>
          ) : (
            <span>{L("დააკლიკეთ რუკაზე ან გამოიყენეთ მიმდინარე მდებარეობა.", "Click on the map or use current location.", "Кликните по карте или используйте текущее местоположение.")}</span>
          )}
        </div>

      </div>

      {/* Radius section */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3 mt-4">
        <h2 className="font-semibold">{L("მომხმარებლებისთვის ხილვადობის რადიუსი", "Visibility radius for customers", "Радиус видимости для клиентов")}</h2>
        <p className="text-xs text-muted-foreground">
          {L("აირჩიეთ, რა მაქსიმალური მანძილიდან გამოჩნდეს თქვენი ობიექტი მომხმარებლების ლოკაციაზე დაფუძნებულ შეთავაზებებში.", "Choose the maximum distance from which your store will appear in location-based offers.", "Выберите максимальное расстояние, с которого ваш магазин будет показан в предложениях на основе геолокации.")}
        </p>
        <VisibilityRadiusSelector
          value={form.visibility_radius_km}
          onChange={(v) => setForm((f) => ({ ...f, visibility_radius_km: v }))}
        />
      </div>

      <BankDetailsSection storeId={store.id} />



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

function BankDetailsSection({ storeId }: { storeId: string }) {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
  const { bank, loading, reload } = useStoreBankAccount(storeId);
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  useEffect(() => {
    if (bank) {
      setIban(bank.iban);
      setHolder(bank.account_holder ?? "");
    }
  }, [bank]);

  async function save() {
    setMsg(null);
    const normalized = normalizeIban(iban);
    if (!isValidGeorgianIban(normalized)) {
      setMsg({ text: L("IBAN უნდა იყოს ქართული ფორმატით (მაგ. GE29NB0000000101904917).", "IBAN must be in Georgian format (e.g. GE29NB0000000101904917).", "IBAN должен быть в грузинском формате (напр. GE29NB0000000101904917)."), kind: "err" });
      return;
    }
    setSaving(true);
    try {
      await upsertStoreBankAccount(storeId, normalized, holder.trim() || null);
      setMsg({ text: L("საბანკო რეკვიზიტები შენახულია.", "Bank details saved.", "Банковские реквизиты сохранены."), kind: "ok" });
      reload();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), kind: "err" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-3 mt-4">
      <div className="flex items-center gap-2">
        <Landmark className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">{L("საბანკო რეკვიზიტები (გადარიცხვისთვის)", "Bank details (for payouts)", "Банковские реквизиты (для выплат)")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        {L("ეს რეკვიზიტები ხილულია მხოლოდ თქვენთვის და ადმინისტრატორისთვის. მომხმარებელი ვერასდროს ხედავს.", "These details are visible only to you and the admin. Customers never see them.", "Эти реквизиты видны только вам и администратору. Клиенты их не увидят.")}
      </p>
      {loading ? (
        <div className="text-xs text-muted-foreground">{L("იტვირთება…", "Loading…", "Загрузка…")}</div>
      ) : (
        <>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{L("IBAN (22 სიმბოლო)", "IBAN (22 characters)", "IBAN (22 символа)")} *</span>
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value.replace(/\s+/g, "").toUpperCase().slice(0, 22))}
              placeholder="GE29NB0000000101904917"
              maxLength={22}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{L("ანგარიშის მფლობელი", "Account holder", "Владелец счёта")}</span>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder={L("შპს ...", "LLC ...", "ООО ...")}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          {msg && (
            <div className={`text-xs ${msg.kind === "err" ? "text-destructive" : "text-success"}`}>{msg.text}</div>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-semibold disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? L("ინახება…", "Saving…", "Сохраняем…") : L("საბანკოს შენახვა", "Save bank details", "Сохранить реквизиты")}
          </button>
        </>
      )}
    </div>
  );
}
