import { resolveOfferTranslations } from "@/lib/offer-translate";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, UtensilsCrossed, PlusCircle } from "lucide-react";
import { addonCategoryKey } from "@/lib/addons";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { DiscountFields, computePct, MIN_DISCOUNT_PCT } from "@/components/DiscountFields";
import { useI18n } from "@/lib/i18n";
import { AllergenPicker } from "@/components/AllergenPicker";
import { OfferPhotoPicker } from "@/components/OfferPhotoPicker";
import { Time24Input } from "@/components/Time24Input";
import { toast } from "sonner";

const UNIT_TYPES = ["piece", "weight", "portion"] as const;
type UnitType = (typeof UNIT_TYPES)[number];

type MenuItem = {
  id: string;
  name: string;
  default_original_price: number;
  default_discounted_price: number;
  image_url: string | null;
  unit_type: string;
  unit_weight_grams: number | null;
  composition: string | null;
  default_allergens: string[] | null;
};

type AddonItem = {
  id: string;
  name: string;
  default_discounted_price: number;
  addon_category: string | null;
  addon_discounted_price: number | null;
};


export const Route = createFileRoute("/_authenticated/partner/new")({
  head: () => ({ meta: [{ title: "ახალი შეთავაზება — Cheaper" }] }),
  component: NewOfferPage,
});

const CATEGORIES = [
  { value: "meal", icon: "🍽", key: "meal" },
  { value: "bakery", icon: "🥐", key: "bakery" },
  { value: "confectionery", icon: "🍰", key: "confectionery" },
  { value: "home_kitchen", icon: "🍲", key: "homeKitchen" },
  { value: "pizza", icon: "🍕", key: "pizza" },
  { value: "semi_finished", icon: "🥟", key: "semiFinished" },
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
  // Partner panel stays ka/en/ru; other UI languages fall back to English.
  const sl = SURPRISE_L10N[language as "ka" | "en" | "ru"] ?? SURPRISE_L10N.en;
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [imgInvalid, setImgInvalid] = useState(false);
  const [form, setForm] = useState({
    title: "",
    title_en: "",
    title_ru: "",
    title_tr: "",
    title_fa: "",
    description: "",
    description_en: "",
    description_ru: "",
    description_tr: "",
    description_fa: "",
    category: "meal",
    original_price: "20",
    discounted_price: "7",
    quantity_available: "5",
    pickup_from: "18:00",
    pickup_to: "21:00",
    image_url: "",
    image_path: null as string | null,
    image_signed_url_expires_at: null as string | null,
    delivery_available: false,
    is_surprise: false,
    surprise_contents: "",
    surprise_value: "",
    allergens: [] as string[],
    unit_type: "piece" as UnitType,
    unit_weight_grams: "",
  });

  // Standing menu (saved products) — lets the partner publish in one tap.
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [pickedAddonIds, setPickedAddonIds] = useState<string[]>([]);
  const [pickedId, setPickedId] = useState<string | null>(null);
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    supabase
      .from("saved_products")
      .select("id,name,default_original_price,default_discounted_price,image_url,unit_type,unit_weight_grams,composition,default_allergens,is_addon,addon_category,addon_discounted_price")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as unknown as (MenuItem & AddonItem & { is_addon: boolean })[];
        setMenu(rows.filter((r) => !r.is_addon));
        setAddons(rows.filter((r) => r.is_addon));
      });
    return () => { cancelled = true; };
  }, [store]);


  function applyMenuItem(it: MenuItem) {
    setPickedId(it.id);
    setForm((f) => ({
      ...f,
      title: it.name,
      original_price: String(it.default_original_price ?? f.original_price),
      discounted_price: String(it.default_discounted_price ?? f.discounted_price),
      image_url: it.image_url ?? "",
      image_path: null,
      image_signed_url_expires_at: null,
      description: it.composition ? it.composition : f.description,
      allergens: it.default_allergens ?? [],
      unit_type: (UNIT_TYPES as readonly string[]).includes(it.unit_type) ? (it.unit_type as UnitType) : "piece",
      unit_weight_grams: it.unit_weight_grams != null ? String(it.unit_weight_grams) : "",
    }));
  }





  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    if (imgInvalid) { toast.error(t("imageLoadFailed")); return; }
    const orig = Number(form.original_price);
    const disc = Number(form.discounted_price);
    if (computePct(orig, disc) < MIN_DISCOUNT_PCT) {
      toast.error(t("minDiscount50"));
      return;
    }
    setSaving(true);
    const contents = form.surprise_contents.trim();
    const baseDesc = form.description.trim();
    const finalDesc = form.is_surprise && contents
      ? (baseDesc ? `${baseDesc}\n\n${sl.contentsLabel}: ${contents}` : `${sl.contentsLabel}: ${contents}`)
      : baseDesc;
    const tr = await resolveOfferTranslations(form, finalDesc);
    const payload = {
      store_id: store.id,
      title: form.title.trim(),
      title_en: tr.title_en,
      title_ru: tr.title_ru,
      title_tr: tr.title_tr,
      title_fa: tr.title_fa,
      description: finalDesc,
      description_en: tr.description_en,
      description_ru: tr.description_ru,
      description_tr: tr.description_tr,
      description_fa: tr.description_fa,
      category: form.category,
      original_price: orig,
      discounted_price: disc,
      quantity_available: Number(form.quantity_available),
      pickup_from: form.pickup_from,
      pickup_to: form.pickup_to,
      image_url: form.image_url.trim() || null,
      image_path: form.image_path,
      image_signed_url_expires_at: form.image_signed_url_expires_at,
      delivery_available: form.delivery_available,
      is_surprise: form.is_surprise,
      is_active: true,
      allergens: form.allergens.length ? form.allergens : null,
      unit_type: form.unit_type,
      unit_weight_grams: form.unit_type === "weight" && form.unit_weight_grams ? Number(form.unit_weight_grams) : null,
    };



    const { data: created, error } = await supabase.from("offers").insert(payload).select("id").single();
    if (error) { setSaving(false); toast.error(error.message); return; }

    if (created?.id && pickedAddonIds.length > 0) {
      const { error: addonError } = await supabase.from("offer_addons").insert(
        pickedAddonIds.map((saved_product_id, i) => ({
          offer_id: created.id,
          saved_product_id,
          sort_order: i,
          is_active: true,
        })),
      );
      if (addonError) toast.error(addonError.message);
    }

    setSaving(false);
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
        <div className="p-3 rounded-3xl border border-border bg-card/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-bold flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-primary" /> {t("partner.menu.pickFromMenu")}
            </div>
            <Link to="/partner/menu" className="text-xs font-semibold text-primary shrink-0">
              {t("partner.menu.title")}
            </Link>
          </div>
          {menu.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("partner.menu.pickEmpty")}</p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                {menu.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => applyMenuItem(it)}
                    className={`shrink-0 px-3 py-2 rounded-2xl text-xs font-medium border whitespace-nowrap ${pickedId === it.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                  >
                    {pickedId === it.id ? "✓ " : ""}{it.name}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">{t("partner.menu.pickHint")}</p>
            </>
          )}
        </div>

        <div className="p-3 rounded-3xl border border-border bg-card/50">
          <div className="text-sm font-bold flex items-center gap-1.5 mb-2">
            <PlusCircle className="w-4 h-4 text-primary" /> {t("partner.addons.offerPickTitle")}
          </div>
          {addons.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("partner.addons.offerPickEmpty")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {addons.map((a) => {
                const picked = pickedAddonIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setPickedAddonIds((prev) => (picked ? prev.filter((id) => id !== a.id) : [...prev, a.id]))}
                    className={`px-3 py-2 rounded-2xl text-xs font-medium border ${picked ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                  >
                    {picked ? "✓ " : ""}{a.name}
                    {a.addon_category ? ` · ${t(addonCategoryKey(a.addon_category))}` : ""}
                    {" · "}{a.addon_discounted_price ?? a.default_discounted_price}₾
                  </button>
                );
              })}
            </div>
          )}
        </div>


        <div>

          <Label>{t("photo")}</Label>
          <OfferPhotoPicker
            value={form.image_url}
            onChange={(url, meta) => setForm((f) => ({
              ...f,
              image_url: url,
              image_path: meta?.path ?? (url === f.image_url ? f.image_path : null),
              image_signed_url_expires_at: meta?.expiresAt ?? (url === f.image_url ? f.image_signed_url_expires_at : null),
            }))}
            onValidityChange={setImgInvalid}
          />
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


        <Field label={t("quantityAvailable")} type="number" value={form.quantity_available} onChange={(v) => setForm({ ...form, quantity_available: v })} required />

        <div>
          <Label>{t("partner.menu.unitType")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {UNIT_TYPES.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm({ ...form, unit_type: u })}
                className={`py-2.5 rounded-xl text-xs font-medium border ${form.unit_type === u ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
              >
                {t(`partner.menu.unit${u.charAt(0).toUpperCase()}${u.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {form.unit_type === "weight" && (
          <Field label={t("partner.menu.gramsPerUnit")} type="number" value={form.unit_weight_grams} onChange={(v) => setForm({ ...form, unit_weight_grams: v })} />
        )}


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
            <Field label={t("titleTrOptional")} value={form.title_tr} onChange={(v) => setForm({ ...form, title_tr: v })} />
            <Field label={t("titleFaOptional")} value={form.title_fa} onChange={(v) => setForm({ ...form, title_fa: v })} />
            <Field label={t("descriptionTrOptional")} value={form.description_tr} onChange={(v) => setForm({ ...form, description_tr: v })} />
            <Field label={t("descriptionFaOptional")} value={form.description_fa} onChange={(v) => setForm({ ...form, description_fa: v })} />
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
          <AllergenPicker value={form.allergens} onChange={(next) => setForm((f) => ({ ...f, allergens: next }))} />
        </div>



        {imgInvalid && (
          <p className="text-xs text-destructive text-center">{t("imageLoadFailed")}</p>
        )}
        <button
          type="submit"
          disabled={saving || !form.title || imgInvalid}
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
  const fieldClassName = "w-full px-3 py-3 rounded-2xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm";
  return (
    <label className="block">
      <Label>{label}</Label>
      {type === "time" ? (
        <Time24Input value={value} onChange={onChange} className={fieldClassName} />
      ) : (
        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClassName}
        />
      )}
    </label>
  );
}
