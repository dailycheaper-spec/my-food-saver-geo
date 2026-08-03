import { createFileRoute, Link } from "@tanstack/react-router";
import { useAllStores, useAllOrders, formatGel } from "@/lib/db";
import { useAllOffers, useOnlinePresence, useRealtimeActivity } from "@/lib/admin-db";
import { loadAdminSettings } from "@/lib/admin-settings";
import {
  Store, ShoppingBag, TrendingUp, Users, Leaf, Percent, Radio, Activity, Inbox, ArrowRight,
} from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Home — Admin" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { t } = useI18n();
  const { stores } = useAllStores();
  const { orders } = useAllOrders();
  const { offers } = useAllOffers();
  const online = useOnlinePresence();
  const feed = useRealtimeActivity(orders, offers);
  const settings = loadAdminSettings();

  const today = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return orders.filter((o) => new Date(o.created_at) >= start);
  }, [orders]);

  const todayRevenue = today.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.amount), 0);
  const commission = todayRevenue * (settings.commissionPct / 100);
  const totalOrders = orders.length;
  const activeStores = stores.filter((s) => s.status === "active").length;
  const pendingStores = stores.filter((s) => s.status === "pending_verification" || s.status === "pending_documents");
  const customerSavings = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => {
      const original = o.original_price_at_purchase ?? o.offer?.original_price ?? 0;
      const discounted = o.offer?.discounted_price ?? 0;
      return s + Math.max(0, original - discounted) * o.quantity;
    }, 0);

  return (
    <div className="space-y-6">
      <div className="head-row sm:flex sm:items-end sm:justify-between sm:flex-wrap sm:gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> {t("admin.dashboard.realtime")}
        </div>
      </div>

      {pendingStores.length > 0 && (
        <Link to="/admin/partners"
          className="flex items-center gap-4 p-4 lg:p-5 rounded-3xl bg-warm border border-warm-foreground/20 hover:opacity-95 transition-opacity">
          <div className="w-12 h-12 rounded-2xl bg-warm-foreground/10 grid place-items-center shrink-0">
            <Inbox className="w-6 h-6 text-warm-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-warm-foreground">
              {t("admin.dashboard.newApplications", { count: pendingStores.length })}
            </div>
            <div className="text-xs text-warm-foreground/80 mt-0.5 truncate">
              {pendingStores.slice(0, 3).map((s) => s.name).join(" · ")}
              {pendingStores.length > 3 && ` +${pendingStores.length - 3}`}
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-warm-foreground shrink-0" />
        </Link>
      )}


      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        <Kpi icon={ShoppingBag} label={t("admin.dashboard.todayOrders")} value={today.length.toString()} tint="primary" />
        <Kpi icon={TrendingUp} label={t("admin.dashboard.todayRevenue")} value={formatGel(todayRevenue)} tint="success" />
        <Kpi icon={Percent} label={t("admin.dashboard.commission", { pct: settings.commissionPct })} value={formatGel(commission)} tint="warm" />
        <Kpi icon={Leaf} label={t("admin.dashboard.savedKg")} value={formatGel(customerSavings)} tint="success" />
        <Kpi icon={Store} label={t("admin.dashboard.activePartners")} value={activeStores.toString()} tint="primary" />
        <Kpi icon={Radio} label={t("admin.dashboard.usersOnline")} value={online.toString()} tint="warm" />
        <Kpi icon={Users} label={t("admin.dashboard.totalOrders")} value={totalOrders.toString()} tint="muted" />
        <Kpi icon={Activity} label={t("admin.dashboard.activeOffers")} value={offers.filter((o) => o.is_active).length.toString()} tint="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">{t("admin.dashboard.latestOrders")}</h3>
            <span className="text-xs text-muted-foreground">{orders.length} {t("admin.dashboard.total")}</span>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 grid place-items-center text-xs font-mono font-bold text-primary shrink-0">#{o.code}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{o.offer?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{o.store?.name ?? "—"} · {new Date(o.created_at).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">{formatGel(Number(o.amount))}</div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">{o.status}</div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t("admin.dashboard.noOrdersYet")}</p>}
          </div>
        </div>

        {/* {t("admin.dashboard.realtime")} feed */}
        <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">{t("admin.dashboard.activityFeed")}</h3>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {feed.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.kind === "order" ? "bg-primary" : a.kind === "offer" ? "bg-warm-foreground" : "bg-success"}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{a.text}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(a.time).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
                </div>
              </div>
            ))}
            {feed.length === 0 && <p className="text-sm text-muted-foreground">{t("admin.dashboard.empty")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: string; tint: "primary" | "success" | "warm" | "muted" }) {
  const tints = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warm: "bg-warm text-warm-foreground",
    muted: "bg-muted text-foreground",
  };
  return (
    <div className="bg-card rounded-3xl border border-border p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-2xl grid place-items-center mb-3 ${tints[tint]}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="font-display text-2xl lg:text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
