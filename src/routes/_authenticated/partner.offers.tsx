import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight, Minus, StopCircle } from "lucide-react";
import { useMyStores, useStoreOffers, formatGel, type DbOffer } from "@/lib/db";
import { bumpOfferQty, finishOffer } from "@/lib/partner-db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/partner/offers")({
  head: () => ({ meta: [{ title: "შეთავაზებები — გემო" }] }),
  component: OffersPage,
});

function OffersPage() {
  const { stores } = useMyStores();
  const store = stores[0] ?? null;
  const { offers } = useStoreOffers(store?.id ?? null);
  const [editing, setEditing] = useState<DbOffer | null>(null);
  const [creating, setCreating] = useState(false);

  if (!store) return <div className="text-center py-12 text-muted-foreground">ჯერ არ გაქვს დამტკიცებული მაღაზია.</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">აქტიური შეთავაზებები</h1>
        <div className="flex gap-2">
          <Link to="/partner/quick" className="px-3 py-2 bg-muted rounded-xl text-sm font-medium">⚡ Quick</Link>
          <Link to="/partner/new" className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-soft">
            <Plus className="w-4 h-4" /> ახალი
          </Link>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="text-4xl mb-3">📦</div>
          <p className="text-sm text-muted-foreground">ჯერ არ გაქვს შეთავაზება. დაამატე პირველი!</p>
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
  const remaining = offer.quantity_available - offer.quantity_sold;
  async function toggle() {
    await supabase.from("offers").update({ is_active: !offer.is_active }).eq("id", offer.id);
  }
  async function del() {
    if (!confirm("დარწმუნებული ხარ?")) return;
    await supabase.from("offers").delete().eq("id", offer.id);
  }
  return (
    <div className={`bg-card rounded-2xl border p-4 ${offer.is_active ? "border-border" : "border-border/40 opacity-60"}`}>
      <div className="flex items-start gap-3">
        {offer.image_url ? (
          <img src={offer.image_url} alt={offer.title} className="w-16 h-16 rounded-xl object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted grid place-items-center text-2xl">🍽</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{offer.title}</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="font-bold text-primary">{formatGel(Number(offer.discounted_price))}</span>
            <span className="line-through text-muted-foreground text-xs">{formatGel(Number(offer.original_price))}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {offer.pickup_from.slice(0,5)}–{offer.pickup_to.slice(0,5)}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <button onClick={toggle} title="ჩართვა/გამორთვა" className="p-0.5">
            {offer.is_active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
          </button>
          <button onClick={onEdit} className="p-1"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {/* Quantity controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => bumpOfferQty(offer.id, offer.quantity_available, -1)}
          disabled={remaining <= 0}
          className="w-10 h-10 rounded-full bg-muted grid place-items-center disabled:opacity-40"
        ><Minus className="w-4 h-4" /></button>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold">{remaining}</div>
          <div className="text-[10px] text-muted-foreground uppercase">დარჩა / {offer.quantity_available}</div>
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
        ><StopCircle className="w-3.5 h-3.5" /> დასრულება</button>
        <button
          onClick={del}
          className="px-3 py-2 rounded-xl bg-muted text-muted-foreground"
          aria-label="წაშლა"
        ><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function OfferForm({ storeId, offer, onClose }: { storeId: string; offer: DbOffer | null; onClose: () => void }) {
  const [form, setForm] = useState({
    title: offer?.title ?? "",
    description: offer?.description ?? "",
    category: offer?.category ?? "meal",
    original_price: offer?.original_price?.toString() ?? "20",
    discounted_price: offer?.discounted_price?.toString() ?? "7",
    quantity_available: offer?.quantity_available?.toString() ?? "5",
    pickup_from: offer?.pickup_from?.slice(0,5) ?? "18:00",
    pickup_to: offer?.pickup_to?.slice(0,5) ?? "21:00",
    delivery_available: offer?.delivery_available ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      store_id: storeId,
      title: form.title,
      description: form.description,
      category: form.category,
      original_price: Number(form.original_price),
      discounted_price: Number(form.discounted_price),
      quantity_available: Number(form.quantity_available),
      pickup_from: form.pickup_from,
      pickup_to: form.pickup_to,
      delivery_available: form.delivery_available,
    };
    if (offer) {
      await supabase.from("offers").update(payload).eq("id", offer.id);
    } else {
      await supabase.from("offers").insert(payload);
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
          <h3 className="font-display text-xl font-bold">{offer ? "რედაქტირება" : "ახალი შეთავაზება"}</h3>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <Input label="სათაური" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Input label="აღწერა" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="ორიგინალი ფასი (₾)" type="number" value={form.original_price} onChange={(v) => setForm({ ...form, original_price: v })} required />
            <Input label="ფასდაკლებული (₾)" type="number" value={form.discounted_price} onChange={(v) => setForm({ ...form, discounted_price: v })} required />
          </div>
          <Input label="რაოდენობა" type="number" value={form.quantity_available} onChange={(v) => setForm({ ...form, quantity_available: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="აღების დაწყება" type="time" value={form.pickup_from} onChange={(v) => setForm({ ...form, pickup_from: v })} />
            <Input label="აღების დასრულება" type="time" value={form.pickup_to} onChange={(v) => setForm({ ...form, pickup_to: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} />
            მიტანაც შესაძლებელია
          </label>
        </div>

        <button type="submit" disabled={saving} className="mt-5 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
          {saving ? "ინახება…" : offer ? "შენახვა" : "შექმნა"}
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, ...rest }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
        {...rest}
      />
    </label>
  );
}
