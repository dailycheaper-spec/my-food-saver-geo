import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
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

const StoreLocationPicker = lazy(() =>
  import("@/components/StoreLocationPicker").then((m) => ({ default: m.StoreLocationPicker }))
);

type EntityType = "company" | "individual_entrepreneur";

const STORE_TYPES = [
  { value: "restaurant", ka: "რესტორანი", en: "Restaurant", ru: "Ресторан" },
  { value: "bakery", ka: "საცხობი", en: "Bakery", ru: "Пекарня" },
  { value: "confectionery", ka: "საკონდიტრო", en: "Patisserie", ru: "Кондитерская" },
  { value: "cafe", ka: "კაფე", en: "Cafe", ru: "Кафе" },
  { value: "market", ka: "მარკეტი", en: "Market", ru: "Маркет" },
  { value: "grocery", ka: "სასურსათო", en: "Grocery", ru: "Продуктовый" },
  { value: "other", ka: "სხვა", en: "Other", ru: "Другое" },
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
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMsg(L("თქვენი ბრაუზერი ლოკაციის ავტომატურ განსაზღვრას არ უჭერს მხარს.", "Your browser doesn't support automatic location.", "Ваш браузер не поддерживает автоматическое определение местоположения."));
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setMsg(L("მდებარეობა წარმატებით განისაზღვრა.", "Location detected successfully.", "Местоположение определено."));
      },
      (err) => {
        setLocBusy(false);
        let text = L("მდებარეობის განსაზღვრა ვერ მოხერხდა. სცადეთ რუკაზე ხელით მონიშვნა.", "Couldn't detect location. Try picking it on the map.", "Не удалось определить местоположение. Отметьте на карте.");
        if (err.code === err.PERMISSION_DENIED) text = L("ლოკაციაზე წვდომა არ არის ნებადართული. მონიშნეთ ობიექტი რუკაზე.", "Location access denied. Please pick the store on the map.", "Доступ к геолокации запрещён. Отметьте магазин на карте.");
        else if (err.code === err.TIMEOUT) text = L("მდებარეობის განსაზღვრას ძალიან დიდი დრო დასჭირდა. სცადეთ ხელახლა.", "Location took too long. Try again.", "Определение местоположения заняло слишком много времени. Попробуйте снова.");
        setMsg(text);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    if (user?.email && !form.contact_email) setForm((prev) => ({ ...prev, contact_email: user.email ?? "" }));
  }, [form.contact_email, user?.email]);

  const pendingStore = useMemo(() => stores.find((s) => s.status === "pending"), [stores]);
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
      setMsg(L("გთხოვთ, მონიშნოთ ობიექტის მდებარეობა რუკაზე.", "Please mark the store location on the map.", "Пожалуйста, отметьте местоположение магазина на карте."));
      return;
    }
    const ibanNormalized = form.bank_iban.replace(/\s+/g, "").toUpperCase();
    if (!/^GE\d{2}[A-Z]{2}\d{16}$/.test(ibanNormalized)) {
      setMsg(language === "en" ? "Bank IBAN must be a valid Georgian IBAN (e.g. GE29NB0000000101904917)." : language === "ru" ? "IBAN должен быть в грузинском формате (напр. GE29NB0000000101904917)." : "საბანკო IBAN უნდა იყოს ქართული ფორმატით (მაგ. GE29NB0000000101904917).");
      return;
    }
    setSubmitting(true);
    setMsg("");
    const { data: existingPending } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existingPending) {
      setSubmitting(false);
      setMsg(language === "en" ? "You already have a pending application." : language === "ru" ? "У вас уже есть заявка на рассмотрении." : "თქვენ უკვე გაქვთ განაცხადი განხილვის პროცესში.");
      return;
    }
    // Strip fields that don't belong to `stores` and any preview blob url.
    const { bank_iban: _b, account_holder: _h, logo_url: _lu, ...storePayload } = form;
    const { data: newStore, error } = await supabase.from("stores").insert({
      ...storePayload,
      owner_id: user.id,
      status: "pending",
    }).select("id").single();
    if (error || !newStore) {
      setSubmitting(false);
      setMsg((language === "en" ? "Error: " : language === "ru" ? "Ошибка: " : "შეცდომა: ") + (error?.message ?? ""));
      return;
    }
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
    if (bankErr) setMsg((language === "en" ? "Error: " : language === "ru" ? "Ошибка: " : "შეცდომა: ") + bankErr.message);
    else {
      setMsg(t("applicationSent"));
      setTimeout(() => navigate({ to: "/partner" }), 1000);
    }
  }

  if (!partnerLoading && pendingStore) {
    const title = language === "en" ? "Your application is under review" : language === "ru" ? "Ваша заявка на рассмотрении" : "თქვენი განაცხადი განიხილება";
    const body = language === "en"
      ? "We'll notify you by email as soon as an admin approves your store. You don't need to submit again."
      : language === "ru"
      ? "Мы уведомим вас по электронной почте, как только администратор одобрит ваш магазин. Повторно отправлять заявку не нужно."
      : "როგორც კი ადმინი დაამტკიცებს თქვენს ობიექტს, გამოგიგზავნით შეტყობინებას ელ.ფოსტაზე. ხელახლა გაგზავნა საჭირო არ არის.";
    const submittedLabel = language === "en" ? "Submitted store" : language === "ru" ? "Отправленный магазин" : "გაგზავნილი ობიექტი";
    const backHome = language === "en" ? "Back to home" : language === "ru" ? "На главную" : "მთავარზე დაბრუნება";
    const supportLine = language === "en" ? "Questions? Email" : language === "ru" ? "Вопросы? Пишите на" : "შეკითხვები? მოგვწერეთ";
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
            {language === "en" ? "Required contact details" : language === "ru" ? "Обязательные контактные данные" : "სავალდებულო საკონტაქტო ინფორმაცია"}
          </div>
          <Field
            label={language === "en" ? "Email *" : language === "ru" ? "Эл. почта *" : "ელ. ფოსტა *"}
            value={form.contact_email}
            onChange={(v) => setForm({ ...form, contact_email: v })}
            placeholder="name@example.com"
            type="email"
            required
          />
          <Field
            label={language === "en" ? "Company name *" : language === "ru" ? "Название компании *" : "კომპანიის დასახელება *"}
            value={form.company_name}
            onChange={(v) => setForm({ ...form, company_name: v })}
            placeholder={language === "en" ? "LLC Example" : language === "ru" ? "ООО Пример" : "შპს მაგალითი"}
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
              ? (language === "en" ? "Personal ID (11 digits) *" : language === "ru" ? "Личный номер (11 цифр) *" : "პირადი ნომერი (11 ციფრი) *")
              : (language === "en" ? "Company ID number (9 digits) *" : language === "ru" ? "Идентификационный номер компании (9 цифр) *" : "კომპანიის საიდენტიფიკაციო ნომერი (9 ციფრი) *")}
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
            label={language === "en" ? "Bank IBAN (Georgian) *" : language === "ru" ? "Банковский IBAN (Грузия) *" : "საბანკო IBAN (ქართული) *"}
            value={form.bank_iban}
            onChange={(v) => setForm({ ...form, bank_iban: v.replace(/\s+/g, "").toUpperCase().slice(0, 22) })}
            placeholder="GE29NB0000000101904917"
            maxLength={22}
            required
          />
          <Field
            label={language === "en" ? "Account holder (optional)" : language === "ru" ? "Владелец счёта (необязательно)" : "ანგარიშის მფლობელი (არასავალდებულო)"}
            value={form.account_holder}
            onChange={(v) => setForm({ ...form, account_holder: v })}
            placeholder={language === "en" ? "Same as company name if empty" : language === "ru" ? "По умолчанию — название компании" : "თუ ცარიელია, კომპანიის სახელი გამოიყენება"}
          />
        </div>


        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            {language === "en" ? "What type of object is it? *" : language === "ru" ? "Какой это тип объекта? *" : "რა ტიპის ობიექტია? *"}
          </span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
            {STORE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{language === "en" ? type.en : language === "ru" ? type.ru : type.ka}</option>
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
            {language === "en" ? "City" : language === "ru" ? "Город" : "ქალაქი"}
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
            <h2 className="font-semibold text-sm">{L("ობიექტის მდებარეობა *", "Store location *", "Местоположение магазина *")}</h2>
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
