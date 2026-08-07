import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, TrendingUp, ShoppingBag, Wallet, Trophy } from "lucide-react";
import { useMyStores, useStoreOffers, useStoreOrders, formatGel } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/partner/stats")({
  head: () => ({ meta: [{ title: "სტატისტიკა — Cheaper" }] }),
  component: StatsPage,
});

function StatsPage() {
  const { t } = useI18n();

  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const { offers } = useStoreOffers(store?.id ?? null);
  const { orders } = useStoreOrders(store?.id ?? null);
  const navigate = useNavigate();

  const s = useMemo(() => {
    const today = new Date().toDateString();
    const paid = orders.filter((o) => o.status === "paid" || o.status === "ready" || o.status === "collected");
    const todayPaid = paid.filter((o) => new Date(o.created_at).toDateString() === today);
    const revenue = todayPaid.reduce((a, o) => a + Number(o.amount), 0);
    const counts = new Map<string, number>();
    for (const o of paid) {
      const title = o.offer?.title ?? "?";
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const saved = paid.reduce((a, o) => {
      const original = o.original_price_at_purchase ?? o.offer?.original_price ?? 0;
      const discounted = o.offer?.discounted_price ?? 0;
      return a + Math.max(0, original - discounted) * o.quantity;
    }, 0);
    // ── "ხელს გააყოლე" add-on figures (same orders, no extra query) ──
    const paidWithAddons = paid.filter((o) => (o.order_addons?.length ?? 0) > 0);
    const addonRevenue = paid.reduce(
      (a, o) => a + (o.order_addons ?? []).reduce((s, l) => s + Number(l.unit_price) * l.quantity, 0),
      0,
    );
    const addonCounts = new Map<string, number>();
    for (const o of paid)
      for (const l of o.order_addons ?? []) {
        const name = l.saved_products?.name ?? "—";
        addonCounts.set(name, (addonCounts.get(name) ?? 0) + l.quantity);
      }
    const topAddons = Array.from(addonCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    // Rates off a handful of orders are noise — gate them behind a real sample.
    const hasAddonSample = paid.length >= 10;
    const addonConversionPct = hasAddonSample ? Math.round((paidWithAddons.length / paid.length) * 100) : 0;
    const avgAddonsPerOrder = hasAddonSample
      ? paid.reduce((a, o) => a + (o.order_addons ?? []).reduce((s, l) => s + l.quantity, 0), 0) / paid.length
      : 0;
    return {
      todayCount: todayPaid.length,
      revenue,
      top,
      saved,
      totalSold: paid.length,
      activeOffers: offers.filter((x) => x.is_active).length,
      addonRevenue,
      topAddons,
      hasAddonSample,
      addonConversionPct,
      avgAddonsPerOrder,
    };
  }, [orders, offers]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>
      <h1 className="font-display text-2xl font-bold mb-5">{t("stats")}</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Kpi color="from-primary to-primary/70" icon={<ShoppingBag className="w-5 h-5" />} label={t("todayOrders")} value={String(s.todayCount)} />
        <Kpi color="from-orange-500 to-amber-400" icon={<TrendingUp className="w-5 h-5" />} label={t("todayRevenue")} value={formatGel(s.revenue)} />
        <Kpi color="from-blue-500 to-cyan-400" icon={<Trophy className="w-5 h-5" />} label={t("totalSold")} value={String(s.totalSold)} />
        <Kpi color="from-emerald-500 to-teal-400" icon={<Wallet className="w-5 h-5" />} label={t("foodSaved")} value={formatGel(s.saved)} />
      </div>

      <div className="bg-card rounded-3xl border border-border p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> {t("topSelling")}</h3>
        {s.top.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("noData")}</p>
        ) : (
          <div className="space-y-2">
            {s.top.map(([title, count], i) => (
              <div key={title} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-100 text-slate-700" : "bg-orange-100 text-orange-700"}`}>{i + 1}</div>
                <div className="flex-1 truncate">{title}</div>
                <div className="font-bold text-primary">{count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-3xl border border-border p-5 mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-primary" /> {t("partner.stats.addonsTitle")}
        </h3>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">{t("partner.stats.addonRevenue")}</span>
          <span className="font-bold text-primary">{formatGel(s.addonRevenue)}</span>
        </div>
        {s.topAddons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("noData")}</p>
        ) : (
          <div className="space-y-2">
            {s.topAddons.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-100 text-slate-700" : "bg-orange-100 text-orange-700"}`}>{i + 1}</div>
                <div className="flex-1 truncate">{name}</div>
                <div className="font-bold text-primary">{count}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm border-t border-border pt-3">
          <div>
            <div className="text-muted-foreground text-xs">{t("partner.stats.addonConversion")}</div>
            <div className="font-bold">
              {s.hasAddonSample ? `${s.addonConversionPct}%` : <span className="text-muted-foreground font-normal">{t("noData")}</span>}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("partner.stats.avgAddonsPerOrder")}</div>
            <div className="font-bold">
              {s.hasAddonSample ? s.avgAddonsPerOrder.toFixed(1) : <span className="text-muted-foreground font-normal">{t("noData")}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ color, icon, label, value }: { color: string; icon: React.ReactNode; label: string; value: string }) {
  const sizeClass = value.length > 12 ? "text-base" : value.length > 8 ? "text-lg" : "text-2xl";
  return (
    <div className={`rounded-3xl p-4 bg-gradient-to-br ${color} text-white shadow-lg overflow-hidden`}>
      <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center">{icon}</div>
      <div className={`${sizeClass} font-bold mt-2 leading-tight break-words`}>{value}</div>
      <div className="text-xs opacity-90">{label}</div>
    </div>
  );
}
