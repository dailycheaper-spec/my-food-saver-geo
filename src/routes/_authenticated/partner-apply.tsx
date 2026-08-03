import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Store, ArrowLeft, Clock, MapPin, LocateFixed } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DISTRICTS } from "@/lib/mock-data";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { CITIES, cityLabel, type City } from "@/lib/city";
import { usePartnerAccount } from "@/lib/db";
import { StoreLogoPicker } from "@/components/StoreLogoPicker";
import { StoreLogo } from "@/components/StoreLogo";
import { isValidLatLng } from "@/lib/geo";
import { useServerFn } from "@tanstack/react-start";
import { logApplicationSubmitted, resubmitStoreApplication } from "@/lib/partner-store.functions";
import { AlertTriangle } from "lucide-react";

import MapAddressField from "@/components/address/MapAddressField";


type EntityType = "company" | "individual_entrepreneur";

const STORE_TYPES = [
  { value: "restaurant", ka: "რესტორანი", en: "Restaurant", ru: "Ресторан", tr: "Restoran", fa: "رستوران" },
  { value: "bakery", ka: "საცხობი", en: "Bakery", ru: "Пекарня", tr: "Fırın", fa: "نانوایی" },
  { value: "confectionery", ka: "საკონდიტრო", en: "Patisserie", ru: "Кондитерская", tr: "Pastane", fa: "شیرینی‌فروشی" },
  { value: "home_kitchen", ka: "საოჯახო სამზრეულო", en: "Home Kitchen", ru: "Домашняя кухня", tr: "Ev Mutfağı", fa: "آشپزخانه خانگی" },
  { value: "cafe", ka: "კაფე", en: "Cafe", ru: "Кафе", tr: "Kafe", fa: "کافه" },
  { value: "market", ka: "მარკეტი", en: "Market", ru: "Маркет", tr: "Market", fa: "بازار" },
  { value: "grocery", ka: "სასურსათო", en: "Grocery", ru: "Продуктовый", tr: "Bakkal", fa: "خواربارفروشی" },
  { value: "other", ka: "სხვა", en: "Other", ru: "Другое", tr: "Diğer", fa: "سایر" },
];

export const Route = createFileRoute("/_authenticated/partner-apply")({
  head: () => ({ meta: [{ title: "გახდი პარტნიორი — Cheaper" }] }),
  component: PartnerApply,
});

function PartnerApply() {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { stores, loading: partnerLoading } = usePartnerAccount();
  const navigate = useNavigate();
  const [form, setForm] = useState<{ name: string; logo: string; logo_url: string | null; entity_type: EntityType; category: string; city: City; district: string; address: string; phone: string; contact_email: string; company_name: string; company_id_number: string; description: string; bank_iban: string; account_holder: string; lat: number | null; lng: number | null }>({ name: "", logo: "🏪", logo_url: null, entity_type: "company", category: "restaurant", city: "თბილისი", district: "ვაკე", address: "", phone: "", contact_email: "", company_name: "", company_id_number: "", description: "", bank_iban: "", account_holder: "", lat: null, lng: null });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [editingRejected, setEditingRejected] = useState(false);
  const resubmitFn = useServerFn(resubmitStoreApplication);
  const logSubmittedFn = useServerFn(logApplicationSubmitted);

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg(t("partner.apply.geoUnsupported"));
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setMsg(t("partner.apply.geoSuccess"));
      },
      (err) => {
        setLocBusy(false);
        let text = t("partner.apply.geoFailed");
        if (err.code === err.PERMISSION_DENIED) text = t("partner.apply.geoDenied");
        else if (err.code === err.TIMEOUT) text = t("partner.apply.geoTimeout");
        setMsg(text);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    if (user?.email && !form.contact_email) setForm((prev) => ({ ...prev, contact_email: user.email ?? "" }));
  }, [form.contact_email, user?.email]);

  const pendingStore = useMemo(
    () => stores.find((s) => s.status === "pending_verification" || s.status === "pending_documents"),
    [stores],
  );
  const rejectedStore = useMemo(() => stores.find((s) => s.status === "rejected"), [stores]);
  const hasActive = useMemo(() => stores.some((s) => s.status === "active"), [stores]);

  useEffect(() => {
    if (!partnerLoading && hasActive) {
      navigate({ to: "/partner", replace: true });
    }
  }, [navigate, partnerLoading, hasActive]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const idDigits = form.entity_type === "individual_entrepreneur" ? 11 : 9;
    if (!new RegExp(`^\\d{${idDigits}}$`).test(form.company_id_number)) {
      setMsg(t(idDigits === 11 ? "idInvalid11" : "idInvalid9"));
      return;
    }
    if (!isValidLatLng(form.lat, form.lng)) {
      setMsg(t("partner.apply.markLocation"));
      return;
    }
    const ibanNormalized = form.bank_iban.replace(/\s+/g, "").toUpperCase();
    if (!editingRejected && !/^GE\d{2}[A-Z]{2}\d{16}$/.test(ibanNormalized)) {
      setMsg(t("validation.ibanFormat"));
      return;
    }

    // Correcting a rejected application: update in place and send back for review.
    if (editingRejected && rejectedStore) {
      setSubmitting(true);
      setMsg("");
      try {
        await resubmitFn({
          data: {
            storeId: rejectedStore.id,
            patch: {
              name: form.name,
              logo: form.logo,
              entity_type: form.entity_type,
              category: form.category,
              city: form.city,
              district: form.district,
              address: form.address,
              phone: form.phone || null,
              contact_email: form.contact_email,
              company_name: form.company_name || null,
              company_id_number: form.company_id_number,
              description: form.description || null,
              lat: form.lat as number,
              lng: form.lng as number,
            },
          },
        });
        setMsg(t("applicationSent"));
        setTimeout(() => navigate({ to: "/partner" }), 1000);
      } catch (err) {
        setMsg(t("partner.apply.errorPrefix") + (err instanceof Error ? err.message : String(err)));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true);
    setMsg("");
    const { data: existingPending } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .in("status", ["pending_verification", "pending_documents"])
      .maybeSingle();
    if (existingPending) {
      setSubmitting(false);
      setMsg(t("partner.apply.pendingExists"));
      return;
    }
    // Strip fields that don't belong to `stores` and any preview blob url.
    const { bank_iban: _b, account_holder: _h, logo_url: _lu, ...storePayload } = form;
    const { data: newStore, error } = await supabase.from("stores").insert({
      ...storePayload,
      owner_id: user.id,
      status: "pending_verification",
    }).select("id").single();
    if (error || !newStore) {
      setSubmitting(false);
      setMsg(t("partner.apply.errorPrefix") + (error?.message ?? ""));
      return;
    }
    try {
      await logSubmittedFn({ data: { storeId: newStore.id } });
    } catch (err) { console.error("verification log failed", err); }
    // Upload logo image if one was selected during the form.
    if (logoFile) {
      try {
        const path = `${newStore.id}/logo-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("store-logos")
          .upload(path, logoFile, { contentType: logoFile.type, upsert: true, cacheControl: "3600" });
        if (!upErr) {
          const { data: signed } = await supabase.storage
            .from("store-logos").createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
          if (signed?.signedUrl) {
            await supabase.from("stores").update({ logo_url: signed.signedUrl }).eq("id", newStore.id);
          }
        }
      } catch (err) { console.error("logo upload failed", err); }
    }
    const { error: bankErr } = await supabase.from("store_bank_accounts").insert({
      store_id: newStore.id,
      iban: ibanNormalized,
      account_holder: form.account_holder.trim() || form.company_name.trim() || null,
    });
    setSubmitting(false);
    if (bankErr) setMsg(t("partner.apply.errorPrefix") + bankErr.message);
    else {
      setMsg(t("applicationSent"));
      setTimeout(() => navigate({ to: "/partner" }), 1000);
    }
  }

  if (!partnerLoading && rejectedStore && !editingRejected) {
    const raw = rejectedStore as unknown as { rejection_reason?: string | null; rejected_at?: string | null; admin_notes?: string | null };
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-destructive/10 mb-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold">{t("partner.apply.rejectedTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("partner.apply.rejectedBody")}</p>
          {raw.rejection_reason && (
            <div className="mt-4 rounded-xl bg-destructive/5 border border-destructive/30 p-3 text-left text-sm">
              <div className="text-xs text-muted-foreground">{t("partner.apply.rejectedReason")}</div>
              <div className="font-semibold text-destructive">{t(`admin.partners.reason.${raw.rejection_reason}`)}</div>
              {raw.admin_notes && <p className="text-xs text-muted-foreground mt-1">{raw.admin_notes}</p>}
            </div>
          )}
          <button
            onClick={() => {
              const st = rejectedStore as unknown as Record<string, unknown>;
              setForm((f) => ({
                ...f,
                name: String(st.name ?? ""),
                logo: String(st.logo ?? "🏪"),
                entity_type: (st.entity_type as EntityType) ?? "company",
                category: String(st.category ?? "restaurant"),
                city: (st.city as City) ?? f.city,
                district: String(st.district ?? f.district),
                address: String(st.address ?? ""),
                phone: String(st.phone ?? ""),
                contact_email: String(st.contact_email ?? f.contact_email),
                company_name: String(st.company_name ?? ""),
                company_id_number: String(st.company_id_number ?? ""),
                description: String(st.description ?? ""),
                lat: typeof st.lat === "number" ? st.lat : null,
                lng: typeof st.lng === "number" ? st.lng : null,
              }));
              setEditingRejected(true);
            }}
            className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            {t("partner.apply.fixAndResubmit")}
          </button>
          <div className="text-xs text-muted-foreground mt-4">{t("partner.apply.supportLine")} <a href="mailto:dailycheaper@gmail.com" className="underline">dailycheaper@gmail.com</a></div>
        </div>
      </div>
    );
  }

  if (!partnerLoading && pendingStore) {
    const title = t("partner.apply.pendingTitle");
    const body = t("partner.apply.pendingBody");
    const submittedLabel = t("partner.apply.submittedStore");
    const backHome = t("partner.apply.backHome");
    const supportLine = t("partner.apply.supportLine");
    return (
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="flex justify-end mb-3"><LanguageSwitcher /></div>
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-amber-500/10 mb-3">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{body}</p>
          <div className="mt-4 rounded-xl bg-muted/40 border border-border p-3 text-left">
            <div className="text-xs text-muted-foreground">{submittedLabel}</div>
            <div className="font-semibold flex items-center gap-2">
              <span className="w-8 h-8 grid place-items-center overflow-hidden rounded-lg bg-secondary">
                <StoreLogo value={(pendingStore as unknown as { logo_url?: string | null }).logo_url || pendingStore.logo} emojiClassName="text-xl" />
              </span>
              {pendingStore.name}
            </div>
          </div>
          <Link to="/" className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">{backHome}</Link>
          <div className="text-xs text-muted-foreground mt-4">{supportLine} <a href="mailto:dailycheaper@gmail.com" className="underline">dailycheaper@gmail.com</a></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>
      <div className="flex justify-end mb-3"><LanguageSwitcher /></div>

      <div className="text-center mb-6">
        <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-primary/10 mb-3">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">{t("becomePartner")}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("partnerApplyText")}
        </p>
      </div>

      <form onSubmit={submit} className="bg-card rounded-2xl border border-border p-5 space-y-3">
        {/* Highlighted required contact block */}
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("partner.apply.requiredContact")}
          </div>
          <Field
            label={t("partner.apply.emailLabel")}
            value={form.contact_email}
            onChange={(v) => setForm({ ...form, contact_email: v })}
            placeholder="name@example.com"
            type="email"
            required
          />
          <Field
            label={t("partner.apply.companyNameLabel")}
            value={form.company_name}
            onChange={(v) => setForm({ ...form, company_name: v })}
            placeholder={t("partner.apply.companyNamePlaceholder")}
            required
          />
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
          <Field
            label={form.entity_type === "individual_entrepreneur"
              ? t("partner.apply.personalIdLabel")
              : t("partner.apply.companyIdLabel")}
            value={form.company_id_number}
            onChange={(v) => {
              const max = form.entity_type === "individual_entrepreneur" ? 11 : 9;
              setForm({ ...form, company_id_number: v.replace(/\D/g, "").slice(0, max) });
            }}
            placeholder={form.entity_type === "individual_entrepreneur" ? "01234567890" : "123456789"}
            inputMode="numeric"
            pattern={form.entity_type === "individual_entrepreneur" ? "\\d{11}" : "\\d{9}"}
            maxLength={form.entity_type === "individual_entrepreneur" ? 11 : 9}
            required
          />
          <Field
            label={t("partner.apply.ibanLabel")}
            value={form.bank_iban}
            onChange={(v) => setForm({ ...form, bank_iban: v.replace(/\s+/g, "").toUpperCase().slice(0, 22) })}
            placeholder="GE29NB0000000101904917"
            maxLength={22}
            required
          />
          <Field
            label={t("partner.apply.accountHolderLabel")}
            value={form.account_holder}
            onChange={(v) => setForm({ ...form, account_holder: v })}
            placeholder={t("partner.apply.accountHolderPlaceholder")}
          />
        </div>


        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            {t("partner.apply.objectTypeLabel")}
          </span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
            {STORE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{language === "en" ? type.en : language === "ru" ? type.ru : language === "tr" ? type.tr : language === "fa" ? type.fa : type.ka}</option>
            ))}
          </select>
        </label>

        <Field label={t("storeName")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <StoreLogoPicker
          logoUrl={form.logo_url}
          logoEmoji={form.logo}
          onChange={(next) => setForm((prev) => ({ ...prev, ...next, logo: next.logo ?? prev.logo, logo_url: next.logo_url === undefined ? prev.logo_url : next.logo_url }))}
          onFileSelected={setLogoFile}
        />

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            {t("partner.apply.cityLabel")}
          </span>
          <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value as City })}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
            {CITIES.map((c) => <option key={c} value={c}>{cityLabel(c, language)}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("district")}</span>
          <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
            {DISTRICTS.filter((d) => d !== "ყველა უბანი").map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <Field label={`${t("address")} *`} value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
        <Field label={t("phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+995..." />
        <Field label={t("description")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />

        <div className="rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">{t("partner.apply.locationHeading")}</h2>
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
            storageKey="cheaper-partner-apply-map"
            city={form.city}
            onAddressResolved={(a) => setForm((f) => (f.address.trim() ? f : { ...f, address: a }))}
          />
        </div>


        <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
          {submitting ? t("sending") : t("submitApplication")}
        </button>
        {msg && <div className="text-sm text-center">{msg}</div>}
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, required, type = "text", inputMode, pattern, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; required?: boolean; type?: string; inputMode?: "numeric" | "text" | "tel" | "email"; pattern?: string; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} rows={3}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
          inputMode={inputMode} pattern={pattern} maxLength={maxLength}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      )}
    </label>
  );
}
