import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/partner/store")({
  head: () => ({ meta: [{ title: "მაღაზია — გემო" }] }),
  component: StoreSettings,
});

function StoreSettings() {
  const { stores, reload } = useMyStores();
  const store = stores[0] ?? null;
  const [form, setForm] = useState({ name: "", logo: "", district: "", address: "", phone: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (store) setForm({
      name: store.name,
      logo: store.logo ?? "",
      district: store.district ?? "",
      address: store.address ?? "",
      phone: store.phone ?? "",
      description: store.description ?? "",
    });
  }, [store]);

  if (!store) return <div className="text-center py-12 text-muted-foreground">მაღაზია არ არის.</div>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("stores").update(form).eq("id", store.id);
    setSaving(false);
    if (error) setMsg("შეცდომა: " + error.message);
    else { setMsg("შენახულია!"); reload(); }
  }

  return (
    <form onSubmit={save} className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold mb-1">მაღაზიის პარამეტრები</h1>
      <p className="text-sm text-muted-foreground mb-6">სტატუსი: <span className="font-semibold text-success">{store.status}</span></p>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <Field label="სახელი" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="ლოგო (ემოჯი)" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} placeholder="🥐" />
        <Field label="უბანი" value={form.district} onChange={(v) => setForm({ ...form, district: v })} />
        <Field label="მისამართი" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label="ტელეფონი" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="აღწერა" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
      </div>

      {msg && <div className="mt-3 text-sm">{msg}</div>}

      <button type="submit" disabled={saving} className="mt-4 flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
        <Save className="w-4 h-4" /> {saving ? "ინახება…" : "შენახვა"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      )}
    </label>
  );
}
