import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Save, MapPin, LocateFixed, Landmark, CalendarClock } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { VisibilityRadiusSelector } from "@/components/VisibilityRadiusSelector";
import { isValidLatLng } from "@/lib/geo";
import { useStoreBankAccount, upsertStoreBankAccount, isValidGeorgianIban, normalizeIban } from "@/lib/bank-account";
import { StoreLogoPicker } from "@/components/StoreLogoPicker";
import { SETTLEMENT_CYCLES, type SettlementCycle } from "@/lib/contracts";

type EntityType = "company" | "individual_entrepreneur";

import MapAddressField from "@/components/address/MapAddressField";


const STORE_TYPES: { value: string; ka: string; en: string; ru: string; tr: string; fa: string }[] = [
  { value: "restaurant", ka: "რესტორანი", en: "Restaurant", ru: "Ресторан", tr: "Restoran", fa: "رستوران" },
  { value: "bakery", ka: "საცხობი", en: "Bakery", ru: "Пекарня", tr: "Fırın", fa: "نانوایی" },
  { value: "confectionery", ka: "საკონდიტრო", en: "Patisserie", ru: "Кондитерская", tr: "Pastane", fa: "شیرینی‌فروشی" },
  { value: "home_kitchen", ka: "საოჯახო სამზრეულო", en: "Home Kitchen", ru: "Домашняя кухня", tr: "Ev Mutfağı", fa: "آشپزخانه خانگی" },
  { value: "cafe", ka: "კაფე", en: "Cafe", ru: "Кафе", tr: "Kafe", fa: "کافه" },
  { value: "market", ka: "მარკეტი", en: "Market", ru: "Маркет", tr: "Market", fa: "بازار" },
  { value: "grocery", ka: "სასურსათო", en: "Grocery", ru: "Продукты", tr: "Bakkal", fa: "خواربارفروشی" },
  { value: "other", ka: "სხვა", en: "Other", ru: "Другое", tr: "Diğer", fa: "سایر" },
];

export const Route = createFileRoute("/_authenticated/partner/store")({
  head: () => ({ meta: [{ title: "Store — Cheaper" }] }),
  component: StoreSettings,
});

type FormState = {
  name: string;
  name_en: string;
  name_ru: string;
  logo: string;
  logo_url: string | null;
  entity_type: EntityType;
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
  representative_name: string;
  contact_email: string;
  settlement_cycle: SettlementCycle;
  settlement_day: number | null;
};

function StoreSettings() {
  const { t, language } = useI18n();
  const { stores, loading, reload } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const [form, setForm] = useState<FormState>({
    name: "",
    name_en: "",
    name_ru: "",
    logo: "",
    logo_url: null,
    entity_type: "company",
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
    representative_name: "",
    contact_email: "",
    settlement_cycle: "weekly",
    settlement_day: 1,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const initialFormRef = useRef<FormState | null>(null);
  const isDirty = initialFormRef.current !== null && JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

  useEffect(() => {
    if (store) {
      const anyStore = store as unknown as Record<string, unknown>;
      const next: FormState = {
        name: store.name,
        name_en: (anyStore.name_en as string | null) ?? "",
        name_ru: (anyStore.name_ru as string | null) ?? "",
        logo: store.logo ?? "",
        logo_url: (anyStore.logo_url as string | null) ?? null,
        entity_type: ((anyStore.entity_type as string | null) === "individual_entrepreneur" ? "individual_entrepreneur" : "company") as EntityType,
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
        representative_name: (anyStore.representative_name as string | null) ?? "",
        contact_email: (anyStore.contact_email as string | null) ?? "",
        settlement_cycle: (SETTLEMENT_CYCLES as readonly string[]).includes(String(anyStore.settlement_cycle))
          ? (anyStore.settlement_cycle as SettlementCycle)
          : "weekly",
        settlement_day:
          typeof anyStore.settlement_day === "number" ? (anyStore.settlement_day as number) : 1,
      };
      setForm(next);
      initialFormRef.current = next;
    }
  }, [store]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noStoreShort")}</div>;

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg({ text: t("partner.apply.geoUnsupported"), kind: "err" });
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setMsg({ text: t("partner.apply.geoSuccess"), kind: "ok" });
      },
      (err) => {
        setLocBusy(false);
        let text = t("partner.apply.geoFailed");
        if (err.code === err.PERMISSION_DENIED) text = t("partner.apply.geoDenied");
        else if (err.code === err.TIMEOUT) text = t("partner.apply.geoTimeout");
        setMsg({ text, kind: "err" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;

    if (!isValidLatLng(form.lat, form.lng)) {
      setMsg({ text: t("partner.apply.markLocation"), kind: "err" });
      return;
    }

    setSaving(true);
    setMsg(null);
    const cid = form.company_id_number.trim();
    const idLen = form.entity_type === "individual_entrepreneur" ? 11 : 9;
    if (cid && !new RegExp(`^\\d{${idLen}}$`).test(cid)) {
      setSaving(false);
      setMsg({ text: t(idLen === 11 ? "idInvalid11" : "idInvalid9"), kind: "err" });
      return;
    }
    const payload = {
      name: form.name,
      name_en: form.name_en.trim() || null,
      name_ru: form.name_ru.trim() || null,
      logo: form.logo,
      logo_url: form.logo_url,
      entity_type: form.entity_type,
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
      representative_name: form.representative_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      settlement_cycle: form.settlement_cycle,
      settlement_day: form.settlement_cycle === "daily" ? null : (form.settlement_day ?? 1),
    } as never;
    const { error } = await supabase.from("stores").update(payload).eq("id", store.id);
    setSaving(false);
    if (error) setMsg({ text: t("errorPrefix") + error.message, kind: "err" });
    else {
      setMsg({ text: t("savedMsg"), kind: "ok" });
      initialFormRef.current = form;
      reload();
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-1">{t("storeSettingsTitle")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("statusLbl")}: <span className="font-semibold text-success">{store.status}</span></p>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("partner.store.typeLabel")} *</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            {STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{language === "en" ? type.en : language === "ru" ? type.ru : language === "tr" ? type.tr : language === "fa" ? type.fa : type.ka}</option>)}
          </select>
        </label>
        <Field label={t("nameLbl")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label={t("storeNameEnOptional")} value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} />
        <Field label={t("storeNameRuOptional")} value={form.name_ru} onChange={(v) => setForm({ ...form, name_ru: v })} />
        <StoreLogoPicker
          storeId={store.id}
          logoUrl={form.logo_url}
          logoEmoji={form.logo || "🏪"}
          onChange={(next) => setForm((prev) => ({
            ...prev,
            logo: next.logo ?? prev.logo,
            logo_url: next.logo_url === undefined ? prev.logo_url : next.logo_url,
          }))}
        />
        <Field label={t("districtLbl")} value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
        <Field label={t("addressLbl")} value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label={t("phoneLbl")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label={t("descriptionLbl")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 mt-4">
        <h2 className="font-semibold">{t("partner.store.companyDetails")}</h2>
        <Field label={t("partner.store.companyNameLabel")} value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} placeholder={t("partner.store.companyNamePlaceholder")} />
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("entityTypeLabel")}</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["company", "individual_entrepreneur"] as EntityType[]).map((et) => (
              <button
                type="button"
                key={et}
                onClick={() => setForm({ ...form, entity_type: et, company_id_number: "" })}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium ${form.entity_type === et ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
              >
                {et === "company" ? t("entityCompany") : t("entityIndividual")}
              </button>
            ))}
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            {form.entity_type === "individual_entrepreneur"
              ? t("partner.apply.personalIdShort")
              : t("partner.apply.companyIdShort")}
          </span>
          <input
            value={form.company_id_number}
            onChange={(e) => {
              const max = form.entity_type === "individual_entrepreneur" ? 11 : 9;
              setForm({ ...form, company_id_number: e.target.value.replace(/\D/g, "").slice(0, max) });
            }}
            inputMode="numeric"
            maxLength={form.entity_type === "individual_entrepreneur" ? 11 : 9}
            placeholder={form.entity_type === "individual_entrepreneur" ? "01234567890" : "123456789"}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </label>
        <Field
          label={t("partner.apply.representativeLabel")}
          value={form.representative_name}
          onChange={(v) => setForm({ ...form, representative_name: v })}
          placeholder={t("partner.apply.representativePlaceholder")}
        />
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("partner.store.emailLabel")}</span>
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
          <h2 className="font-semibold">{t("partner.apply.locationHeadingShort")}</h2>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locBusy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-60"
        >
          <LocateFixed className="w-4 h-4" />
          {locBusy ? t("partner.apply.geoDetecting") : t("partner.apply.useCurrentLocation")}
        </button>

        <MapAddressField
          value={{ lat: form.lat, lng: form.lng }}
          onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))}
          radiusKm={form.visibility_radius_km < 50 ? form.visibility_radius_km : undefined}
          storageKey="cheaper-partner-store-map"
          onAddressResolved={(a) => setForm((f) => (f.address.trim() ? f : { ...f, address: a }))}
        />

        <p className="text-xs text-muted-foreground">
          {t("partner.store.locationAreaHint")}
        </p>


      </div>

      {/* Radius section */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3 mt-4">
        <h2 className="font-semibold">{t("partner.store.visibilityRadiusHeading")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("partner.store.visibilityRadiusHint")}
        </p>
        <VisibilityRadiusSelector
          value={form.visibility_radius_km}
          onChange={(v) => setForm((f) => ({ ...f, visibility_radius_km: v }))}
        />
      </div>

      {/* Settlement cycle */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3 mt-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">{t("partner.store.settlement.heading")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("partner.store.settlement.hint")}</p>
        <div className="grid grid-cols-3 gap-2">
          {SETTLEMENT_CYCLES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  settlement_cycle: c,
                  settlement_day: c === "daily" ? null : c === "weekly" ? 1 : 1,
                }))
              }
              className={`px-2 py-2.5 rounded-xl border text-xs font-medium leading-tight whitespace-normal break-words text-center ${form.settlement_cycle === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
            >
              {t(`partner.store.settlement.${c}`)}
            </button>
          ))}
        </div>

        {form.settlement_cycle === "weekly" && (
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">
              {t("partner.store.settlement.dayOfWeek")}
            </span>
            <select
              value={form.settlement_day ?? 1}
              onChange={(e) => setForm((f) => ({ ...f, settlement_day: Number(e.target.value) }))}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {t(`partner.store.settlement.weekday.${d}`)}
                </option>
              ))}
            </select>
          </label>
        )}

        {form.settlement_cycle === "monthly" && (
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">
              {t("partner.store.settlement.dayOfMonth")}
            </span>
            <select
              value={form.settlement_day ?? 1}
              onChange={(e) => setForm((f) => ({ ...f, settlement_day: Number(e.target.value) }))}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
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
        disabled={saving || !isDirty}
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
  const { t } = useI18n();
  const { bank, loading, reload } = useStoreBankAccount(storeId);
  const [iban, setIban] = useState("");
  const [holder, setHolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const initialRef = useRef({ iban: "", holder: "" });
  const isDirty = iban !== initialRef.current.iban || holder !== initialRef.current.holder;

  useEffect(() => {
    if (bank) {
      setIban(bank.iban);
      setHolder(bank.account_holder ?? "");
      initialRef.current = { iban: bank.iban, holder: bank.account_holder ?? "" };
    }
  }, [bank]);

  async function save() {
    setMsg(null);
    const normalized = normalizeIban(iban);
    if (!isValidGeorgianIban(normalized)) {
      setMsg({ text: t("validation.ibanFormat"), kind: "err" });
      return;
    }
    setSaving(true);
    try {
      await upsertStoreBankAccount(storeId, normalized, holder.trim() || null);
      setMsg({ text: t("partner.store.bankSaved"), kind: "ok" });
      initialRef.current = { iban, holder };
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
        <h2 className="font-semibold">{t("partner.store.bankDetailsHeading")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("partner.store.bankDetailsHint")}
      </p>
      {loading ? (
        <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{t("partner.store.ibanLabel")} *</span>
            <input
              value={iban}
              onChange={(e) => setIban(e.target.value.replace(/\s+/g, "").toUpperCase().slice(0, 22))}
              placeholder="GE29NB0000000101904917"
              maxLength={22}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{t("partner.store.accountHolderLabel")}</span>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder={t("partner.store.companyNamePlaceholder")}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          {msg && (
            <div className={`text-xs ${msg.kind === "err" ? "text-destructive" : "text-success"}`}>{msg.text}</div>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-semibold disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? t("partner.store.savingEllipsis") : t("partner.store.saveBankButton")}
          </button>
        </>
      )}
    </div>
  );
}
