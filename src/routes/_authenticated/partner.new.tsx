import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/partner/new")({
  head: () => ({ meta: [{ title: "ახალი შეთავაზება — გემო" }] }),
  component: NewOfferPage,
});

const CATEGORIES = [
  { value: "meal", icon: "🍽", key: "meal" },
  { value: "bakery", icon: "🥐", key: "bakery" },
  { value: "grocery", icon: "🛒", key: "grocery" },
  { value: "produce", icon: "🥬", key: "produce" },
  { value: "dessert", icon: "🍰", key: "dessert" },
  { value: "other", icon: "📦", key: "other" },
];

function NewOfferPage() {
  const { t } = useI18n();
  const { stores } = useMyStores();
  const store = stores[0] ?? null;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "meal",
    original_price: "20",
    discounted_price: "7",
    quantity_available: "5",
    pickup_from: "18:00",
    pickup_to: "21:00",
    image_url: "",
    delivery_available: false,
  });

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    const payload = {
      store_id: store.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      original_price: Number(form.original_price),
      discounted_price: Number(form.discounted_price),
      quantity_available: Number(form.quantity_available),
      pickup_from: form.pickup_from,
      pickup_to: form.pickup_to,
      image_url: form.image_url.trim() || null,
      delivery_available: form.delivery_available,
      is_active: true,
    };
    const { error } = await supabase.from("offers").insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    navigate({ to: "/partner/offers" });
  }

  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>
      <h1 className="font-display text-2xl font-bold mb-1">{t("newOffer")}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t("fillAndPublish")}</p>

      <form onSubmit={publish} className="space-y-4">
        <div>
          <Label>{t("photoUrl")}</Label>
          <div className="relative">
            <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
              className="w-full pl-9 pr-3 py-3 rounded-2xl bg-muted/40 border border-border text-sm"
            />
          </div>
          {form.image_url && (
            <img src={form.image_url} alt="preview" className="mt-2 w-full h-40 object-cover rounded-2xl" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>

        <Field label={t("productName")} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />

        <div>
          <Label>{t("category")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, category: c.value })}
                className={`py-2.5 rounded-xl text-xs font-medium border ${
                  form.category === c.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
                }`}
              >
                {c.icon} {t(c.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("originalPrice")} type="number" step="0.01" value={form.original_price} onChange={(v) => setForm({ ...form, original_price: v })} required />
          <Field label={t("discountedPrice")} type="number" step="0.01" value={form.discounted_price} onChange={(v) => setForm({ ...form, discounted_price: v })} required />
        </div>

        <Field label={t("quantity")} type="number" value={form.quantity_available} onChange={(v) => setForm({ ...form, quantity_available: v })} required />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("pickupStart")} type="time" value={form.pickup_from} onChange={(v) => setForm({ ...form, pickup_from: v })} />
          <Field label={t("pickupEnd")} type="time" value={form.pickup_to} onChange={(v) => setForm({ ...form, pickup_to: v })} />
        </div>

        <Field label={t("description")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

        <label className="flex items-center gap-2 text-sm py-2">
          <input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} className="w-5 h-5 rounded" />
          {t("deliveryAvailable")}
        </label>

        <button
          type="submit"
          disabled={saving || !form.title}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50"
        >
          {saving ? t("creating") : `🚀 ${t("publish")}`}
        </button>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground mb-1.5">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required, step }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; step?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-3 rounded-2xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
      />
    </label>
  );
}
