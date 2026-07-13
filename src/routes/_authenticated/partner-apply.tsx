import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Store, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DISTRICTS } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/partner-apply")({
  head: () => ({ meta: [{ title: "გახდი პარტნიორი — გემო" }] }),
  component: PartnerApply,
});

function PartnerApply() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", logo: "🏪", district: "ვაკე", address: "", phone: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

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
      setMsg("განაცხადი გაიგზავნა! ადმინი მალე გადახედავს.");
      setTimeout(() => navigate({ to: "/" }), 2000);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> უკან
      </button>

      <div className="text-center mb-6">
        <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-primary/10 mb-3">
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">გახდი გემოს პარტნიორი</h1>
        <p className="text-sm text-muted-foreground mt-2">
          გაყიდე დღის დარჩენილი საკვები, შეამცირე ნარჩენი და მოიზიდე ახალი მომხმარებელი.
        </p>
      </div>

      <form onSubmit={submit} className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <Field label="მაღაზიის სახელი *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <Field label="ლოგო (ემოჯი)" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} placeholder="🥐" />

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">უბანი *</span>
          <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
            {DISTRICTS.filter((d) => d !== "ყველა უბანი").map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <Field label="მისამართი *" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
        <Field label="ტელეფონი" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+995..." />
        <Field label="აღწერა" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />

        <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-60">
          {submitting ? "იგზავნება…" : "განაცხადის გაგზავნა"}
        </button>
        {msg && <div className="text-sm text-center">{msg}</div>}
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} rows={3}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
          className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
      )}
    </label>
  );
}
