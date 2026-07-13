import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Ban, RefreshCcw, MapPin } from "lucide-react";
import { useAllStores, approveStore, suspendStore, reactivateStore, type DbStore } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({ meta: [{ title: "პარტნიორები — ადმინი" }] }),
  component: AdminPartners,
});

function AdminPartners() {
  const { stores, reload } = useAllStores();
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended">("all");

  const filtered = filter === "all" ? stores : stores.filter((s) => s.status === filter);
  const tabs = [
    { key: "all", label: "ყველა" },
    { key: "pending", label: "მოლოდინი" },
    { key: "active", label: "აქტიური" },
    { key: "suspended", label: "შეჩერებული" },
  ] as const;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">პარტნიორები</h1>

      <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const count = t.key === "all" ? stores.length : stores.filter((s) => s.status === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${filter === t.key ? "bg-foreground text-background" : "bg-card text-foreground border border-border"}`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((s) => <PartnerCard key={s.id} store={s} onChange={reload} />)}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">ცარიელია.</p>}
      </div>
    </div>
  );
}

function PartnerCard({ store, onChange }: { store: DbStore; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); onChange(); } finally { setBusy(false); }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-muted grid place-items-center text-2xl">{store.logo ?? "🏪"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{store.name}</h3>
            <StatusBadge status={store.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {store.district ?? "—"} • {store.address ?? "—"}
          </div>
          {store.description && <p className="text-xs mt-1 line-clamp-2">{store.description}</p>}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {store.status === "pending" && (
          <button onClick={() => act(() => approveStore(store.id, store.owner_id ?? ""))} disabled={busy || !store.owner_id}
            className="flex-1 py-2 rounded-xl bg-success text-success-foreground text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
            <Check className="w-3.5 h-3.5" /> დამტკიცება
          </button>
        )}
        {store.status === "active" && (
          <button onClick={() => act(() => suspendStore(store.id))} disabled={busy}
            className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
            <Ban className="w-3.5 h-3.5" /> შეჩერება
          </button>
        )}
        {store.status === "suspended" && (
          <button onClick={() => act(() => reactivateStore(store.id))} disabled={busy}
            className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
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
    rejected: "bg-muted text-muted-foreground",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${map[status] ?? "bg-muted"}`}>{status}</span>;
}
