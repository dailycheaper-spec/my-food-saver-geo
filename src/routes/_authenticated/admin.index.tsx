import { createFileRoute } from "@tanstack/react-router";
import { useAllStores, useAllOrders, formatGel } from "@/lib/db";
import { Store, ShoppingBag, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "მიმოხილვა — ადმინი" }] }),
  component: AdminOverview,
});

function AdminOverview() {
  const { stores } = useAllStores();
  const { orders } = useAllOrders();

  const activeStores = stores.filter((s) => s.status === "active").length;
  const pendingStores = stores.filter((s) => s.status === "pending").length;
  const collectedOrders = orders.filter((o) => o.status === "collected");
  const revenue = collectedOrders.reduce((s, o) => s + Number(o.amount), 0);
  const giftedCount = orders.filter((o) => o.status === "gifted").length;

  // Top stores by revenue
  const byStore = new Map<string, { name: string; revenue: number; count: number }>();
  collectedOrders.forEach((o) => {
    const key = o.store_id;
    const name = o.store?.name ?? "—";
    const prev = byStore.get(key) ?? { name, revenue: 0, count: 0 };
    byStore.set(key, { name, revenue: prev.revenue + Number(o.amount), count: prev.count + 1 });
  });
  const topStores = Array.from(byStore.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">პლატფორმის მიმოხილვა</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={Store} label="აქტიური მაღაზიები" value={activeStores.toString()} sub={pendingStores ? `${pendingStores} მოლოდინშია` : ""} />
        <Stat icon={ShoppingBag} label="ჯამური შეკვეთა" value={orders.length.toString()} />
        <Stat icon={TrendingUp} label="შემოსავალი" value={formatGel(revenue)} />
        <Stat icon={Users} label="გაჩუქებული" value={giftedCount.toString()} />
      </div>

      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-semibold mb-3">ტოპ მაღაზიები</h3>
        {topStores.length === 0 ? (
          <p className="text-sm text-muted-foreground">ჯერ არაფერია გაცემული.</p>
        ) : (
          <div className="space-y-2">
            {topStores.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">{i + 1}</span>
                  <span className="font-medium">{s.name}</span>
                </div>
                <div className="text-right text-sm">
                  <div className="font-bold text-primary">{formatGel(s.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{s.count} შეკვეთა</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-warm-foreground mt-1">{sub}</div>}
    </div>
  );
}
