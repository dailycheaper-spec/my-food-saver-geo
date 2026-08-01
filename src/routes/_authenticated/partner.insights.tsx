import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, ShoppingBag, TrendingUp, CalendarDays, Percent, Repeat, Lightbulb, Trophy, AlertTriangle } from "lucide-react";
import { useMyStores, useStoreOffers, useStoreOrders, formatGel } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  ordersToday,
  ordersInLastDays,
  sumAmount,
  averageDiscountPct,
  returningCustomerPct,
  buildInsights,
  topOffersByOrders,
  lowestPerformingActiveOffers,
} from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/partner/insights")({
  head: () => ({ meta: [{ title: "Insights — Cheaper" }] }),
  component: PartnerInsights,
});

function PartnerInsights() {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const { offers } = useStoreOffers(store?.id ?? null);
  const { orders } = useStoreOrders(store?.id ?? null);
  const navigate = useNavigate();

  const data = useMemo(() => {
    const today = ordersToday(orders);
    const week = ordersInLastDays(orders, 7);
    return {
      todayCount: today.length,
      todayRevenue: sumAmount(today),
      weekCount: week.length,
      avgDiscount: averageDiscountPct(orders, 30),
      returning: returningCustomerPct(orders, 30),
      insights: buildInsights(orders),
      top: topOffersByOrders(orders, 5),
      lowest: lowestPerformingActiveOffers(orders, offers, 5),
      totalRevenueEligible: orders.filter((o) => o.status !== "cancelled").length,
    };
  }, [orders, offers]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">{L("იტვირთება…", "Loading…", "Загрузка…")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{L("არ არის დამტკიცებული ობიექტი.", "No approved store.", "Нет одобренного магазина.")}</div>;

  const scarce = data.totalRevenueEligible < 3;
  const clientWord = L("კლიენტი", "customers", "клиентов");
  const insufficient = L("მონაცემი არასაკმარისია", "Not enough data", "Недостаточно данных");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> {L("უკან", "Back", "Назад")}
      </button>
      <div>
        <h1 className="font-display text-2xl font-bold">{L("ბიზნეს ანალიტიკა", "Business Insights", "Бизнес-инсайты")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{store.name} — {L("რეალურ მონაცემებზე დაფუძნებული ჭრილი", "based on real data", "на основе реальных данных")}</p>
      </div>

      {scarce && (
        <div className="rounded-3xl border border-border bg-warm/40 p-4 text-sm">
          {L(
            "ჯერჯერობით ცოტა შეკვეთაა. მეტი მონაცემი დაგროვდება — insights უფრო ზუსტი გახდება.",
            "Not many orders yet. As data grows, insights get more accurate.",
            "Пока мало заказов. С ростом данных инсайты станут точнее."
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi icon={<ShoppingBag className="w-5 h-5" />} label={L("დღეს — შეკვეთა", "Today — orders", "Сегодня — заказов")} value={String(data.todayCount)} />
        <Kpi icon={<TrendingUp className="w-5 h-5" />} label={L("დღეს — შემოსავალი", "Today — revenue", "Сегодня — выручка")} value={formatGel(data.todayRevenue)} />
        <Kpi icon={<CalendarDays className="w-5 h-5" />} label={L("ბოლო 7 დღე — შეკვეთა", "Last 7 days — orders", "Последние 7 дней — заказов")} value={String(data.weekCount)} />
        <Kpi
          icon={<Percent className="w-5 h-5" />}
          label={L("საშ. ფასდაკლება (30 დღე)", "Avg. discount (30d)", "Ср. скидка (30 дн.)")}
          value={data.avgDiscount === null ? "—" : `${data.avgDiscount.toFixed(0)}%`}
          note={data.avgDiscount === null ? insufficient : undefined}
        />
        <Kpi
          icon={<Repeat className="w-5 h-5" />}
          label={L("დაბრუნებადი კლიენტი (30 დღე)", "Returning customers (30d)", "Возвращающиеся клиенты (30 дн.)")}
          value={data.returning ? `${data.returning.pct.toFixed(0)}%` : "—"}
          note={
            data.returning
              ? `${data.returning.returning}/${data.returning.total} ${clientWord}`
              : insufficient
          }
        />
      </div>

      <div className="bg-card rounded-3xl border border-border p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" /> {L("ჭკვიანი შემოთავაზებები", "Smart suggestions", "Умные подсказки")}
        </h3>
        {data.insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {L(
              "ჯერ არ არის საკმარისი მონაცემი დარწმუნებული დასკვნისთვის.",
              "Not enough data yet for confident conclusions.",
              "Пока недостаточно данных для уверенных выводов."
            )}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.insights.map((i) => (
              <li key={i.id} className="flex gap-2 text-sm">
                <span className="text-primary">•</span>
                <span>{i.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-card rounded-3xl border border-border p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> {L("ტოპ გამყიდველი", "Top sellers", "Топ продаж")}
          </h3>
          {data.top.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">{L("ჯერ არ არის მონაცემი.", "No data yet.", "Пока нет данных.")}</p>
          ) : (
            <div className="space-y-2">
              {data.top.map((o, i) => (
                <div key={o.offerId} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-slate-100 text-slate-700" : "bg-orange-100 text-orange-700"}`}>{i + 1}</div>
                  <div className="flex-1 truncate">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{formatGel(o.revenue)}</div>
                  <div className="font-bold text-primary">{o.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-3xl border border-border p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warm-foreground" /> {L("ყველაზე ნაკლებად გაყიდვადი (აქტიური)", "Lowest-performing (active)", "Хуже всего продаются (активные)")}
          </h3>
          {data.lowest.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">{L("აქტიური შემოთავაზება არ არის.", "No active offers.", "Нет активных предложений.")}</p>
          ) : (
            <div className="space-y-2">
              {data.lowest.map((o) => (
                <div key={o.offerId} className="flex items-center gap-3">
                  <div className="flex-1 truncate">{o.title}</div>
                  <div className="font-bold text-muted-foreground">{o.count}</div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground pt-2">
                {L("სცადეთ ფასის ან დროის კორექტირება.", "Try adjusting price or pickup time.", "Попробуйте изменить цену или время выдачи.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note?: string }) {
  return (
    <div className="bg-card rounded-3xl border border-border p-4">
      <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      {note && <div className="text-[11px] text-muted-foreground mt-1">{note}</div>}
    </div>
  );
}
