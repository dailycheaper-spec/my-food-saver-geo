import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Clock, MapPin, Gift, CheckCircle2, X, Truck, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrder, updateOrderStatus, formatGel, type OrderWithRelations } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { DeliveryTracker } from "@/components/DeliveryTracker";
import { stageOfDbOrder, useStageLabel } from "./orders.index";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "შეკვეთა — Cheaper" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
});

function orderQrPayload(o: OrderWithRelations) {
  return JSON.stringify({ app: "cheaper", orderId: o.id, code: o.code, store: o.store?.name ?? "" });
}

function OrderDetail() {
  const { t, language } = useI18n();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGift, setShowGift] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [giftMode, setGiftMode] = useState<"friend" | "charity">("friend");
  const stageLabel = useStageLabel();

  useEffect(() => {
    let alive = true;
    async function load() {
      const row = await fetchOrder(id);
      if (alive) { setOrder(row); setLoading(false); }
    }
    load();
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">…</div>;
  }
  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("orderNotFound")}</p>
        <Link to="/orders" className="text-primary underline text-sm mt-2 inline-block">{t("myOrders")}</Link>
      </div>
    );
  }

  const isDelivery = order.method === "delivery";
  const stage = stageOfDbOrder(order);
  const image = order.offer?.image_url ?? "";
  const title = order.offer?.title ?? "—";
  const storeName = order.store?.name ?? "—";
  const storeLogo = order.store?.logo ?? "🏪";
  const from = String(order.offer?.pickup_from ?? "").slice(0, 5);
  const to = String(order.offer?.pickup_to ?? "").slice(0, 5);
  const address = order.delivery_address ?? order.store?.address ?? "";
  const isCancelled = order.status === "cancelled";
  const isGifted = order.status === "gifted";
  const isCollected = order.status === "collected";

  async function handleGift() {
    if (!order) return;
    const recipient = giftMode === "charity"
      ? (language === "en" ? "Charity 'Mowyale'" : language === "ru" ? "Благотворительность «Моцкале»" : "ქველმოქმედება „მოწყალე“")
      : (giftName || (language === "en" ? "Friend" : language === "ru" ? "Друг" : "მეგობარი"));
    await updateOrderStatus(order.id, "gifted", recipient);
    setShowGift(false);
  }

  async function handleCancel() {
    if (!order) return;
    await updateOrderStatus(order.id, "cancelled");
    navigate({ to: "/orders" });
  }

  async function handleMarkCollected() {
    if (!order) return;
    await updateOrderStatus(order.id, "collected");
  }

  const statusText = isCancelled ? stageLabel("cancelled")
    : isGifted ? (language === "en" ? "Gifted" : language === "ru" ? "Подарено" : "გაჩუქებული")
    : isCollected ? (language === "en" ? "Received" : language === "ru" ? "Получено" : "მიღებული")
    : stageLabel(stage);

  const bannerCls = isCancelled ? "bg-muted text-muted-foreground"
    : isGifted ? "bg-accent/20 text-accent-foreground"
    : isCollected ? "bg-success/10 text-success"
    : "bg-primary/10 text-primary";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => history.back()} className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold">{t("order")} #{order.code}</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex gap-3">
          {image ? (
            <img src={image} alt="" width={100} height={100} className="w-24 h-24 rounded-xl object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-muted grid place-items-center text-4xl">{storeLogo}</div>
          )}
          <div className="flex-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-base">{storeLogo}</span> {storeName}
            </div>
            <div className="font-semibold mt-1">{title}</div>
            <div className="text-lg font-bold text-primary mt-1">{formatGel(Number(order.amount))}</div>
          </div>
        </div>

        <div className="mt-4 text-sm space-y-2">
          <div className="flex items-center gap-2">
            {isDelivery ? <Truck className="w-4 h-4 text-primary" /> : <ShoppingBag className="w-4 h-4 text-primary" />}
            <span className="font-medium">{isDelivery ? t("delivery") : t("pickupInStore")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" /> {from}–{to}
          </div>
          {address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> {address}
            </div>
          )}
        </div>

        <div className={`mt-4 rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${bannerCls}`}>
          {!isCancelled && !isGifted && <CheckCircle2 className="w-4 h-4" />}
          {isGifted && <Gift className="w-4 h-4" />}
          <span>
            {t("status")}: {statusText}
            {order.gifted_to && ` — ${order.gifted_to}`}
          </span>
        </div>
      </div>

      {isDelivery && (
        <div className="mt-4">
          <DeliveryTracker orderId={order.id} />
        </div>
      )}

      {order.code && !isCancelled && (
        <div className="mt-4 bg-card rounded-2xl border border-border shadow-card p-5 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {isDelivery ? t("confirmationCode") : t("pickupCode")}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-[0.3em] font-mono">{order.code}</div>
          <div className="mt-3 inline-block p-4 bg-white rounded-2xl">
            <QRCodeSVG value={orderQrPayload(order)} size={192} level="M" marginSize={0} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {isDelivery ? t("courierCodeText") : t("storeCodeText")}
          </p>
        </div>
      )}

      {!isCancelled && !isGifted && !isCollected && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowGift(true)}
            className="p-4 rounded-2xl bg-accent text-accent-foreground font-semibold shadow-soft flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" /> {t("gift")}
          </button>
          <button
            onClick={handleCancel}
            className="p-4 rounded-2xl bg-card border border-border text-destructive font-semibold flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> {t("cancel")}
          </button>
        </div>
      )}

      {order.status === "ready" && (
        <button
          onClick={handleMarkCollected}
          className="mt-3 w-full p-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          {t("markReceived")}
        </button>
      )}

      {showGift && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={() => setShowGift(false)}>
          <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">{t("giftOrder")}</h3>
              <button onClick={() => setShowGift(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t("giftOrderHelp")}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setGiftMode("friend")}
                className={`p-3 rounded-xl border-2 text-left ${giftMode === "friend" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="text-lg">👤</div>
                <div className="text-sm font-semibold mt-1">{t("friend")}</div>
                <div className="text-xs text-muted-foreground">{t("shareCode")}</div>
              </button>
              <button
                onClick={() => setGiftMode("charity")}
                className={`p-3 rounded-xl border-2 text-left ${giftMode === "charity" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="text-lg">❤️</div>
                <div className="text-sm font-semibold mt-1">{t("charity")}</div>
                <div className="text-xs text-muted-foreground">„მოწყალე“</div>
              </button>
            </div>

            {giftMode === "friend" && (
              <input
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                placeholder={t("friendPlaceholder")}
                className="mt-3 w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
            )}

            <button
              onClick={handleGift}
              className="mt-4 w-full p-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold"
            >
              {t("confirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
