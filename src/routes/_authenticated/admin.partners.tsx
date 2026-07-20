import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Ban, RefreshCcw, MapPin, Search, Plus, X } from "lucide-react";
import { useAllStores, approveStore, suspendStore, reactivateStore, formatGel, useAllOrders, type DbStore } from "@/lib/db";
import { loadAdminSettings } from "@/lib/admin-settings";
import { supabase } from "@/integrations/supabase/client";
import { DISTRICTS } from "@/lib/mock-data";
import { CITIES, type City } from "@/lib/city";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({ meta: [{ title: "პარტნიორები — ადმინი" }] }),
  component: AdminPartners,
});

function AdminPartners() {
  const { stores, reload } = useAllStores();
  const { orders } = useAllOrders();
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended">("all");
  const [q, setQ] = useState("");
  const settings = loadAdminSettings();

  const balances = new Map<string, number>();
  orders.filter((o) => o.status !== "cancelled").forEach((o) => {
    const prev = balances.get(o.store_id) ?? 0;
    balances.set(o.store_id, prev + Number(o.amount) * (1 - settings.commissionPct / 100));
  });

  const filtered = stores
    .filter((s) => filter === "all" ? true : s.status === filter)
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.category ?? "").toLowerCase().includes(q.toLowerCase()));

  const tabs = [
    { key: "all", label: "ყველა" },
    { key: "pending", label: "მოლოდინი" },
    { key: "active", label: "აქტიური" },
    { key: "suspended", label: "შეჩერებული" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">პარტნიორები</h1>
        <p className="text-sm text-muted-foreground mt-1">მართე რესტორნები და საცხობები</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ძებნა სახელით ან კატეგორიით…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => {
            const count = t.key === "all" ? stores.length : stores.filter((s) => s.status === t.key).length;
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
            onChange={reload} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">ცარიელია.</p>}
      </div>
    </div>
  );
}

function PartnerCard({ store, balance, commissionPct, onChange }: { store: DbStore; balance: number; commissionPct: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); onChange(); } finally { setBusy(false); }
  }
  return (
    <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted grid place-items-center text-3xl shrink-0">{store.logo ?? "🏪"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold truncate">{store.name}</h3>
            <StatusBadge status={store.status} />
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
