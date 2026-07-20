import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DISTRICTS } from "@/lib/mock-data";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { CITIES, cityLabel, type City } from "@/lib/city";

const STORE_TYPES = [
  { value: "restaurant", ka: "რესტორანი", en: "Restaurant", ru: "Ресторан" },
  { value: "bakery", ka: "საცხობი", en: "Bakery", ru: "Пекарня" },
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
  const navigate = useNavigate();
  const [form, setForm] = useState<{ name: string; logo: string; category: string; city: City; district: string; address: string; phone: string; contact_email: string; company_id_number: string; description: string }>({ name: "", logo: "🏪", category: "restaurant", city: "თბილისი", district: "ვაკე", address: "", phone: "", contact_email: "", company_id_number: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (user?.email && !form.contact_email) setForm((prev) => ({ ...prev, contact_email: user.email ?? "" }));
  }, [form.contact_email, user?.email]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setMsg("");
    const { error } = await supabase.from("stores").insert({
      ...form,
      owner_id: user.id,
      status: "pending",
    });
    setSubmitting(false);
    if (error) setMsg("შეცდომა: " + error.message);
    else {
      setMsg(t("applicationSent"));
      setTimeout(() => navigate({ to: "/partner" }), 1000);
    }
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
        <Field label={t("logoEmoji")} value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} placeholder="🥐" />

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
        <Field label={language === "en" ? "Company ID number *" : language === "ru" ? "Идентификационный номер компании *" : "კომპანიის საიდენტიფიკაციო ნომერი *"} value={form.company_id_number} onChange={(v) => setForm({ ...form, company_id_number: v })} required />
        <Field label={language === "en" ? "Email *" : language === "ru" ? "Эл. почта *" : "მეილი *"} value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="name@example.com" type="email" required />
        <Field label={t("phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+995..." />
        <Field label={t("description")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />

        <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
          {submitting ? t("sending") : t("submitApplication")}
        </button>
        {msg && <div className="text-sm text-center">{msg}</div>}
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} rows={3}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      )}
    </label>
  );
}
