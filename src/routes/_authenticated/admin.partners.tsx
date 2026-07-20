import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Ban, RefreshCcw, MapPin, Search, Plus, X, Trash2, AlertTriangle } from "lucide-react";
import { useAllStores, approveStore, suspendStore, reactivateStore, formatGel, useAllOrders, type DbStore } from "@/lib/db";
import { loadAdminSettings } from "@/lib/admin-settings";
import { supabase } from "@/integrations/supabase/client";
import { DISTRICTS } from "@/lib/mock-data";
import { CITIES, type City } from "@/lib/city";

const FLAG_THRESHOLD = 5;

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({ meta: [{ title: "პარტნიორები — ადმინი" }] }),
  component: AdminPartners,
});

function AdminPartners() {
  const { stores, reload } = useAllStores();
  const { orders } = useAllOrders();
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended" | "flagged">("all");
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [reportCounts, setReportCounts] = useState<Map<string, number>>(new Map());
  const settings = loadAdminSettings();

  async function loadReports() {
    const { data } = await supabase.from("store_reports").select("store_id");
    const m = new Map<string, number>();
    (data ?? []).forEach((r: { store_id: string }) => m.set(r.store_id, (m.get(r.store_id) ?? 0) + 1));
    setReportCounts(m);
  }
  useEffect(() => { loadReports(); }, []);

  const balances = new Map<string, number>();
  orders.filter((o) => o.status !== "cancelled").forEach((o) => {
    const prev = balances.get(o.store_id) ?? 0;
    balances.set(o.store_id, prev + Number(o.amount) * (1 - settings.commissionPct / 100));
  });

  const filtered = stores
    .filter((s) => filter === "all" ? true : filter === "flagged" ? (reportCounts.get(s.id) ?? 0) >= FLAG_THRESHOLD : s.status === filter)
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.category ?? "").toLowerCase().includes(q.toLowerCase()));

  const flaggedCount = stores.filter((s) => (reportCounts.get(s.id) ?? 0) >= FLAG_THRESHOLD).length;

  const tabs = [
    { key: "all", label: "ყველა" },
    { key: "pending", label: "მოლოდინი" },
    { key: "active", label: "აქტიური" },
    { key: "suspended", label: "შეჩერებული" },
    { key: "flagged", label: "🚩 გასაჩივრებული" },
  ] as const;

  return (
    <div className="space-y-6">
      {flaggedCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">{flaggedCount} ობიექტს დაუგროვდა {FLAG_THRESHOLD}+ უარყოფითი შეფასება</div>
            <div className="text-muted-foreground mt-0.5">გადახედე „გასაჩივრებული" ტაბს და მიიღე გადაწყვეტილება (შეჩერება ან წაშლა).</div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">პარტნიორები</h1>
          <p className="text-sm text-muted-foreground mt-1">მართე რესტორნები და საცხობები</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90">
          <Plus className="w-4 h-4" /> პარტნიორის დამატება
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ძებნა სახელით ან კატეგორიით…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => {
            const count = t.key === "all" ? stores.length
              : t.key === "flagged" ? flaggedCount
              : stores.filter((s) => s.status === t.key).length;
            return (
              <button key={t.key} onClick={() => setFilter(t.key)}
                className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-colors ${filter === t.key ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted"}`}>
                {t.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <PartnerCard key={s.id} store={s}
            balance={balances.get(s.id) ?? 0}
            commissionPct={settings.commissionPct}
            reportCount={reportCounts.get(s.id) ?? 0}
            onChange={() => { reload(); loadReports(); }} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">ცარიელია.</p>}
      </div>

      {addOpen && <AddStoreModal onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); reload(); }} />}
    </div>
  );
}

function PartnerCard({ store, balance, commissionPct, reportCount, onChange }: { store: DbStore; balance: number; commissionPct: number; reportCount: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const isFlagged = reportCount >= FLAG_THRESHOLD;
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); onChange(); } finally { setBusy(false); }
  }
  return (
    <div className={`bg-card rounded-3xl border p-5 shadow-sm ${isFlagged ? "border-destructive/50 ring-2 ring-destructive/20" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted grid place-items-center text-3xl shrink-0">{store.logo ?? "🏪"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold truncate">{store.name}</h3>
            <StatusBadge status={store.status} />
            {reportCount > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${isFlagged ? "bg-destructive text-destructive-foreground" : "bg-warm text-warm-foreground"}`}>
                <AlertTriangle className="w-3 h-3" /> {reportCount} ჩივილი
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" /> {store.district ?? "—"} · {store.category}
          </div>
          {store.address && <div className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <div className="p-2.5 rounded-2xl bg-muted/50">
          <div className="text-muted-foreground">ბალანსი</div>
          <div className="font-bold text-sm">{formatGel(balance)}</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-muted/50">
          <div className="text-muted-foreground">კომისია</div>
          <div className="font-bold text-sm">{commissionPct}%</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {store.status === "pending" && (
          <button onClick={() => act(() => approveStore(store.id, store.owner_id ?? ""))} disabled={busy || !store.owner_id}
            className="flex-1 py-2.5 rounded-2xl bg-success text-success-foreground text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:opacity-90">
            <Check className="w-3.5 h-3.5" /> დამტკიცება
          </button>
        )}
        {store.status === "active" && (
          <button onClick={() => act(() => suspendStore(store.id))} disabled={busy}
            className="flex-1 py-2.5 rounded-2xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:bg-destructive/20">
            <Ban className="w-3.5 h-3.5" /> შეჩერება
          </button>
        )}
        {store.status === "suspended" && (
          <button onClick={() => act(() => reactivateStore(store.id))} disabled={busy}
            className="flex-1 py-2.5 rounded-2xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:bg-primary/20">
            <RefreshCcw className="w-3.5 h-3.5" /> გააქტიურება
          </button>
        )}
        <button
          onClick={() => {
            if (!confirm(`დარწმუნებული ხართ, რომ გსურთ „${store.name}"-ის სამუდამოდ წაშლა? ეს მოქმედება ვერ დაბრუნდება.`)) return;
            act(async () => {
              const { error } = await supabase.from("stores").delete().eq("id", store.id);
              if (error) alert(error.message);
            });
          }}
          disabled={busy}
          title="წაშლა"
          className="shrink-0 w-10 h-10 grid place-items-center rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-60"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warm text-warm-foreground",
    active: "bg-success/15 text-success",
    suspended: "bg-destructive/10 text-destructive",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${map[status] ?? "bg-muted"}`}>{status}</span>;
}

function AddStoreModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<{ name: string; logo: string; city: City; district: string; address: string; phone: string; category: string; description: string }>({
    name: "", logo: "🏪", city: "თბილისი", district: "ვაკე", address: "", phone: "", category: "საცხობი", description: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.from("stores").insert({ ...form, status: "active" });
    setBusy(false);
    if (error) setErr(error.message);
    else onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">ახალი პარტნიორი</h2>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <FieldInput label="სახელი *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="ლოგო (emoji)" value={form.logo} onChange={(v) => setForm({ ...form, logo: v })} />
            <FieldInput label="კატეგორია" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">ქალაქი</span>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value as City })}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">უბანი</span>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
                {DISTRICTS.filter((d) => d !== "ყველა უბანი").map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <FieldInput label="მისამართი *" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
          <FieldInput label="ტელეფონი" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+995..." />
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">აღწერა</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm" />
          </label>
          {err && <div className="text-sm text-destructive">{err}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-semibold">გაუქმება</button>
            <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60">
              {busy ? "იტვირთება…" : "დამატება"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
