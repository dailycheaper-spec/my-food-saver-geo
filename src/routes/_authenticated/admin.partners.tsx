import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, Ban, RefreshCcw, MapPin, Search, Plus, X, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { useAllStores, formatGel, useAllOrders, type DbStore } from "@/lib/db";
import { useStoresBankDetailsMap, type StoreBankInfo } from "@/lib/admin-db";
import { loadAdminSettings } from "@/lib/admin-settings";
import { supabase } from "@/integrations/supabase/client";
import { DISTRICTS, DISTRICT_COORDS } from "@/lib/mock-data";
import { CITIES, type City } from "@/lib/city";
import { approveAdminStore, createAdminStore, deleteAdminStore, setAdminStoreStatus, updateAdminStore } from "@/lib/admin-store.functions";
import { evaluateStoreLocation, calculateDistanceKm, type StoreLocationStatus } from "@/lib/geo";
import { StoreLocationPreview } from "@/components/StoreLocationPreview";
import { AdminStoreLocationModal } from "@/components/AdminStoreLocationModal";
import { StoreLogo } from "@/components/StoreLogo";
import { StoreLogoPicker } from "@/components/StoreLogoPicker";
import { isValidGeorgianIban } from "@/lib/bank-account";

type StoreExtras = { lat: number | null; lng: number | null; visibility_radius_km: number | null };
function storeExtras(s: DbStore): StoreExtras {
  const a = s as unknown as Record<string, unknown>;
  return {
    lat: typeof a.lat === "number" ? (a.lat as number) : null,
    lng: typeof a.lng === "number" ? (a.lng as number) : null,
    visibility_radius_km:
      typeof a.visibility_radius_km === "number" ? (a.visibility_radius_km as number) : null,
  };
}


const FLAG_THRESHOLD = 5;

const STORE_TYPES = [
  { value: "restaurant", label: "რესტორანი" },
  { value: "bakery", label: "საცხობი" },
  { value: "cafe", label: "კაფე" },
  { value: "market", label: "მარკეტი" },
  { value: "grocery", label: "სასურსათო" },
  { value: "other", label: "სხვა" },
];

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({ meta: [{ title: "პარტნიორები — ადმინი" }] }),
  component: AdminPartners,
});

const LOC_FILTERS = [
  { key: "missing_coords", label: "მდებარეობის გარეშე" },
  { key: "invalid_coords", label: "არასწორი კოორდინატები" },
  { key: "no_radius", label: "რადიუსი მითითებული არაა" },
  { key: "city_wide", label: "მთელი ქალაქი" },
  { key: "has_offers", label: "აქტიური შეთავაზებები" },
  { key: "no_offers", label: "შეთავაზების გარეშე" },
] as const;
type LocFilterKey = typeof LOC_FILTERS[number]["key"];

function AdminPartners() {
  const { stores, reload, loading, error } = useAllStores();
  const { orders } = useAllOrders();
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended" | "flagged">("pending");
  const [locFilters, setLocFilters] = useState<Set<LocFilterKey>>(new Set());
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DbStore | null>(null);
  const [editingStore, setEditingStore] = useState<DbStore | null>(null);
  const [reportCounts, setReportCounts] = useState<Map<string, number>>(new Map());
  const [activeOffersCount, setActiveOffersCount] = useState<Map<string, number>>(new Map());
  const bankMap = useStoresBankDetailsMap();
  const settings = loadAdminSettings();

  async function loadReports() {
    const { data } = await supabase.from("store_reports").select("store_id");
    const m = new Map<string, number>();
    (data ?? []).forEach((r: { store_id: string }) => m.set(r.store_id, (m.get(r.store_id) ?? 0) + 1));
    setReportCounts(m);
  }
  async function loadActiveOffers() {
    const { data } = await supabase.from("offers").select("store_id").eq("is_active", true);
    const m = new Map<string, number>();
    (data ?? []).forEach((r: { store_id: string }) => m.set(r.store_id, (m.get(r.store_id) ?? 0) + 1));
    setActiveOffersCount(m);
  }
  useEffect(() => { loadReports(); loadActiveOffers(); }, []);

  const balances = new Map<string, number>();
  orders.filter((o) => o.status !== "cancelled").forEach((o) => {
    const prev = balances.get(o.store_id) ?? 0;
    balances.set(o.store_id, prev + Number(o.amount) * (1 - settings.commissionPct / 100));
  });

  function passesLocFilters(s: DbStore): boolean {
    if (locFilters.size === 0) return true;
    const { lat, lng, visibility_radius_km } = storeExtras(s);
    const status = evaluateStoreLocation(lat, lng);
    const offers = activeOffersCount.get(s.id) ?? 0;
    for (const k of locFilters) {
      if (k === "missing_coords" && status !== "missing") return false;
      if (k === "invalid_coords" && status !== "invalid") return false;
      if (k === "no_radius" && visibility_radius_km != null) return false;
      if (k === "city_wide" && !(visibility_radius_km != null && visibility_radius_km >= 50)) return false;
      if (k === "has_offers" && offers <= 0) return false;
      if (k === "no_offers" && offers > 0) return false;
    }
    return true;
  }

  const filtered = stores
    .filter((s) => filter === "all" ? true : filter === "flagged" ? (reportCounts.get(s.id) ?? 0) >= FLAG_THRESHOLD : s.status === filter)
    .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || (s.category ?? "").toLowerCase().includes(q.toLowerCase()))
    .filter(passesLocFilters);

  const flaggedCount = stores.filter((s) => (reportCounts.get(s.id) ?? 0) >= FLAG_THRESHOLD).length;
  const pendingCount = stores.filter((s) => s.status === "pending").length;

  const tabs = [
    { key: "all", label: "ყველა" },
    { key: "pending", label: "მოლოდინი" },
    { key: "active", label: "აქტიური" },
    { key: "suspended", label: "შეჩერებული" },
    { key: "flagged", label: "🚩 გასაჩივრებული" },
  ] as const;

  function toggleLoc(k: LocFilterKey) {
    setLocFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

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

      <div className="grid gap-3 sm:flex sm:items-start sm:justify-between sm:flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">პარტნიორები</h1>
          <p className="text-sm text-muted-foreground mt-1">მართე რესტორნები და საცხობები</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:flex-wrap">
          <button onClick={() => { reload(); loadActiveOffers(); loadReports(); }} disabled={loading}
            className="inline-flex items-center justify-center min-h-11 gap-1.5 px-4 py-2.5 rounded-2xl bg-card border border-border text-sm font-semibold shadow-sm hover:bg-muted disabled:opacity-60">
            <RefreshCcw className={`w-4 h-4 shrink-0 ${loading ? "animate-spin" : ""}`} /> <span className="truncate">განაცხადების შემოწმება ({pendingCount})</span>
          </button>
          <button onClick={() => setAddOpen(true)}
            className="inline-flex items-center justify-center min-h-11 gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90">
            <Plus className="w-4 h-4 shrink-0" /> <span className="truncate">პარტნიორის დამატება</span>
          </button>
        </div>
      </div>



      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          განაცხადების ჩატვირთვა ვერ მოხერხდა: {error}
        </div>
      )}

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

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1">მდებარეობის ფილტრები:</span>
        {LOC_FILTERS.map((f) => {
          const active = locFilters.has(f.key);
          return (
            <button key={f.key} onClick={() => toggleLoc(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
              {f.label}
            </button>
          );
        })}
        {locFilters.size > 0 && (
          <button onClick={() => setLocFilters(new Set())}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground">
            გასუფთავება
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <PartnerCard key={s.id} store={s}
            balance={balances.get(s.id) ?? 0}
            commissionPct={settings.commissionPct}
            reportCount={reportCounts.get(s.id) ?? 0}
            activeOffers={activeOffersCount.get(s.id) ?? 0}
            bank={bankMap.get(s.id) ?? null}
            onEditLocation={() => setEditingLocation(s)}
            onEdit={() => setEditingStore(s)}
            onChange={() => { reload(); loadReports(); loadActiveOffers(); }} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">ცარიელია.</p>}
      </div>

      {addOpen && <AddStoreModal onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); reload(); }} />}
      {editingLocation && (
        <AdminStoreLocationModal
          store={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSaved={() => { setEditingLocation(null); reload(); }}
        />
      )}
      {editingStore && (
        <EditStoreModal
          store={editingStore}
          onClose={() => setEditingStore(null)}
          onSaved={() => { setEditingStore(null); reload(); }}
        />
      )}
    </div>
  );

}

function PartnerCard({ store, balance, commissionPct, reportCount, activeOffers, bank, onEditLocation, onEdit, onChange }: { store: DbStore; balance: number; commissionPct: number; reportCount: number; activeOffers: number; bank: StoreBankInfo | null; onEditLocation: () => void; onEdit: () => void; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const approveStoreFn = useServerFn(approveAdminStore);
  const setStatusFn = useServerFn(setAdminStoreStatus);
  const deleteStoreFn = useServerFn(deleteAdminStore);
  const isFlagged = reportCount >= FLAG_THRESHOLD;
  const { lat, lng, visibility_radius_km } = useMemo(() => storeExtras(store), [store]);
  const locStatus: StoreLocationStatus = evaluateStoreLocation(lat, lng);
  const districtCenter = store.district ? DISTRICT_COORDS[store.district] : undefined;
  const farFromDistrict =
    locStatus === "ok" && districtCenter && lat != null && lng != null
      ? calculateDistanceKm(lat, lng, districtCenter[0], districtCenter[1]) > 15
      : false;
  const radiusMissing = visibility_radius_km == null;
  const ibanValid = bank ? isValidGeorgianIban(bank.iban) : false;

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); onChange(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  return (
    <div className={`bg-card rounded-3xl border p-5 shadow-sm ${isFlagged ? "border-destructive/50 ring-2 ring-destructive/20" : "border-border"}`}>
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-muted grid place-items-center overflow-hidden text-3xl shrink-0"><StoreLogo value={(store as unknown as { logo_url?: string | null }).logo_url || store.logo} emojiClassName="text-3xl" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold truncate">{store.name}</h3>
            <StatusBadge status={store.status} />
            {ibanValid ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 bg-success/15 text-success" title={`${bank!.iban}${bank!.account_holder ? " · " + bank!.account_holder : ""}`}>
                <Check className="w-3 h-3" /> IBAN მითითებულია{bank?.account_holder ? ` · ${bank.account_holder}` : ""}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 bg-destructive/10 text-destructive">
                <AlertTriangle className="w-3 h-3" /> IBAN არ არის მითითებული
              </span>
            )}
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
          {(store.company_id_number || store.contact_email) && (
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {store.company_id_number && <div>ს/ნ: <span className="font-medium text-foreground">{store.company_id_number}</span></div>}
              {store.contact_email && <div>მეილი: <span className="font-medium text-foreground">{store.contact_email}</span></div>}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          title="რედაქტირება"
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-muted"
        >
          <Pencil className="w-3 h-3" /> რედაქტ.
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">მდებარეობა</div>
          <button
            type="button"
            onClick={onEditLocation}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-semibold hover:bg-muted"
          >
            <Pencil className="w-3 h-3" /> რედაქტირება
          </button>
        </div>
        <StoreLocationPreview lat={lat} lng={lng} height={130} />
        <div className="text-xs space-y-0.5">
          <LocStatusLine status={locStatus} />
          <div className="text-muted-foreground">
            კოორდინატები: <span className="font-mono text-foreground">
              {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "—"}
            </span>
          </div>
          <div className="text-muted-foreground">
            რადიუსი: <span className="font-semibold text-foreground">
              {visibility_radius_km == null
                ? "მითითებული არაა"
                : visibility_radius_km >= 50
                  ? "მთელი ქალაქი"
                  : `${visibility_radius_km} კმ`}
            </span>
            {" · "}
            აქტიური შეთავაზება: <span className="font-semibold text-foreground">{activeOffers}</span>
          </div>
          {store.status === "pending" && (locStatus !== "ok" || radiusMissing || farFromDistrict) && (
            <div className="mt-2 text-[11px] rounded-lg bg-warm/40 border border-warm text-warm-foreground p-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                {locStatus === "missing" && <div>კოორდინატები არ არის მითითებული — შეამოწმეთ დამტკიცებამდე.</div>}
                {locStatus === "invalid" && <div>კოორდინატები საქართველოს საზღვრებს გარეთაა.</div>}
                {radiusMissing && <div>ხილვადობის რადიუსი მითითებული არაა.</div>}
                {farFromDistrict && <div>კოორდინატები შორსაა უბნისგან „{store.district}"-.</div>}
              </div>
            </div>
          )}
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
          <>
            <button onClick={() => act(async () => { await approveStoreFn({ data: { storeId: store.id, ownerId: store.owner_id } }); })} disabled={busy}
              className="flex-1 py-2.5 rounded-2xl bg-success text-success-foreground text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:opacity-90">
              <Check className="w-3.5 h-3.5" /> დამტკიცება
            </button>
            <button
              onClick={() => {
                if (!confirm(`უარვყოთ „${store.name}"-ის განაცხადი?`)) return;
                act(async () => {
                  await deleteStoreFn({ data: { storeId: store.id } });
                });
              }}
              disabled={busy}
              className="flex-1 py-2.5 rounded-2xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:bg-destructive/20">
              <Ban className="w-3.5 h-3.5" /> უარყოფა
            </button>
          </>
        )}
        {store.status === "active" && (
          <button onClick={() => act(async () => { await setStatusFn({ data: { storeId: store.id, status: "suspended" } }); })} disabled={busy}
            className="flex-1 py-2.5 rounded-2xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:bg-destructive/20">
            <Ban className="w-3.5 h-3.5" /> შეჩერება
          </button>
        )}
        {store.status === "suspended" && (
          <button onClick={() => act(async () => { await setStatusFn({ data: { storeId: store.id, status: "active" } }); })} disabled={busy}
            className="flex-1 py-2.5 rounded-2xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 hover:bg-primary/20">
            <RefreshCcw className="w-3.5 h-3.5" /> გააქტიურება
          </button>
        )}
        <button
          onClick={() => {
            if (!confirm(`დარწმუნებული ხართ, რომ გსურთ „${store.name}"-ის სამუდამოდ წაშლა? ეს მოქმედება ვერ დაბრუნდება.`)) return;
            act(async () => {
              await deleteStoreFn({ data: { storeId: store.id } });
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

function LocStatusLine({ status }: { status: StoreLocationStatus }) {
  if (status === "ok") return <div className="text-success font-semibold">✓ მდებარეობა გამართულია</div>;
  if (status === "invalid") return <div className="text-destructive font-semibold">✗ კოორდინატები არასწორია</div>;
  return <div className="text-warm-foreground font-semibold">⚠ მდებარეობა არ არის მითითებული</div>;
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
  const [form, setForm] = useState<{ name: string; logo: string; city: City; district: string; address: string; phone: string; contact_email: string; company_id_number: string; category: string; description: string }>({
    name: "", logo: "🏪", city: "თბილისი", district: "ვაკე", address: "", phone: "", contact_email: "", company_id_number: "", category: "საცხობი", description: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const createStoreFn = useServerFn(createAdminStore);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await createStoreFn({ data: form });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
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
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">ობიექტის ტიპი</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
                {STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
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
          <FieldInput label="კომპანიის საიდენტიფიკაციო ნომერი *" value={form.company_id_number} onChange={(v) => setForm({ ...form, company_id_number: v })} required />
          <FieldInput label="მეილი *" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="name@example.com" type="email" required />
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

function FieldInput({ label, value, onChange, placeholder, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}

type EntityType = "company" | "individual_entrepreneur";

function EditStoreModal({ store, onClose, onSaved }: { store: DbStore; onClose: () => void; onSaved: () => void }) {
  const s = store as unknown as Record<string, any>;
  const [form, setForm] = useState({
    name: store.name ?? "",
    name_en: (s.name_en as string | null) ?? "",
    name_ru: (s.name_ru as string | null) ?? "",
    logo: store.logo ?? "🏪",
    logo_url: (s.logo_url as string | null) ?? null,
    entity_type: ((s.entity_type as EntityType) ?? "company") as EntityType,
    company_id_number: store.company_id_number ?? "",
    category: store.category ?? "restaurant",
    city: (store.city ?? "თბილისი") as City,
    district: store.district ?? "ვაკე",
    address: store.address ?? "",
    phone: store.phone ?? "",
    contact_email: store.contact_email ?? "",
    description: store.description ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const updateFn = useServerFn(updateAdminStore);

  const idMax = form.entity_type === "individual_entrepreneur" ? 11 : 9;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await updateFn({ data: { storeId: store.id, patch: {
        name: form.name,
        name_en: form.name_en || null,
        name_ru: form.name_ru || null,
        logo: form.logo || null,
        logo_url: form.logo_url,
        entity_type: form.entity_type,
        company_id_number: form.company_id_number,
        category: form.category,
        city: form.city,
        district: form.district,
        address: form.address,
        phone: form.phone || null,
        contact_email: form.contact_email,
        description: form.description || null,
      } } });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-3xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">პარტნიორის რედაქტირება</h2>
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <FieldInput label="სახელი (ქართული) *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="სახელი (English)" value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} />
            <FieldInput label="სახელი (Русский)" value={form.name_ru} onChange={(v) => setForm({ ...form, name_ru: v })} />
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">ლოგო</span>
            <div className="mt-1">
              <StoreLogoPicker
                storeId={store.id}
                logoUrl={form.logo_url}
                logoEmoji={form.logo}
                onChange={(next) => setForm((prev) => ({ ...prev, logo: next.logo ?? prev.logo, logo_url: next.logo_url === undefined ? prev.logo_url : next.logo_url }))}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">ობიექტის ტიპი</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm">
              {STORE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">იურიდიული ფორმა</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["company", "individual_entrepreneur"] as EntityType[]).map((et) => (
                <button type="button" key={et}
                  onClick={() => setForm({ ...form, entity_type: et, company_id_number: "" })}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-medium ${form.entity_type === et ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
                  {et === "company" ? "შპს / კომპანია" : "ინდივიდუალური მეწარმე"}
                </button>
              ))}
            </div>
          </label>

          <FieldInput
            label={form.entity_type === "individual_entrepreneur" ? "პირადი ნომერი (11 ციფრი) *" : "საიდენტიფიკაციო ნომერი (9 ციფრი) *"}
            value={form.company_id_number}
            onChange={(v) => setForm({ ...form, company_id_number: v.replace(/\D/g, "").slice(0, idMax) })}
            required
          />

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
          <FieldInput label="მეილი *" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} type="email" required />
          <FieldInput label="ტელეფონი" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+995..." />

          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">აღწერა</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm" />
          </label>

          <p className="text-[11px] text-muted-foreground">
            IBAN და ანგარიშის მფლობელი იცვლება პარტნიორის საბანკო დეტალების ცალკე ფლოუდან.
          </p>

          {err && <div className="text-sm text-destructive">{err}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-semibold">გაუქმება</button>
            <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60">
              {busy ? "ინახება…" : "შენახვა"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
