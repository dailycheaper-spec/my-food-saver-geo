import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, UtensilsCrossed } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AllergenPicker } from "@/components/AllergenPicker";
import { OfferPhotoPicker } from "@/components/OfferPhotoPicker";
import { allergenLabel } from "@/lib/allergens";
import { ADDON_CATEGORIES, addonCategoryKey } from "@/lib/addons";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partner/menu")({
  head: () => ({
    meta: [
      { title: "ჩემი მენიუ — Cheaper პარტნიორი" },
      { name: "description", content: "შეინახეთ თქვენი მუდმივი პროდუქტები ერთხელ და გამოაქვეყნეთ ფასდაკლებული შეთავაზება ერთ შეხებაში." },
      { property: "og:title", content: "ჩემი მენიუ — Cheaper პარტნიორი" },
      { property: "og:description", content: "პარტნიორის მუდმივი მენიუს მართვა Cheaper-ზე." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerMenuPage,
});

export const UNIT_TYPES = ["piece", "weight", "portion"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

type MenuItem = {
  id: string;
  store_id: string;
  name: string;
  category: string | null;
  default_original_price: number;
  default_discounted_price: number;
  image_url: string | null;
  is_active: boolean;
  unit_type: string;
  unit_weight_grams: number | null;
  composition: string | null;
  default_allergens: string[] | null;
  is_addon: boolean;
  addon_category: string | null;
  addon_discounted_price: number | null;
  addon_max_quantity: number;
  addon_active: boolean;
};

const EMPTY = {
  name: "",
  default_original_price: "20",
  default_discounted_price: "9",
  image_url: "",
  unit_type: "piece" as UnitType,
  unit_weight_grams: "",
  composition: "",
  default_allergens: [] as string[],
  is_addon: false,
  addon_category: "drinks" as string,
  addon_discounted_price: "",
  addon_max_quantity: "5",
  addon_active: true,
};

function PartnerMenuPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { stores, loading } = useMyStores();
  const store = useMemo(() => stores.find((s) => s.status === "active") ?? null, [stores]);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const regularItems = useMemo(() => items.filter((i) => !i.is_addon), [items]);
  const addonItems = useMemo(() => items.filter((i) => i.is_addon), [items]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!store) { setBusy(false); return; }
      setBusy(true);
      const { data, error } = await supabase
        .from("saved_products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) toast.error(error.message);
      setItems(((data ?? []) as unknown as MenuItem[]));
      setBusy(false);
    }
    load();
    return () => { cancelled = true; };
  }, [store]);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  }

  function openEdit(it: MenuItem) {
    setEditingId(it.id);
    setForm({
      name: it.name,
      default_original_price: String(it.default_original_price ?? ""),
      default_discounted_price: String(it.default_discounted_price ?? ""),
      image_url: it.image_url ?? "",
      unit_type: (UNIT_TYPES as readonly string[]).includes(it.unit_type) ? (it.unit_type as UnitType) : "piece",
      unit_weight_grams: it.unit_weight_grams != null ? String(it.unit_weight_grams) : "",
      composition: it.composition ?? "",
      default_allergens: it.default_allergens ?? [],
      is_addon: !!it.is_addon,
      addon_category: it.addon_category ?? "drinks",
      addon_discounted_price: it.addon_discounted_price != null ? String(it.addon_discounted_price) : "",
      addon_max_quantity: String(it.addon_max_quantity ?? 5),
      addon_active: it.addon_active ?? true,
    });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!store || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      store_id: store.id,
      name: form.name.trim(),
      default_original_price: Number(form.default_original_price) || 0,
      default_discounted_price: Number(form.default_discounted_price) || 0,
      image_url: form.image_url.trim() || null,
      unit_type: form.unit_type,
      unit_weight_grams: form.unit_type === "weight" && form.unit_weight_grams ? Number(form.unit_weight_grams) : null,
      composition: form.composition.trim() || null,
      default_allergens: form.default_allergens,
      is_active: true,
      is_addon: form.is_addon,
      // A discount is never required on an add-on — blank stays blank.
      addon_category: form.is_addon ? form.addon_category : null,
      addon_discounted_price: form.is_addon && form.addon_discounted_price.trim() !== "" ? Number(form.addon_discounted_price) : null,
      addon_max_quantity: form.is_addon ? Math.max(1, Number(form.addon_max_quantity) || 5) : 5,
      addon_active: form.is_addon ? form.addon_active : true,
    };
    const res = editingId
      ? await supabase.from("saved_products").update(payload).eq("id", editingId).select("*").single()
      : await supabase.from("saved_products").insert(payload).select("*").single();
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    const row = res.data as unknown as MenuItem;
    setItems((prev) => (editingId ? prev.map((p) => (p.id === row.id ? row : p)) : [row, ...prev]));
    setShowForm(false);
    setEditingId(null);
    toast.success(t("partner.menu.saved"));
  }

  async function remove(id: string) {
    if (!window.confirm(t("partner.menu.deleteConfirm"))) return;
    const { error } = await supabase.from("saved_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success(t("partner.menu.deleted"));
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div className="max-w-lg mx-auto pb-10">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">{t("partner.menu.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("partner.menu.subtitle")}</p>
        </div>
        {!showForm && (
          <button onClick={openNew} className="shrink-0 px-3 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold shadow-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> {t("partner.menu.add").replace("+ ", "")}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={save} className="space-y-4 p-4 rounded-3xl border border-border bg-card/50 mb-6">
          <div>
            <Label>{t("partner.menu.photo")}</Label>
            <OfferPhotoPicker value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} compact />
          </div>

          <Field label={t("partner.menu.name")} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />

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
            <Field label={t("partner.menu.originalPrice")} type="number" step="0.5" value={form.default_original_price} onChange={(v) => setForm({ ...form, default_original_price: v })} />
            <Field label={t("partner.menu.discountedPrice")} type="number" step="0.5" value={form.default_discounted_price} onChange={(v) => setForm({ ...form, default_discounted_price: v })} />
          </div>

          <div>
            <Label>{t("partner.menu.composition")}</Label>
            <textarea
              value={form.composition}
              onChange={(e) => setForm({ ...form, composition: e.target.value })}
              placeholder={t("partner.menu.compositionPh")}
              rows={3}
              className="w-full px-3 py-2.5 rounded-2xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none"
            />
          </div>

          <div>
            <Label>{t("allergensLbl")}</Label>
            <p className="text-[11px] text-muted-foreground mb-2">{t("allergensHint")}</p>
            <AllergenPicker value={form.default_allergens} onChange={(next) => setForm({ ...form, default_allergens: next })} />
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_addon}
                onChange={(e) => setForm({ ...form, is_addon: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t("partner.addons.markAsAddon")}</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">{t("partner.addons.markHint")}</span>
              </span>
            </label>

            {form.is_addon && (
              <div className="mt-3 space-y-3">
                <div>
                  <Label>{t("partner.addons.category")}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ADDON_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, addon_category: c })}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium border ${form.addon_category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"}`}
                      >
                        {t(addonCategoryKey(c))}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("partner.addons.discountedPrice")} type="number" step="0.5" value={form.addon_discounted_price} onChange={(v) => setForm({ ...form, addon_discounted_price: v })} />
                  <Field label={t("partner.addons.maxQty")} type="number" value={form.addon_max_quantity} onChange={(v) => setForm({ ...form, addon_max_quantity: v })} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.addon_active}
                    onChange={(e) => setForm({ ...form, addon_active: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  {t("partner.addons.active")}
                </label>
              </div>
            )}
          </div>


          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold">
              {t("partner.menu.cancel")}
            </button>
            <button type="submit" disabled={saving || !form.name.trim()} className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
              {saving ? t("partner.menu.saving") : t("partner.menu.save")}
            </button>
          </div>
        </form>
      )}

      {busy ? (
        <div className="py-10 grid place-items-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : items.length === 0 && !showForm ? (
        <div className="text-center py-10 px-5 rounded-3xl border border-dashed border-border bg-card/30">
          <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <div className="font-bold mb-1">{t("partner.menu.emptyTitle")}</div>
          <p className="text-sm text-muted-foreground mb-4">{t("partner.menu.emptyBody")}</p>
          <button onClick={openNew} className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">
            {t("partner.menu.add")}
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {regularItems.map((it) => (
              <MenuRow key={it.id} it={it} t={t} onEdit={openEdit} onRemove={remove} />
            ))}
          </ul>

          <div className="mt-8">
            <h2 className="font-display text-lg font-bold mb-3">{t("partner.addons.sectionTitle")}</h2>
            {addonItems.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">{t("partner.addons.empty")}</p>
            ) : (
              <ul className="space-y-3">
                {addonItems.map((it) => (
                  <MenuRow key={it.id} it={it} t={t} onEdit={openEdit} onRemove={remove} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
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
