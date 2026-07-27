import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShoppingBag, Clock, Gift, Truck, QrCode } from "lucide-react";
import { useMyOrders, formatGel, type OrderWithRelations } from "@/lib/db";
import { useI18n, type Language } from "@/lib/i18n";
import { localizedField } from "@/lib/localized";
import { OrderCardSkeleton } from "@/components/Skeleton";
import { StoreLogo } from "@/components/StoreLogo";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "ჩემი შეკვეთები — Cheaper" },
      { name: "description", content: "შენი დაჯავშნილი და მიღებული პაკეტები." },
    ],
  }),
  component: Orders,
});

type Stage = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
const TABS: (Stage | "all")[] = ["all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

export function stageOfDbOrder(o: OrderWithRelations): Stage {
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "collected" || o.status === "gifted") return "completed";
  if (o.status === "ready") return "ready";
  // status === "paid" or "pending": derive from pickup time
  const from = (o.offer?.pickup_from as unknown as string) ?? "18:00";
  const [ph, pm] = String(from).slice(0, 5).split(":").map(Number);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const pickupMin = (ph || 0) * 60 + (pm || 0);
  const elapsedMin = (Date.now() - new Date(o.created_at).getTime()) / 60000;
  if (nowMin >= pickupMin) return "ready";
  if (elapsedMin < 3) return "pending";
  if (elapsedMin < 8) return "confirmed";
  return "preparing";
}

export function useStageLabel(): (s: Stage) => string {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
  return (s) => {
    switch (s) {
      case "pending": return L("მოლოდინში", "Pending", "В ожидании");
      case "confirmed": return L("დადასტურდა", "Confirmed", "Подтверждено");
      case "preparing": return L("მზადდება", "Preparing", "Готовится");
      case "ready": return L("მზადაა აღებისთვის", "Ready for pickup", "Готово к выдаче");
      case "completed": return L("დასრულებული", "Completed", "Завершено");
      case "cancelled": return L("გაუქმებული", "Cancelled", "Отменено");
    }
  };
}

function Orders() {
  const { t, language } = useI18n();
  const { orders, loading, error } = useMyOrders();
  const [tab, setTab] = useState<Stage | "all">("all");
  const stageLabel = useStageLabel();

  const allLabel = language === "en" ? "All" : language === "ru" ? "Все" : "ყველა";

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of TABS) if (s !== "all") c[s] = 0;
    for (const o of orders) {
      const s = stageOfDbOrder(o);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    if (tab === "all") return orders;
    return orders.filter((o) => stageOfDbOrder(o) === tab);
  }, [orders, tab]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-4 sm:pt-6 sm:pb-6">
      <h1 className="font-display text-2xl font-bold">{t("myOrders")}</h1>

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
                <span className={`px-1.5 min-w-[18px] h-[18px] grid place-items-center rounded-full text-[10px] ${active ? "bg-background/20" : "bg-primary/15 text-primary"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 bg-destructive/10 text-destructive text-sm rounded-2xl border border-destructive/30 p-4">
          {t("loadErrorGeneric")}
        </div>
      )}

      <div className="mt-4 space-y-2 sm:mt-5 sm:space-y-3">
        {loading ? (
          <>
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 sm:py-14 bg-card rounded-2xl border border-border">
            <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">{t("noOrders")}</p>
            <Link to="/" className="mt-4 inline-block text-sm text-primary font-medium">{t("firstPack")}</Link>
          </div>
        ) : (
          filtered.map((o) => <OrderRow key={o.id} order={o} language={language} />)
        )}
      </div>
    </div>
  );
}

function OrderRow({ order, language }: { order: OrderWithRelations; language: Language }) {
  const stage = stageOfDbOrder(order);
  const label = useStageLabel();
  const chipCls =
    stage === "cancelled" ? "bg-destructive/10 text-destructive"
    : stage === "completed" ? "bg-success/10 text-success"
    : stage === "ready" ? "bg-accent/20 text-accent-foreground"
    : "bg-primary/10 text-primary";
  const isDelivery = order.method === "delivery";
  const image = order.offer?.image_url ?? "";
  const title = localizedField(order.offer, "title", language) || "—";
  const storeName = localizedField(order.store, "name", language) || "—";
  const from = String(order.offer?.pickup_from ?? "").slice(0, 5);
  const to = String(order.offer?.pickup_to ?? "").slice(0, 5);

  return (
    <Link
      to="/orders/$id"
      params={{ id: order.id }}
      className="block bg-card rounded-2xl p-3 sm:p-4 border border-border shadow-soft hover:shadow-card transition"
    >
      <div className="flex gap-3">
        {image ? (
          <img src={image} alt="" width={80} height={80} loading="lazy" className="w-20 h-20 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-muted grid place-items-center overflow-hidden text-3xl shrink-0"><StoreLogo value={order.store?.logo_url || order.store?.logo} emojiClassName="text-3xl" /></div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 grid place-items-center overflow-hidden text-lg shrink-0"><StoreLogo value={order.store?.logo_url || order.store?.logo} emojiClassName="text-lg" /></span>
            <span className="text-xs text-muted-foreground truncate">{storeName}</span>
            <span className={`ml-auto shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${chipCls}`}>
              {label(stage)}
            </span>
          </div>
          <div className="font-semibold text-sm mt-1 line-clamp-1">{title}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            {isDelivery ? <Truck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {from}–{to}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <div className="text-sm font-bold text-primary">{formatGel(Number(order.amount))}</div>
            <div className="flex items-center gap-2">
              {order.gifted_to && (
                <span className="text-[10px] text-accent-foreground flex items-center gap-1">
                  <Gift className="w-3 h-3" /> {order.gifted_to}
                </span>
              )}
              {stage !== "cancelled" && stage !== "completed" && (
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
