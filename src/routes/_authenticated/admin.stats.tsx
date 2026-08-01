import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TrendingUp, Store, Package, Users, Leaf, Repeat, Wallet, Percent } from "lucide-react";
import { useAllOrders, useAllStores, formatGel, currencyLabel } from "@/lib/db";
import { useAllOffers } from "@/lib/admin-db";
import { returningCustomerPct, averageBasketValue, averageDiscountPct } from "@/lib/insights";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/stats")({
  head: () => {
    const lang = typeof window !== "undefined" ? window.localStorage.getItem("cheaper-language") : null;
    const title = lang === "en" ? "Statistics — Admin" : lang === "ru" ? "Статистика — Админ" : "სტატისტიკა — ადმინი";
    return { meta: [{ title }] };
  },
  component: AdminStats,
});

function AdminStats() {
  const { t } = useI18n();
  const { orders } = useAllOrders();
  const { stores } = useAllStores();
  const { offers } = useAllOffers();
  const [range, setRange] = useState<"day" | "week" | "month">("week");

  const days = range === "day" ? 1 : range === "week" ? 7 : 30;

  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return orders.filter((o) => o.status !== "cancelled" && new Date(o.created_at).getTime() >= cutoff);
  }, [orders, days]);

  const revenue = filtered.reduce((s, o) => s + Number(o.amount), 0);
  const customerSavings = filtered.reduce((s, o) => {
    const original = o.original_price_at_purchase ?? o.offer?.original_price ?? 0;
    const discounted = o.offer?.discounted_price ?? 0;
    return s + Math.max(0, original - discounted) * o.quantity;
  }, 0);

  // Daily buckets
  const buckets = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    filtered.forEach((o) => {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + Number(o.amount));
    });
    return Array.from(map.entries());
  }, [filtered, days]);

  const maxBucket = Math.max(1, ...buckets.map(([, v]) => v));

  // Top stores
  const topStores = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();
    filtered.forEach((o) => {
      const prev = map.get(o.store_id) ?? { orders: 0, revenue: 0 };
      prev.orders += 1;
      prev.revenue += Number(o.amount);
      map.set(o.store_id, prev);
    });
    return Array.from(map.entries())
      .map(([id, s]) => ({ store: stores.find((x) => x.id === id), ...s }))
      .filter((x) => x.store)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filtered, stores]);

  // Top offers
  const topOffers = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((o) => map.set(o.offer_id, (map.get(o.offer_id) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => ({ offer: offers.find((x) => x.id === id), count }))
      .filter((x) => x.offer)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered, offers]);

  return (
    <div className="space-y-6">
      <div className="head-row sm:flex sm:items-end sm:justify-between sm:flex-wrap sm:gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.stats.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{days === 1 ? t("admin.stats.last24h") : days === 7 ? t("admin.stats.last7d") : t("admin.stats.last30d")}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-2xl bg-muted">
          {(["day", "week", "month"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${range === r ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {r === "day" ? t("admin.stats.daily") : r === "week" ? t("admin.stats.weekly") : t("admin.stats.monthly")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Kpi icon={TrendingUp} label={t("admin.stats.revenue")} value={formatGel(revenue)} tint="success" />
        <Kpi icon={Package} label={t("admin.stats.orders")} value={filtered.length.toString()} tint="primary" />
        <Kpi icon={Leaf} label={t("admin.stats.savedKg")} value={formatGel(customerSavings)} tint="success" />
        <Kpi icon={Users} label={t("admin.stats.activeCustomers")} value={new Set(filtered.map((o) => o.user_id)).size.toString()} tint="warm" />
      </div>

      <PlatformInsights orders={orders} />



      {/* Revenue chart */}
      <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
        <h3 className="font-display font-bold text-lg mb-4">{t("admin.stats.revenueByDay")}</h3>
        <div className="flex items-end gap-1 h-48">
          {buckets.map(([date, value]) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {value.toFixed(0)} {currencyLabel()}
              </div>
              <div className="w-full bg-primary/80 hover:bg-primary rounded-t-lg transition-colors"
                style={{ height: `${(value / maxBucket) * 100}%`, minHeight: value > 0 ? "4px" : "0" }} />
              <div className="text-[9px] text-muted-foreground">{date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top stores */}
        <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">{t("admin.stats.topStores")}</h3>
          </div>
          <div className="space-y-2">
            {topStores.map((row, i) => (
              <div key={row.store!.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-muted/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary grid place-items-center text-sm font-bold shrink-0">{i + 1}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{row.store!.name}</div>
                    <div className="text-xs text-muted-foreground">{row.orders} {t("admin.stats.orderCount")}</div>
                  </div>
                </div>
                <div className="font-bold text-sm shrink-0">{formatGel(row.revenue)}</div>
              </div>
            ))}
            {topStores.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("admin.stats.empty")}</p>}
          </div>
        </div>

        {/* Top offers */}
        <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">{t("admin.stats.topProducts")}</h3>
          </div>
          <div className="space-y-2">
            {topOffers.map((t, i) => (
              <div key={t.offer!.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-muted/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-warm text-warm-foreground grid place-items-center text-sm font-bold shrink-0">{i + 1}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.offer!.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.offer!.store?.name ?? "—"}</div>
                  </div>
                </div>
                <div className="font-bold text-sm shrink-0">{t.count}×</div>
              </div>
            ))}
            {topOffers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("admin.stats.empty")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: string; tint: "primary" | "success" | "warm" }) {
  const tints = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warm: "bg-warm text-warm-foreground",
  };
  return (
    <div className="bg-card rounded-3xl border border-border p-4 lg:p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-2xl grid place-items-center mb-3 ${tints[tint]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function PlatformInsights({ orders }: { orders: Parameters<typeof returningCustomerPct>[0] }) {
  const { t } = useI18n();
  const returning = useMemo(() => returningCustomerPct(orders, 30), [orders]);
  const basket = useMemo(() => averageBasketValue(orders), [orders]);
  const avgDisc = useMemo(() => averageDiscountPct(orders as Parameters<typeof averageDiscountPct>[0], 30), [orders]);

  return (
    <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
      <h3 className="font-display font-bold text-lg mb-4">{t("admin.stats.platformOverview")}</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MiniStat
          icon={Repeat}
          label={t("admin.stats.returningCustomers")}
          value={returning ? `${returning.pct.toFixed(0)}%` : "—"}
          note={returning ? `${returning.returning}/${returning.total}` : t("admin.stats.notEnoughData")}
        />
        <MiniStat
          icon={Wallet}
          label={t("admin.stats.avgBasket")}
          value={basket === null ? "—" : formatGel(basket)}
          note={basket === null ? t("admin.stats.notEnoughData") : undefined}
        />
        <MiniStat
          icon={Percent}
          label={t("admin.stats.avgDiscount")}
          value={avgDisc === null ? "—" : `${avgDisc.toFixed(0)}%`}
          note={avgDisc === null ? t("admin.stats.notEnoughData") : undefined}
        />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, note }: { icon: React.ElementType; label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-2">
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {note && <div className="text-[11px] text-muted-foreground mt-1">{note}</div>}
    </div>
  );
}

