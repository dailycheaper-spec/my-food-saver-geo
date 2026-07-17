import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShoppingBag, Clock, Gift, Truck, QrCode } from "lucide-react";
import { useOrders, useHydrated, type Order } from "@/lib/storage";
import { formatPrice } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { stageOfOrder, useStageLabel, type OrderStage } from "@/components/OrderProgress";
import { OrderCardSkeleton } from "@/components/Skeleton";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "ჩემი შეკვეთები — Cheaper" },
      { name: "description", content: "შენი დაჯავშნილი და მიღებული პაკეტები." },
    ],
  }),
  component: Orders,
});

const TABS: (OrderStage | "all")[] = [
  "all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled",
];

function Orders() {
  const { t, language } = useI18n();
  const hydrated = useHydrated();
  const orders = useOrders();
  const [tab, setTab] = useState<OrderStage | "all">("all");
  const stageLabel = useStageLabel();

  const allLabel = language === "en" ? "All" : language === "ru" ? "Все" : "ყველა";

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of TABS) if (s !== "all") c[s] = 0;
    for (const o of orders) {
      const s = stageOfOrder(o);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => stageOfOrder(o) === tab);
  }, [orders, tab]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-6">
      <h1 className="font-display text-2xl font-bold">{t("myOrders")}</h1>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
        {TABS.map((s) => {
          const active = tab === s;
          const label = s === "all" ? allLabel : stageLabel(s);
          const count = counts[s] || 0;
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                active ? "bg-foreground text-background" : "bg-secondary text-foreground"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`px-1.5 min-w-[18px] h-[18px] grid place-items-center rounded-full text-[10px] ${
                    active ? "bg-background/20" : "bg-primary/15 text-primary"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {!hydrated ? (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          filtered.map((o) => <OrderRow key={o.id} order={o} />)
        )}
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const stage = stageOfOrder(order);
  const label = useStageLabel();
  const chipCls =
    stage === "cancelled"
      ? "bg-destructive/10 text-destructive"
      : stage === "completed"
      ? "bg-success/10 text-success"
      : stage === "ready"
      ? "bg-accent/20 text-accent-foreground"
      : "bg-primary/10 text-primary";

  return (
    <Link
      to="/orders/$id"
      params={{ id: order.id }}
      className="block bg-card rounded-2xl p-4 border border-border shadow-soft hover:shadow-card transition"
    >
      <div className="flex gap-3">
        <img
          src={order.image}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="w-20 h-20 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{order.storeLogo}</span>
            <span className="text-xs text-muted-foreground truncate">{order.storeName}</span>
            <span className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${chipCls}`}>
              {label(stage)}
            </span>
          </div>
          <div className="font-semibold text-sm mt-1 line-clamp-1">{order.title}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {order.method === "მიტანა" ? <Truck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {order.method} • {order.pickupFrom}–{order.pickupTo}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="text-sm font-bold text-primary">{formatPrice(order.price)}</div>
            <div className="flex items-center gap-2">
              {order.giftedTo && (
                <span className="text-[10px] text-accent-foreground flex items-center gap-1">
                  <Gift className="w-3 h-3" /> {order.giftedTo}
                </span>
              )}
              {(stage === "ready" || stage === "preparing" || stage === "confirmed" || stage === "pending") && (
                <span className="text-[10px] text-primary flex items-center gap-1 font-semibold">
                  <QrCode className="w-3 h-3" /> #{order.code}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ tab }: { tab: OrderStage | "all" }) {
  const { t, language } = useI18n();
  const stageLabel = useStageLabel();
  const L = (ka: string, en: string, ru: string) =>
    language === "en" ? en : language === "ru" ? ru : ka;

  if (tab === "all") {
    return (
      <div className="text-center py-14 bg-card rounded-2xl border border-border">
        <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-3">{t("noOrders")}</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary font-medium">
          {t("firstPack")}
        </Link>
      </div>
    );
  }
  return (
    <div className="text-center py-14 bg-card rounded-2xl border border-border">
      <div className="text-4xl mb-2">📭</div>
      <p className="text-sm font-semibold">
        {L("ცარიელია", "Nothing here", "Пусто")}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {L(
          `არ არის შეკვეთა სტატუსით „${stageLabel(tab)}“.`,
          `No orders with status “${stageLabel(tab)}”.`,
          `Нет заказов со статусом «${stageLabel(tab)}».`,
        )}
      </p>
    </div>
  );
}
