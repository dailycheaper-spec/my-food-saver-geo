import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Clock, MapPin, Gift, CheckCircle2, X, Truck, ShoppingBag } from "lucide-react";
import { useOrders, updateOrder } from "@/lib/storage";
import { formatPrice } from "@/lib/mock-data";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "შეკვეთა — გემო" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const orders = useOrders();
  const order = orders.find((o) => o.id === id);
  const navigate = useNavigate();
  const [showGift, setShowGift] = useState(false);
  const [giftName, setGiftName] = useState("");
  const [giftMode, setGiftMode] = useState<"friend" | "charity">("friend");

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">შეკვეთა ვერ მოიძებნა.</p>
        <Link to="/orders" className="text-primary underline text-sm mt-2 inline-block">ჩემი შეკვეთები</Link>
      </div>
    );
  }

  function handleGift() {
    if (!order) return;
    const recipient = giftMode === "charity" ? "ქველმოქმედება „მოწყალე“" : (giftName || "მეგობარი");
    updateOrder(order.id, { status: "გაჩუქებული", giftedTo: recipient });
    setShowGift(false);
  }

  function handleCancel() {
    if (!order) return;
    updateOrder(order.id, { status: "გაუქმებული" });
    navigate({ to: "/orders" });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => history.back()} className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-xl font-bold">შეკვეთა #{order.code}</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex gap-3">
          <img src={order.image} alt="" width={100} height={100} className="w-24 h-24 rounded-xl object-cover" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-base">{order.storeLogo}</span> {order.storeName}
            </div>
            <div className="font-semibold mt-1">{order.title}</div>
            <div className="text-lg font-bold text-primary mt-1">{formatPrice(order.price)}</div>
          </div>
        </div>

        <div className="mt-4 text-sm space-y-2">
          <div className="flex items-center gap-2">
            {order.method === "მიტანა" ? <Truck className="w-4 h-4 text-primary" /> : <ShoppingBag className="w-4 h-4 text-primary" />}
            <span className="font-medium">{order.method}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" /> {order.pickupFrom}–{order.pickupTo}
          </div>
          {order.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" /> {order.address}
            </div>
          )}
        </div>

        {/* Status banner */}
        <div className={`mt-4 rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${
          order.status === "დაჯავშნილი" ? "bg-primary/10 text-primary" :
          order.status === "მიღებული" ? "bg-success/10 text-success" :
          order.status === "გაჩუქებული" ? "bg-accent/20 text-accent-foreground" :
          "bg-muted text-muted-foreground"
        }`}>
          {order.status === "დაჯავშნილი" && <CheckCircle2 className="w-4 h-4" />}
          {order.status === "გაჩუქებული" && <Gift className="w-4 h-4" />}
          <span>
            სტატუსი: {order.status}
            {order.giftedTo && ` — ${order.giftedTo}-ს`}
          </span>
        </div>
      </div>

      {/* QR pickup code */}
      {order.status === "დაჯავშნილი" && (
        <div className="mt-4 bg-card rounded-2xl border border-border shadow-card p-5 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {order.method === "მიტანა" ? "დადასტურების კოდი" : "აღების კოდი"}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-[0.3em] font-mono">{order.code}</div>
          <div className="mt-3 inline-block p-4 bg-white rounded-2xl">
            <QRCodeSVG
              value={JSON.stringify({ app: "gemo", orderId: order.id, code: order.code, store: order.storeName })}
              size={192}
              level="M"
              marginSize={0}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {order.method === "მიტანა"
              ? "აჩვენე ეს კოდი კურიერს მიღების დროს."
              : "აჩვენე ეს კოდი მაღაზიაში აღების დროს."}
          </p>
        </div>
      )}

      {/* Gift + Cancel actions */}
      {order.status === "დაჯავშნილი" && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowGift(true)}
            className="p-4 rounded-2xl bg-accent text-accent-foreground font-semibold shadow-soft flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" /> გააჩუქე
          </button>
          <button
            onClick={handleCancel}
            className="p-4 rounded-2xl bg-card border border-border text-destructive font-semibold flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> გაუქმება
          </button>
        </div>
      )}

      {order.status === "დაჯავშნილი" && (
        <button
          onClick={() => updateOrder(order.id, { status: "მიღებული" })}
          className="mt-3 w-full p-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          მიღებულად მონიშვნა
        </button>
      )}

      {/* Gift dialog */}
      {showGift && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={() => setShowGift(false)}>
          <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">გააჩუქე შეკვეთა</h3>
              <button onClick={() => setShowGift(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">ვერ მიხვალ აღებაზე? გადაეცი შენი პაკეტი მეგობარს ან ქველმოქმედებას.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setGiftMode("friend")}
                className={`p-3 rounded-xl border-2 text-left ${giftMode === "friend" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="text-lg">👤</div>
                <div className="text-sm font-semibold mt-1">მეგობარს</div>
                <div className="text-xs text-muted-foreground">გაუზიარე კოდი</div>
              </button>
              <button
                onClick={() => setGiftMode("charity")}
                className={`p-3 rounded-xl border-2 text-left ${giftMode === "charity" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="text-lg">❤️</div>
                <div className="text-sm font-semibold mt-1">ქველმოქმედებას</div>
                <div className="text-xs text-muted-foreground">„მოწყალე“</div>
              </button>
            </div>

            {giftMode === "friend" && (
              <input
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                placeholder="მეგობრის სახელი ან ტელეფონი"
                className="mt-3 w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
            )}

            <button
              onClick={handleGift}
              className="mt-4 w-full p-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold"
            >
              დადასტურება
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
