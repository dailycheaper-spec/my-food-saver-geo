import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Users, ShoppingCart, TrendingUp, Trophy, Eye, ArrowLeft } from "lucide-react";
import { useAnalytics } from "@/lib/storage";
import { OFFERS, formatPrice } from "@/lib/mock-data";
import { StoreLogo } from "@/components/StoreLogo";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "ანალიტიკა — Cheaper" },
      { name: "description", content: "პლატფორმის სტატისტიკა: ვიზიტები, შეკვეთები და ტოპ მაღაზიები." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const { t } = useI18n();
  const a = useAnalytics();

  const topStores = Object.entries(a.storeSales)
    .map(([id, s]) => ({ id, ...s }))
    .sort((x, y) => y.count - x.count)
    .slice(0, 5);

  const topOffers = Object.entries(a.offerViews)
    .map(([id, views]) => ({ offer: OFFERS.find((o) => o.id === id), views }))
    .filter((x) => x.offer)
    .sort((x, y) => y.views - x.views)
    .slice(0, 5);

  const conversionRate = a.visits > 0 ? ((a.purchases / a.visits) * 100).toFixed(1) : "0.0";
  const totalRevenue = Object.values(a.storeSales).reduce((s, x) => s + x.revenue, 0);

  const daily = Object.entries(a.dailyVisits).sort(([x], [y]) => x.localeCompare(y)).slice(-7);
  const maxDaily = Math.max(1, ...daily.map(([, v]) => v));

  return (
    <div className="page-shell">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/profile" className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold">{t("analytics.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("analytics.subtitle")}</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <Kpi icon={<Users className="w-4 h-4" />} label={t("analytics.visitors")} value={a.visits.toLocaleString("ka-GE")} tint="bg-primary/10 text-primary" />
        <Kpi icon={<ShoppingCart className="w-4 h-4" />} label={t("analytics.orders")} value={a.purchases.toLocaleString("ka-GE")} tint="bg-accent/20 text-accent-foreground" />
        <Kpi icon={<TrendingUp className="w-4 h-4" />} label={t("analytics.conversion")} value={`${conversionRate}%`} tint="bg-success/10 text-success" />
        <Kpi icon={<BarChart3 className="w-4 h-4" />} label={t("analytics.revenue")} value={formatPrice(totalRevenue)} tint="bg-warm text-warm-foreground" />
      </div>

      {/* Daily visits chart */}
      <div className="mt-4 bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{t("analytics.visitsChart")}</div>
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
        </div>
        {daily.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("analytics.noDataYet")}</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {daily.map(([date, count]) => {
              const d = new Date(date);
              const day = d.toLocaleDateString("ka-GE", { weekday: "short" });
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] font-semibold text-foreground">{count}</div>
                  <div
                    className="w-full rounded-t-md gradient-hero"
                    style={{ height: `${(count / maxDaily) * 100}%`, minHeight: "4px" }}
                  />
                  <div className="text-[10px] text-muted-foreground">{day}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top stores */}
      <div className="mt-4 bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-accent" />
          <div className="font-semibold">{t("analytics.topStores")}</div>
        </div>
        {topStores.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("analytics.nothingSoldYet")}</p>
        ) : (
          <div className="space-y-2">
            {topStores.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
                <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${i === 0 ? "bg-accent text-accent-foreground" : "bg-card border border-border"}`}>
                  {i + 1}
                </div>
                <div className="w-9 h-9 rounded-lg gradient-warm grid place-items-center overflow-hidden text-lg"><StoreLogo value={s.logo} emojiClassName="text-lg" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.count} {t("analytics.orderCount")} • {formatPrice(s.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top viewed offers */}
      <div className="mt-4 bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-primary" />
          <div className="font-semibold">{t("analytics.topViewedOffers")}</div>
        </div>
        {topOffers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("analytics.noViewsYet")}</p>
        ) : (
          <div className="space-y-2">
            {topOffers.map(({ offer, views }) => (
              <Link
                key={offer!.id}
                to="/offer/$id"
                params={{ id: offer!.id }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <img src={offer!.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{offer!.title}</div>
                  <div className="text-[11px] text-muted-foreground">{offer!.storeName}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary text-sm">{views}</div>
                  <div className="text-[10px] text-muted-foreground">{t("analytics.views")}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-4">
      <div className={`w-8 h-8 rounded-full grid place-items-center ${tint}`}>{icon}</div>
      <div className="mt-2 text-2xl font-bold font-display">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
