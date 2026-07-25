import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { DiscountFields, computePct, MIN_DISCOUNT_PCT } from "@/components/DiscountFields";
import { useI18n } from "@/lib/i18n";
import { ALLERGEN_KEYS, allergenLabel } from "@/lib/allergens";
import { OfferPhotoPicker } from "@/components/OfferPhotoPicker";

export const Route = createFileRoute("/_authenticated/partner/new")({
  head: () => ({ meta: [{ title: "ახალი შეთავაზება — Cheaper" }] }),
  component: NewOfferPage,
});

const CATEGORIES = [
  { value: "meal", icon: "🍽", key: "meal" },
  { value: "bakery", icon: "🥐", key: "bakery" },
  { value: "pizza", icon: "🍕", key: "pizza" },
  { value: "sushi", icon: "🍣", key: "sushi" },
  { value: "grocery", icon: "🛒", key: "grocery" },
  { value: "produce", icon: "🥬", key: "produce" },
  { value: "dessert", icon: "🍰", key: "dessert" },
  { value: "other", icon: "📦", key: "other" },
];

const SURPRISE_L10N = {
  ka: {
    contentsLabel: "🎁 შესაძლო შიგთავსი",
    contentsHint: "ჩამოთვალე საგნები, რომლებიც შეიძლება მოხვდეს ბოქსში (მომხმარებელი დაინახავს ამას აღწერაში).",
    contentsPh: "მაგ: ხაჭაპური, ლიმონათი, ნამცხვარი, ხილი...",
    valueLabel: "სავარაუდო რეალური ღირებულება (₾)",
    valueHint: "შეიტანე ბოქსში მოთავსებული პროდუქტების საერთო ღირებულება — ეს დაეხმარება ფასდაკლების ავტომატურ დათვლას.",
    useAsOriginal: "გამოიყენე თავდაპირველ ფასად",
  },
  en: {
    contentsLabel: "🎁 Possible contents",
    contentsHint: "List items that may be in the box (visible to the customer in the description).",
    contentsPh: "e.g. khachapuri, lemonade, cake, fruit...",
    valueLabel: "Estimated real value (GEL)",
    valueHint: "Enter the total value of items in the box — helps you set the original price and discount.",
    useAsOriginal: "Use as original price",
  },
  ru: {
    contentsLabel: "🎁 Возможный состав",
    contentsHint: "Перечисли, что может быть в боксе (это увидит покупатель в описании).",
    contentsPh: "напр.: хачапури, лимонад, торт, фрукты...",
    valueLabel: "Примерная реальная стоимость (₾)",
    valueHint: "Введи общую стоимость продуктов в боксе — поможет рассчитать скидку.",
    useAsOriginal: "Использовать как исходную цену",
  },
} as const;

function NewOfferPage() {
  const { t, language } = useI18n();
  const sl = SURPRISE_L10N[language];
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const generateImg = useServerFn(generateOfferImage);
  const [form, setForm] = useState({
    title: "",
    title_en: "",
    title_ru: "",
    description: "",
    description_en: "",
    description_ru: "",
    category: "meal",
    original_price: "20",
    discounted_price: "7",
    quantity_available: "5",
    pickup_from: "18:00",
    pickup_to: "21:00",
    image_url: "",
    delivery_available: false,
    is_surprise: false,
    surprise_contents: "",
    surprise_value: "",
    allergens: [] as string[],
  });
  const [imgError, setImgError] = useState(false);



  async function handleAiGenerate() {
    const prompt = form.title.trim() || form.description.trim();
    if (!prompt) { alert(t("productName")); return; }
    setGeneratingImg(true);
    try {
      const r = (await generateImg({ data: { prompt } })) as { dataUrl: string };
      setForm((f) => ({ ...f, image_url: r.dataUrl }));
    } catch (e: any) {
      alert("AI: " + e.message);
    }
    setGeneratingImg(false);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image_url: String(reader.result) }));
    reader.readAsDataURL(file);
  }


  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    const orig = Number(form.original_price);
    const disc = Number(form.discounted_price);
    if (computePct(orig, disc) < MIN_DISCOUNT_PCT) {
      alert(t("minDiscount50"));
      return;
    }
    setSaving(true);
    const contents = form.surprise_contents.trim();
    const baseDesc = form.description.trim();
    const finalDesc = form.is_surprise && contents
      ? (baseDesc ? `${baseDesc}\n\n${sl.contentsLabel}: ${contents}` : `${sl.contentsLabel}: ${contents}`)
      : baseDesc;
    const payload = {
      store_id: store.id,
      title: form.title.trim(),
      title_en: form.title_en.trim() || null,
      title_ru: form.title_ru.trim() || null,
      description: finalDesc,
      description_en: form.description_en.trim() || null,
      description_ru: form.description_ru.trim() || null,
      category: form.category,
      original_price: orig,
      discounted_price: disc,
      quantity_available: Number(form.quantity_available),
      pickup_from: form.pickup_from,
      pickup_to: form.pickup_to,
      image_url: form.image_url.trim() || null,
      delivery_available: form.delivery_available,
      is_surprise: form.is_surprise,
      is_active: true,
      allergens: form.allergens.length ? form.allergens : null,
    };


    const { error } = await supabase.from("offers").insert(payload);
    setSaving(false);
    if (error) { alert(error.message); return; }
    navigate({ to: "/partner/offers" });
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
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
          <Label>{t("photo")}</Label>
          {form.image_url && !imgError && (
            <img
              src={form.image_url}
              alt="preview"
              className="mb-2 w-full h-48 object-cover rounded-2xl"
              onLoad={() => setImgError(false)}
              onError={() => setImgError(true)}
            />
          )}
          {imgError && form.image_url && (
            <div className="mb-2 flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t("imageLoadFailed")}</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={generatingImg}
              className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
            >
              {generatingImg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {generatingImg ? t("generating") : t("generateWithAi")}
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-muted border border-border text-xs font-medium"
            >
              <Camera className="w-5 h-5" />
              {t("takePhoto")}
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-muted border border-border text-xs font-medium"
            >
              <Upload className="w-5 h-5" />
              {t("uploadPhoto")}
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { setImgError(false); handleFile(e.target.files?.[0]); }} />
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setImgError(false); handleFile(e.target.files?.[0]); }} />
          <div className="relative">
            <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={form.image_url.startsWith("data:") ? "" : form.image_url}
              onChange={(e) => { setImgError(false); setForm({ ...form, image_url: e.target.value }); }}
              placeholder={t("orPasteUrl")}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-muted/40 border border-border text-sm"
            />
          </div>
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

        <DiscountFields
          original={form.original_price}
          discounted={form.discounted_price}
          onChange={({ original, discounted }) => setForm({ ...form, original_price: original, discounted_price: discounted })}
        />


        <Field label={t("quantity")} type="number" value={form.quantity_available} onChange={(v) => setForm({ ...form, quantity_available: v })} required />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("pickupStart")} type="time" value={form.pickup_from} onChange={(v) => setForm({ ...form, pickup_from: v })} />
          <Field label={t("pickupEnd")} type="time" value={form.pickup_to} onChange={(v) => setForm({ ...form, pickup_to: v })} />
        </div>

        <Field label={t("description")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

        <details className="rounded-xl border border-border bg-card/40 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            🌐 {t("translationsOptional")}
          </summary>
          <div className="mt-3 space-y-3">
            <Field label={t("titleEnOptional")} value={form.title_en} onChange={(v) => setForm({ ...form, title_en: v })} />
            <Field label={t("titleRuOptional")} value={form.title_ru} onChange={(v) => setForm({ ...form, title_ru: v })} />
            <Field label={t("descriptionEnOptional")} value={form.description_en} onChange={(v) => setForm({ ...form, description_en: v })} />
            <Field label={t("descriptionRuOptional")} value={form.description_ru} onChange={(v) => setForm({ ...form, description_ru: v })} />
          </div>
        </details>


        <label className="flex items-center gap-2 text-sm py-2">
          <input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} className="w-5 h-5 rounded" />
          {t("deliveryAvailable")}
        </label>

        <label className="flex items-start gap-2 text-sm py-2 px-3 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 via-pink-500/10 to-orange-400/10 border border-fuchsia-500/30">
          <input type="checkbox" checked={form.is_surprise} onChange={(e) => setForm({ ...form, is_surprise: e.target.checked })} className="w-5 h-5 rounded mt-0.5" />
          <span>
            <span className="font-semibold">🎁 {t("surpriseTitle")}</span>
            <span className="block text-xs text-muted-foreground">{t("surpriseSubtitle")}</span>
          </span>
        </label>

        {form.is_surprise && (
          <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-fuchsia-500/5 via-pink-500/5 to-orange-400/5 border border-fuchsia-500/30">
            <div>
              <Label>{sl.contentsLabel}</Label>
              <textarea
                value={form.surprise_contents}
                onChange={(e) => setForm({ ...form, surprise_contents: e.target.value })}
                placeholder={sl.contentsPh}
                rows={3}
                className="w-full px-3 py-2.5 rounded-2xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">{sl.contentsHint}</p>
            </div>
            <div>
              <Label>{sl.valueLabel}</Label>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={form.surprise_value}
                  onChange={(e) => setForm({ ...form, surprise_value: e.target.value })}
                  placeholder="0"
                  className="flex-1 px-3 py-2.5 rounded-2xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                />
                <button
                  type="button"
                  disabled={!Number(form.surprise_value)}
                  onClick={() => setForm({ ...form, original_price: form.surprise_value })}
                  className="px-3 py-2 rounded-2xl bg-fuchsia-500 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
                >
                  {sl.useAsOriginal}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{sl.valueHint}</p>
            </div>
          </div>
        )}

        <div>
          <Label>{t("allergensLbl")}</Label>
          <p className="text-[11px] text-muted-foreground mb-2">{t("allergensHint")}</p>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_KEYS.map((k) => {
              const active = form.allergens.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    allergens: active ? f.allergens.filter((x) => x !== k) : [...f.allergens, k],
                  }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${active ? "bg-amber-500 text-white border-amber-500" : "bg-card border-border text-muted-foreground"}`}
                >
                  {active ? "✓ " : ""}{allergenLabel(k, language)}
                </button>
              );
            })}
          </div>
        </div>


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
