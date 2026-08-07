import { resolveOfferTranslations } from "@/lib/offer-translate";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight, Minus, StopCircle, PlusCircle } from "lucide-react";
import { useMyStores, useStoreOffers, formatGel, type DbOffer } from "@/lib/db";
import { bumpOfferQty, finishOffer } from "@/lib/partner-db";
import { supabase } from "@/integrations/supabase/client";
import { DiscountFields, computePct, MIN_DISCOUNT_PCT } from "@/components/DiscountFields";
import { useI18n } from "@/lib/i18n";
import { ALLERGEN_KEYS, allergenLabel } from "@/lib/allergens";
import { addonCategoryKey } from "@/lib/addons";
import { OfferPhotoPicker } from "@/components/OfferPhotoPicker";
import { AuditLogButton } from "@/components/AuditLogPanel";
import { Time24Input } from "@/components/Time24Input";
import { toast } from "sonner";

/** One "ხელს გააყოლე" add-on the partner can attach to an offer. */
type AddonOption = {
  id: string;
  name: string;
  addon_category: string | null;
  addon_discounted_price: number | null;
  default_discounted_price: number;
};

export const Route = createFileRoute("/_authenticated/partner/offers")({
  head: () => ({ meta: [{ title: "Offers — Cheaper" }] }),
  component: OffersPage,
});

function OffersPage() {
  const { t } = useI18n();
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const { offers, error: offersError } = useStoreOffers(store?.id ?? null);
  const [editing, setEditing] = useState<DbOffer | null>(null);
  const [creating, setCreating] = useState(false);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">{t("activeOffers")}</h1>
        <div className="flex gap-2">
          <Link to="/partner/new" className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-soft">
            <Plus className="w-4 h-4" /> {t("newShort")}
          </Link>
        </div>
      </div>

      {offersError ? (
        <div className="bg-destructive/10 rounded-2xl border border-destructive/30 p-8 text-center">
          <p className="text-sm text-destructive">{t("loadErrorGeneric")}</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm text-muted-foreground">{t("noOffersYet")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {offers.map((o) => (
            <OfferRow key={o.id} offer={o} onEdit={() => setEditing(o)} />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <OfferForm
          storeId={store.id}
          offer={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function OfferRow({ offer, onEdit }: { offer: DbOffer; onEdit: () => void }) {
  const { t } = useI18n();
  const remaining = offer.quantity_available - offer.quantity_sold;
  const soldOut = remaining <= 0;
  async function toggle() {
    await supabase.from("offers").update({ is_active: !offer.is_active }).eq("id", offer.id);
  }
  async function del() {
    if (!confirm(t("sureDelete"))) return;
    await supabase.from("offers").delete().eq("id", offer.id);
  }
  return (
    <div className={`bg-card rounded-2xl border p-4 relative ${offer.is_active && !soldOut ? "border-border" : "border-border/40 opacity-70"}`}>
      <div className="flex items-start gap-3">
        {offer.image_url ? (
          <img src={offer.image_url} alt={offer.title} width={64} height={64} loading="lazy" decoding="async" className={`w-16 h-16 rounded-xl object-cover ${soldOut ? "grayscale" : ""}`} />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted grid place-items-center text-2xl">🍽</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="font-semibold truncate min-w-0">{offer.title}</div>
            {soldOut && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wider">
                {t("offer.soldOut")}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-bold text-primary">{formatGel(Number(offer.discounted_price))}</span>
            <span className="line-through text-muted-foreground text-xs">{formatGel(Number(offer.original_price))}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {offer.pickup_from.slice(0,5)}–{offer.pickup_to.slice(0,5)}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <button onClick={toggle} className="p-0.5">
            {offer.is_active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
          </button>
          <button onClick={onEdit} className="p-1"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
          <AuditLogButton entityType="offer" entityId={offer.id} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => bumpOfferQty(offer.id, offer.quantity_available, -1)}
          disabled={remaining <= 0}
          className="w-10 h-10 rounded-full bg-muted grid place-items-center disabled:opacity-40"
        ><Minus className="w-4 h-4" /></button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold">{remaining}</div>
          <div className="text-[10px] text-muted-foreground uppercase">{t("remaining")} / {offer.quantity_available}</div>
        </div>
        <button
          onClick={() => bumpOfferQty(offer.id, offer.quantity_available, 1)}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center"
        ><Plus className="w-4 h-4" /></button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => finishOffer(offer.id)}
          className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1"
        ><StopCircle className="w-3.5 h-3.5" /> {t("endOffer")}</button>
        <button
          onClick={del}
          className="px-3 py-2 rounded-xl bg-muted text-muted-foreground"
          aria-label={t("delete")}
        ><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function OfferForm({ storeId, offer, onClose }: { storeId: string; offer: DbOffer | null; onClose: () => void }) {
  const { t, language } = useI18n();
  const offerAny = offer as unknown as Partial<Record<"title_en" | "title_ru" | "title_tr" | "title_fa" | "description_en" | "description_ru" | "description_tr" | "description_fa" | "image_path" | "image_signed_url_expires_at", string | null>> & { allergens?: string[] | null } | null;
  const [form, setForm] = useState({
    title: offer?.title ?? "",
    title_en: offerAny?.title_en ?? "",
    title_ru: offerAny?.title_ru ?? "",
    title_tr: offerAny?.title_tr ?? "",
    title_fa: offerAny?.title_fa ?? "",
    description: offer?.description ?? "",
    description_en: offerAny?.description_en ?? "",
    description_ru: offerAny?.description_ru ?? "",
    description_tr: offerAny?.description_tr ?? "",
    description_fa: offerAny?.description_fa ?? "",
    category: offer?.category ?? "meal",
    original_price: offer?.original_price?.toString() ?? "20",
    discounted_price: offer?.discounted_price?.toString() ?? "7",
    quantity_available: offer?.quantity_available?.toString() ?? "5",
    pickup_from: offer?.pickup_from?.slice(0,5) ?? "18:00",
    pickup_to: offer?.pickup_to?.slice(0,5) ?? "21:00",
    delivery_available: offer?.delivery_available ?? false,
    image_url: offer?.image_url ?? "",
    image_path: (offerAny?.image_path ?? null) as string | null,
    image_signed_url_expires_at: (offerAny?.image_signed_url_expires_at ?? null) as string | null,
    allergens: (offerAny?.allergens ?? []) as string[],
  });
  const [saving, setSaving] = useState(false);
  const [imgInvalid, setImgInvalid] = useState(false);
  const initialFormRef = useRef(form);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

  // "ხელს გააყოლე" add-ons that can be offered alongside this deal.
  const [addons, setAddons] = useState<AddonOption[]>([]);
  const [pickedAddonIds, setPickedAddonIds] = useState<string[]>([]);
  // Snapshot of what was linked when the modal opened — the save diffs against it.
  const linkedAtOpenRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("saved_products")
        .select("id,name,addon_category,addon_discounted_price,default_discounted_price")
        .eq("store_id", storeId)
        .eq("is_addon", true)
        .eq("addon_active", true)
        .eq("is_active", true)
        .order("name");
      if (!cancelled) setAddons((data ?? []) as AddonOption[]);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  useEffect(() => {
    if (!offer) {
      linkedAtOpenRef.current = [];
      setPickedAddonIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("offer_addons")
        .select("saved_product_id")
        .eq("offer_id", offer.id)
        .eq("is_active", true)
        .order("sort_order");
      if (cancelled) return;
      const ids = (data ?? []).map((r) => r.saved_product_id);
      linkedAtOpenRef.current = ids;
      setPickedAddonIds(ids);
    })();
    return () => { cancelled = true; };
  }, [offer]);

  /** Insert only newly checked links, delete only ones that were unchecked. */
  async function syncAddonLinks(offerId: string, previous: string[]) {
    const added = pickedAddonIds.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !pickedAddonIds.includes(id));

    if (removed.length > 0) {
      const { error } = await supabase
        .from("offer_addons")
        .delete()
        .eq("offer_id", offerId)
        .in("saved_product_id", removed);
      if (error) toast.error(error.message);
    }
    if (added.length > 0) {
      const base = pickedAddonIds.length - added.length;
      const { error } = await supabase.from("offer_addons").insert(
        added.map((saved_product_id, i) => ({
          offer_id: offerId,
          saved_product_id,
          sort_order: base + i,
          is_active: true,
        })),
      );
      if (error) toast.error(error.message);
    }
  }



  async function save(e: React.FormEvent) {
    e.preventDefault();
    const orig = Number(form.original_price);
    const disc = Number(form.discounted_price);
    if (computePct(orig, disc) < MIN_DISCOUNT_PCT) {
      toast.error(t("minDiscount50"));
      return;
    }
    if (imgInvalid) { toast.error(t("imageLoadFailed")); return; }
    setSaving(true);
    const tr = await resolveOfferTranslations(form);
    const payload = {
      store_id: storeId,
      title: form.title,
      title_en: tr.title_en,
      title_ru: tr.title_ru,
      title_tr: tr.title_tr,
      title_fa: tr.title_fa,
      description: form.description,
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
      delivery_available: form.delivery_available,
      image_url: form.image_url.trim() || null,
      image_path: form.image_path,
      image_signed_url_expires_at: form.image_signed_url_expires_at,
      allergens: form.allergens.length ? form.allergens : null,
    };
    if (offer) {
      const { error } = await supabase.from("offers").update(payload).eq("id", offer.id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      await syncAddonLinks(offer.id, linkedAtOpenRef.current);
    } else {
      const { data: created, error } = await supabase.from("offers").insert(payload).select("id").single();
      if (error || !created) { setSaving(false); toast.error(error?.message ?? ""); return; }
      await syncAddonLinks(created.id, []);
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-elevated max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">{offer ? t("editOffer") : t("newOffer")}</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <Input label={t("titleLbl")} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Input label={t("descLbl")} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">{t("photo")}</div>
            <OfferPhotoPicker
              value={form.image_url}
              onChange={(url, meta) => setForm((f) => ({
                ...f,
                image_url: url,
                image_path: meta?.path ?? (url === f.image_url ? f.image_path : null),
                image_signed_url_expires_at: meta?.expiresAt ?? (url === f.image_url ? f.image_signed_url_expires_at : null),
              }))}
              compact
              onValidityChange={setImgInvalid}
            />
          </div>

          <DiscountFields
            original={form.original_price}
            discounted={form.discounted_price}
            onChange={({ original, discounted }) => setForm({ ...form, original_price: original, discounted_price: discounted })}
          />
          <details className="rounded-xl border border-border bg-card/40 p-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">🌐 {t("translationsOptional")}</summary>
            <div className="mt-3 space-y-3">
              <Input label={t("titleEnOptional")} value={form.title_en} onChange={(v) => setForm({ ...form, title_en: v })} />
              <Input label={t("titleRuOptional")} value={form.title_ru} onChange={(v) => setForm({ ...form, title_ru: v })} />
              <Input label={t("descriptionEnOptional")} value={form.description_en} onChange={(v) => setForm({ ...form, description_en: v })} />
              <Input label={t("descriptionRuOptional")} value={form.description_ru} onChange={(v) => setForm({ ...form, description_ru: v })} />
              <Input label={t("titleTrOptional")} value={form.title_tr} onChange={(v) => setForm({ ...form, title_tr: v })} />
              <Input label={t("titleFaOptional")} value={form.title_fa} onChange={(v) => setForm({ ...form, title_fa: v })} />
              <Input label={t("descriptionTrOptional")} value={form.description_tr} onChange={(v) => setForm({ ...form, description_tr: v })} />
              <Input label={t("descriptionFaOptional")} value={form.description_fa} onChange={(v) => setForm({ ...form, description_fa: v })} />
            </div>
          </details>
          <Input label={t("qtyLbl")} type="number" value={form.quantity_available} onChange={(v) => setForm({ ...form, quantity_available: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("pickupStartLbl")} type="time" value={form.pickup_from} onChange={(v) => setForm({ ...form, pickup_from: v })} />
            <Input label={t("pickupEndLbl")} type="time" value={form.pickup_to} onChange={(v) => setForm({ ...form, pickup_to: v })} />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">{t("allergensLbl")}</div>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${active ? "bg-amber-500 text-white border-amber-500" : "bg-card border-border text-muted-foreground"}`}
                  >
                    {active ? "✓ " : ""}{allergenLabel(k, language)}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} />
            {t("deliveryOption")}
          </label>
        </div>

        {imgInvalid && (
          <p className="mt-3 text-xs text-destructive text-center">{t("imageLoadFailed")}</p>
        )}
        <button type="submit" disabled={saving || imgInvalid || (!!offer && !isDirty)} className="mt-5 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
          {saving ? t("savingProgress") : offer ? t("save") : t("createBtn")}
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, ...rest }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  const fieldClassName = "mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm";
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {type === "time" ? (
        <Time24Input value={value} onChange={onChange} className={fieldClassName} />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClassName}
          {...rest}
        />
      )}
    </label>
  );
}
