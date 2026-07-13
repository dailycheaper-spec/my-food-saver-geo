import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Clock, Gift, Truck } from "lucide-react";
import { useOrders } from "@/lib/storage";
import { formatPrice } from "@/lib/mock-data";

export const Route = createFileRoute("/orders/")({
  head: () => ({ meta: [{ title: "ჩემი შეკვეთები — გემო" }, { name: "description", content: "შენი დაჯავშნილი და მიღებული პაკეტები." }] }),
  component: Orders,
});

function Orders() {
  const orders = useOrders();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="font-display text-2xl font-bold">ჩემი შეკვეთები</h1>

      {orders.length === 0 ? (
        <div className="mt-8 text-center py-14 bg-card rounded-2xl border border-border">
          <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">შეკვეთები არ გაქვს.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary font-medium">იყიდე პირველი პაკეტი</Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {orders.map((o) => (
            <Link
              to="/orders/$id"
              params={{ id: o.id }}
              key={o.id}
              className="block bg-card rounded-2xl p-4 border border-border shadow-soft hover:shadow-card transition"
            >
              <div className="flex gap-3">
                <img src={o.image} alt="" width={80} height={80} loading="lazy" className="w-20 h-20 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{o.storeLogo}</span>
                    <span className="text-xs text-muted-foreground truncate">{o.storeName}</span>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                      o.status === "დაჯავშნილი" ? "bg-primary/10 text-primary" :
                      o.status === "მიღებული" ? "bg-success/10 text-success" :
                      o.status === "გაჩუქებული" ? "bg-accent/20 text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>{o.status}</span>
                  </div>
                  <div className="font-semibold text-sm mt-1 line-clamp-1">{o.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {o.method === "მიტანა" ? <Truck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {o.method} • {o.pickupFrom}–{o.pickupTo}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="text-sm font-bold text-primary">{formatPrice(o.price)}</div>
                    {o.giftedTo && <div className="text-[10px] text-accent-foreground flex items-center gap-1"><Gift className="w-3 h-3" /> {o.giftedTo}</div>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
