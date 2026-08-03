import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Trash2, Eye, EyeOff, Search, Filter } from "lucide-react";
import { useAllOffers, updateOfferAdmin, deleteOfferAdmin } from "@/lib/admin-db";
import { formatGel, timeShort } from "@/lib/db";
import { AuditLogButton } from "@/components/AuditLogPanel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/offers")({
  head: () => ({ meta: [{ title: "Offers — Admin" }] }),
  component: AdminOffers,
});

function AdminOffers() {
  const { t } = useI18n();
  const { offers } = useAllOffers();
  const [q, setQ] = useState("");
  const [store, setStore] = useState("all");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const cities = useMemo(() => Array.from(new Set(offers.map((o) => o.store?.district).filter(Boolean) as string[])), [offers]);
  const stores = useMemo(() => Array.from(new Set(offers.map((o) => o.store?.name).filter(Boolean) as string[])), [offers]);
  const categories = useMemo(() => Array.from(new Set(offers.map((o) => o.category))), [offers]);

  const filtered = offers.filter((o) => {
    if (q && !o.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (store !== "all" && o.store?.name !== store) return false;
    if (city !== "all" && o.store?.district !== city) return false;
    if (category !== "all" && o.category !== category) return false;
    if (status === "active" && !o.is_active) return false;
    if (status === "inactive" && o.is_active) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.offers.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} {t("admin.offers.count")}</p>
      </div>

      <div className="bg-card rounded-3xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Filter className="w-4 h-4" /> {t("admin.offers.filters")}</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.offers.searchPlaceholder")}
              className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <Select value={store} onChange={setStore} options={[["all", t("admin.offers.allStores")], ...stores.map((s) => [s, s] as [string, string])]} />
          <Select value={city} onChange={setCity} options={[["all", t("admin.offers.allDistricts")], ...cities.map((c) => [c, c] as [string, string])]} />
          <Select value={category} onChange={setCategory} options={[["all", t("admin.offers.allCategories")], ...categories.map((c) => [c, c] as [string, string])]} />
          <Select value={status} onChange={(v) => setStatus(v as any)} options={[["all", t("admin.offers.status")], ["active", t("admin.offers.active")], ["inactive", t("admin.offers.inactive")]]} />
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-semibold">{t("admin.offers.colTitle")}</th>
                <th className="text-left p-3 font-semibold">{t("admin.offers.colStore")}</th>
                <th className="text-left p-3 font-semibold">{t("admin.offers.colWindow")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.offers.colPrice")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.offers.colAvail")}</th>
                <th className="text-left p-3 font-semibold">{t("admin.offers.status")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.offers.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium truncate max-w-[220px]">{o.title}</div>
                    <div className="text-[10px] text-muted-foreground">{o.category}</div>
                  </td>
                  <td className="p-3 truncate max-w-[180px]">{o.store?.name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{timeShort(o.pickup_from)}–{timeShort(o.pickup_to)}</td>
                  <td className="p-3 text-right">
                    <div className="font-bold">{formatGel(Number(o.discounted_price))}</div>
                    <div className="text-[10px] line-through text-muted-foreground">{formatGel(Number(o.original_price))}</div>
                  </td>
                  <td className="p-3 text-right">{o.quantity_available - o.quantity_sold}/{o.quantity_available}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${o.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {o.is_active ? t("admin.offers.active") : t("admin.offers.inactive")}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => updateOfferAdmin(o.id, { is_active: !o.is_active })}
                        className="w-8 h-8 grid place-items-center rounded-xl hover:bg-muted" title={o.is_active ? t("admin.offers.turnOff") : t("admin.offers.turnOn")}>
                        {o.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => { if (confirm(t("admin.offers.confirmDelete"))) deleteOfferAdmin(o.id); }}
                        className="w-8 h-8 grid place-items-center rounded-xl hover:bg-destructive/10 text-destructive" title={t("admin.offers.delete")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <AuditLogButton entityType="offer" entityId={o.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t("admin.offers.nothingFound")}</p>}
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
