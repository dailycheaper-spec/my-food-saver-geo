import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Eye, EyeOff, Search, Filter } from "lucide-react";
import { useAllAddons, updateAddonAdmin, logAddonAudit } from "@/lib/admin-db";
import { formatGel } from "@/lib/db";
import { ADDON_CATEGORIES, addonCategoryKey } from "@/lib/addons";
import { AuditLogButton } from "@/components/AuditLogPanel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/addons")({
  head: () => ({ meta: [{ title: "Add-ons — Admin" }] }),
  component: AdminAddons,
});

function AdminAddons() {
  const { t } = useI18n();
  const { addons } = useAllAddons();
  const [q, setQ] = useState("");
  const [store, setStore] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  const stores = useMemo(
    () => Array.from(new Set(addons.map((a) => a.store?.name).filter(Boolean) as string[])),
    [addons],
  );

  const filtered = addons.filter((a) => {
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (store !== "all" && a.store?.name !== store) return false;
    if (category !== "all" && a.addon_category !== category) return false;
    if (status === "active" && !a.addon_active) return false;
    if (status === "inactive" && a.addon_active) return false;
    return true;
  });

  async function toggle(id: string, current: boolean) {
    await updateAddonAdmin(id, { addon_active: !current });
    await logAddonAudit(id, `addon_active=${current}`, `addon_active=${!current}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.addons.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} {t("admin.addons.count")}</p>
      </div>

      <div className="bg-card rounded-3xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Filter className="w-4 h-4" /> {t("admin.addons.filters")}</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("admin.addons.searchPlaceholder")}
              className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <Select value={store} onChange={setStore} options={[["all", t("admin.offers.allStores")], ...stores.map((s) => [s, s] as [string, string])]} />
          <Select value={category} onChange={setCategory}
            options={[["all", t("admin.offers.allCategories")], ...ADDON_CATEGORIES.map((c) => [c, t(addonCategoryKey(c))] as [string, string])]} />
          <Select value={status} onChange={(v) => setStatus(v as "all" | "active" | "inactive")}
            options={[["all", t("admin.offers.status")], ["active", t("admin.offers.active")], ["inactive", t("admin.offers.inactive")]]} />
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-semibold">{t("admin.offers.colTitle")}</th>
                <th className="text-left p-3 font-semibold">{t("admin.offers.colStore")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.offers.colPrice")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.addons.stock")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.addons.sold")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.addons.revenue")}</th>
                <th className="text-left p-3 font-semibold">{t("admin.offers.status")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.offers.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((a) => {
                const discounted = a.addon_discounted_price != null ? Number(a.addon_discounted_price) : null;
                const remaining =
                  a.addon_stock_quantity == null
                    ? null
                    : Math.max(0, Number(a.addon_stock_quantity) - Number(a.addon_stock_sold));
                return (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium truncate max-w-[220px]">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {a.addon_category ? t(addonCategoryKey(a.addon_category)) : "—"}
                      </div>
                    </td>
                    <td className="p-3 truncate max-w-[180px]">{a.store?.name ?? "—"}</td>
                    <td className="p-3 text-right">
                      <div className="font-bold">{formatGel(discounted ?? Number(a.default_original_price))}</div>
                      {discounted != null && discounted < Number(a.default_original_price) && (
                        <div className="text-[10px] line-through text-muted-foreground">{formatGel(Number(a.default_original_price))}</div>
                      )}
                    </td>
                    <td className="p-3 text-right">{remaining == null ? t("admin.addons.unlimited") : remaining}</td>
                    <td className="p-3 text-right">{a.sold_quantity}</td>
                    <td className="p-3 text-right font-medium">{formatGel(a.revenue)}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${a.addon_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {a.addon_active ? t("admin.offers.active") : t("admin.offers.inactive")}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => toggle(a.id, a.addon_active)}
                          className="w-8 h-8 grid place-items-center rounded-xl hover:bg-muted"
                          title={a.addon_active ? t("admin.offers.turnOff") : t("admin.offers.turnOn")}>
                          {a.addon_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <AuditLogButton entityType="addon" entityId={a.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
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
