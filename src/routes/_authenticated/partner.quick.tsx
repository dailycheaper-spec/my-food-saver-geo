import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Zap } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { useSavedProducts, upsertSavedProduct, deleteSavedProduct, type SavedProduct } from "@/lib/partner-db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partner/quick")({
  head: () => ({ meta: [{ title: "Quick Offer — Cheaper" }] }),
  component: QuickOfferPage,
});

function QuickOfferPage() {
  const { t } = useI18n();
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const { items } = useSavedProducts(store?.id ?? null);
  const [picked, setPicked] = useState<SavedProduct | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> {t("quickOffer")}</h1>
        <button onClick={() => setAddOpen(true)} className="p-2 rounded-full bg-primary/10 text-primary"><Plus className="w-5 h-5" /></button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{t("quickIntro")}</p>

      {items.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border p-8 text-center">
          <div className="text-4xl mb-3">⚡</div>
          <p className="text-sm text-muted-foreground">{t("noSavedProducts")}</p>
          <button onClick={() => setAddOpen(true)} className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold">{t("add")}</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((p) => (
            <button
              key={p.id}
              onClick={() => setPicked(p)}
              className="bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/40 active:scale-[0.98] transition"
            >
              {p.image_url ? (
                <img src={p.image_url} className="w-full h-20 object-cover rounded-xl mb-2" alt={p.name} />
              ) : (
                <div className="w-full h-20 rounded-xl mb-2 bg-muted grid place-items-center text-2xl">🍽</div>
              )}
              <div className="font-semibold text-sm truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">{Number(p.default_original_price).toFixed(0)} {t("currency")} · {Number(p.default_discounted_price).toFixed(0)} {t("currency")}</div>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(t("deleteConfirm"))) deleteSavedProduct(p.id); }} className="mt-1 text-[11px] text-destructive/70 flex items-center gap-1"><Trash2 className="w-3 h-3" />{t("delete")}</button>
            </button>
          ))}
        </div>
      )}

      {picked && <PublishSheet store_id={store.id} product={picked} onClose={() => setPicked(null)} onDone={() => { setPicked(null); navigate({ to: "/partner/offers" }); }} />}
      {addOpen && <AddProductSheet store_id={store.id} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function PublishSheet({ store_id, product, onClose, onDone }: { store_id: string; product: SavedProduct; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const orig = Number(product.default_original_price);
  const [qty, setQty] = useState(5);
  const [discount, setDiscount] = useState(60);
  const [saving, setSaving] = useState(false);

  const discounted = Math.max(0.5, Math.round((orig * (100 - discount)) / 100 * 100) / 100);

  async function publish() {
    setSaving(true);
    const { error } = await supabase.from("offers").insert({
      store_id,
      title: product.name,
      description: "",
      category: product.category ?? "meal",
      original_price: orig,
      discounted_price: discounted,
      quantity_available: qty,
      pickup_from: "18:00",
      pickup_to: "21:00",
      image_url: product.image_url,
      is_active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] overflow-y-auto overscroll-contain pb-safe" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          {product.image_url && <img src={product.image_url} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-2" alt={product.name} />}
          <h3 className="font-display text-xl font-bold">{product.name}</h3>
          <div className="text-sm text-muted-foreground">{t("original")}: {orig.toFixed(2)} {t("currency")}</div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>{t("quantityAvailable")}</span><span className="font-bold">{qty}</span></div>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 rounded-full bg-muted text-xl">−</button>
              <input type="range" min={1} max={50} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="flex-1" />
              <button onClick={() => setQty(qty + 1)} className="w-12 h-12 rounded-full bg-muted text-xl">+</button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1"><span>{t("discount")}</span><span className="font-bold">{discount}%</span></div>
            <input type="range" min={10} max={90} step={5} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full" />
            <div className="text-center mt-2 font-bold text-2xl text-primary">{discounted.toFixed(2)} {t("currency")}</div>
          </div>
        </div>

        <button onClick={publish} disabled={saving} className="mt-6 w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg disabled:opacity-50">
          {saving ? "…" : `🚀 ${t("publish")}`}
        </button>
      </div>
    </div>
  );
}

function AddProductSheet({ store_id, onClose }: { store_id: string; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("15");
  const [discounted, setDiscounted] = useState("6");
  const [image_url, setImg] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await upsertSavedProduct({
        store_id,
        name: name.trim(),
        default_original_price: Number(price),
        default_discounted_price: Number(discounted),
        image_url: image_url.trim() || null,
      });
      onClose();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] overflow-y-auto overscroll-contain pb-safe" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-bold mb-4">{t("newProduct")}</h3>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("productNamePlaceholder")} className="w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border" />
          {image_url && <img src={image_url} alt="preview" className="w-full h-40 object-cover rounded-2xl" />}
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">{t("optionalPhotoUrl")}</span>
            <input value={image_url.startsWith("data:") ? "" : image_url} onChange={(e) => setImg(e.target.value)} placeholder="https://…" className="mt-1 w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">{t("original")}</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" className="mt-1 w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">{t("discountedPrice")}</span>
              <input value={discounted} onChange={(e) => setDiscounted(e.target.value)} type="number" className="mt-1 w-full px-4 py-3 rounded-2xl bg-muted/40 border border-border" />
            </label>
          </div>
        </div>
        <button onClick={save} disabled={saving || !name.trim()} className="mt-5 w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-50">{t("save")}</button>
      </div>
    </div>
  );
}
