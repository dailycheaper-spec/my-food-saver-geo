import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, TrendingUp, ShoppingBag, Leaf, Trophy } from "lucide-react";
import { useMyStores, useStoreOffers, useStoreOrders, formatGel } from "@/lib/db";
import { KG_PER_OFFER } from "@/lib/partner-db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/partner/stats")({
  head: () => ({ meta: [{ title: "სტატისტიკა — Cheaper" }] }),
  component: StatsPage,
});

function StatsPage() {
  const { t, language } = useI18n();
  const kg = language === "en" ? "kg" : language === "ru" ? "кг" : "კგ";

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
    const saved = paid.reduce((a) => a + KG_PER_OFFER, 0);
    return { todayCount: todayPaid.length, revenue, top, saved, totalSold: paid.length, activeOffers: offers.filter((x) => x.is_active).length };
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
        <Kpi color="from-emerald-500 to-teal-400" icon={<Leaf className="w-5 h-5" />} label={t("foodSaved")} value={`${s.saved.toFixed(1)} ${kg}`} />
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
    </div>
  );
}

function Kpi({ color, icon, label, value }: { color: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`rounded-3xl p-4 bg-gradient-to-br ${color} text-white shadow-lg`}>
      <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center">{icon}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-xs opacity-90">{label}</div>
    </div>
  );
}
