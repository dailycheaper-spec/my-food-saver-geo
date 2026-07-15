import { createFileRoute } from "@tanstack/react-router";
import { useAllStores, useAllOrders, formatGel } from "@/lib/db";
import { useAllOffers, useOnlinePresence, useRealtimeActivity } from "@/lib/admin-db";
import { loadAdminSettings } from "@/lib/admin-settings";
import {
  Store, ShoppingBag, TrendingUp, Users, Leaf, Percent, Radio, Activity,
} from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "მთავარი — ადმინი" }] }),
  component: AdminOverview,
});

const KG_PER_ORDER = 0.4;

function AdminOverview() {
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
  const kgSaved = orders.filter((o) => o.status !== "cancelled").length * KG_PER_ORDER;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">მთავარი</h1>
          <p className="text-sm text-muted-foreground mt-1">დღევანდელი მიმოხილვა და რეალურ დროში აქტივობა</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Realtime
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
        <Kpi icon={ShoppingBag} label="დღევანდელი შეკვეთა" value={today.length.toString()} tint="primary" />
        <Kpi icon={TrendingUp} label="დღევანდელი შემოსავალი" value={formatGel(todayRevenue)} tint="success" />
        <Kpi icon={Percent} label={`კომისია (${settings.commissionPct}%)`} value={formatGel(commission)} tint="warm" />
        <Kpi icon={Leaf} label="დაზოგილი (კგ)" value={kgSaved.toFixed(1)} tint="success" />
        <Kpi icon={Store} label="აქტიური პარტნიორები" value={activeStores.toString()} tint="primary" />
        <Kpi icon={Radio} label="ონლაინ მომხმარებელი" value={online.toString()} tint="warm" />
        <Kpi icon={Users} label="სულ შეკვეთა" value={totalOrders.toString()} tint="muted" />
        <Kpi icon={Activity} label="აქტიური შემოთავაზება" value={offers.filter((o) => o.is_active).length.toString()} tint="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">უახლესი შეკვეთები</h3>
            <span className="text-xs text-muted-foreground">{orders.length} სულ</span>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 grid place-items-center text-xs font-mono font-bold text-primary shrink-0">#{o.code}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{o.offer?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{o.store?.name ?? "—"} · {new Date(o.created_at).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">{formatGel(Number(o.amount))}</div>
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">{o.status}</div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">ჯერ არაა შეკვეთა.</p>}
          </div>
        </div>

        {/* Realtime feed */}
        <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">აქტივობის არხი</h3>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {feed.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.kind === "order" ? "bg-primary" : a.kind === "offer" ? "bg-warm-foreground" : "bg-success"}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{a.text}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(a.time).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
            {feed.length === 0 && <p className="text-sm text-muted-foreground">ცარიელია.</p>}
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
