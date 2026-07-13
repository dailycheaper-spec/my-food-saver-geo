import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PackageOpen, ShoppingBag, TrendingUp, Coins } from "lucide-react";
import { useMyStores, useStoreOffers, useStoreOrders, formatGel } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/partner/")({
  head: () => ({ meta: [{ title: "პარტნიორის დაფა — გემო" }] }),
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const { stores, loading } = useMyStores();
  const store = stores[0] ?? null;
  const { offers } = useStoreOffers(store?.id ?? null);
  const { orders } = useStoreOrders(store?.id ?? null);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todaysOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
    const revenue = todaysOrders.reduce((s, o) => s + Number(o.amount), 0);
    const active = offers.filter((o) => o.is_active && o.quantity_sold < o.quantity_available).length;
    const pending = orders.filter((o) => o.status === "paid" || o.status === "ready").length;
    return { revenue, active, pending, todayCount: todaysOrders.length };
  }, [orders, offers]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">იტვირთება…</div>;

  if (!store) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="text-4xl mb-3">🏪</div>
        <h2 className="font-display text-xl font-bold">მაღაზია ჯერ არ გაქვს დამატებული</h2>
        <p className="text-sm text-muted-foreground mt-2">ჯერ შეავსე პარტნიორის განაცხადი, დაელოდე დამტკიცებას.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">მაღაზია</div>
        <h1 className="font-display text-2xl font-bold mt-1">{store.logo} {store.name}</h1>
        <div className="text-sm text-muted-foreground">{store.district} • {store.address}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi icon={<Coins className="w-4 h-4" />} label="დღეს გამომუშავებული" value={formatGel(stats.revenue)} accent="primary" />
        <Kpi icon={<ShoppingBag className="w-4 h-4" />} label="დღეს შეკვეთა" value={String(stats.todayCount)} />
        <Kpi icon={<PackageOpen className="w-4 h-4" />} label="აქტიური შეთავაზება" value={String(stats.active)} />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label="დასამუშავებელი" value={String(stats.pending)} accent="warning" />
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">ბოლო შეკვეთები</h3>
          <span className="text-xs text-muted-foreground">{orders.length} სულ</span>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ჯერ არ გაქვს შეკვეთა.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div>
                  <div className="font-mono font-semibold">#{o.code}</div>
                  <div className="text-xs text-muted-foreground">{o.offer?.title}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatGel(Number(o.amount))}</div>
                  <div className="text-xs text-muted-foreground">{o.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "primary" | "warning" }) {
  const cls = accent === "primary" ? "bg-primary/10 text-primary" : accent === "warning" ? "bg-warm text-warm-foreground" : "bg-muted/50 text-foreground";
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className={`w-8 h-8 rounded-full grid place-items-center ${cls}`}>{icon}</div>
      <div className="text-xl font-bold mt-2">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
