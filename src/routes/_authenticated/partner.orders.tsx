import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Truck, ShoppingBag, Bell, QrCode, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useMyStores, useStoreOrders, updateOrderStatus, formatGel, type OrderWithRelations } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/partner/orders")({
  head: () => ({ meta: [{ title: "შეკვეთები — გემო" }] }),
  component: PartnerOrders,
});

function PartnerOrders() {
  const { stores } = useMyStores();
  const store = stores[0] ?? null;
  const { orders, newCount, resetNewCount } = useStoreOrders(store?.id ?? null);

  useEffect(() => {
    if (newCount > 0) {
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAA");
        audio.play().catch(() => {});
      } catch {}
    }
  }, [newCount]);

  if (!store) return <div className="text-center py-12 text-muted-foreground">ჯერ არ გაქვს დამტკიცებული მაღაზია.</div>;

  const groups = {
    active: orders.filter((o) => o.status === "paid" || o.status === "ready"),
    completed: orders.filter((o) => o.status === "collected"),
    cancelled: orders.filter((o) => o.status === "cancelled" || o.status === "gifted"),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">შეკვეთები</h1>
        {newCount > 0 && (
          <button onClick={resetNewCount} className="flex items-center gap-1.5 px-3 py-1.5 bg-success/15 text-success rounded-full text-xs font-semibold animate-pulse">
            <Bell className="w-3.5 h-3.5" /> {newCount} ახალი
          </button>
        )}
      </div>

      <Section title="აქტიური" count={groups.active.length}>
        {groups.active.map((o) => <OrderCard key={o.id} order={o} showActions />)}
      </Section>
      <Section title="დასრულებული" count={groups.completed.length}>
        {groups.completed.slice(0, 10).map((o) => <OrderCard key={o.id} order={o} />)}
      </Section>
      <Section title="გაუქმებული/გაჩუქებული" count={groups.cancelled.length}>
        {groups.cancelled.slice(0, 5).map((o) => <OrderCard key={o.id} order={o} />)}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title} ({count})</h3>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function OrderCard({ order, showActions }: { order: OrderWithRelations; showActions?: boolean }) {
  async function markReady() { await updateOrderStatus(order.id, "ready"); }
  async function markCollected() { await updateOrderStatus(order.id, "collected"); }

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg">#{order.code}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-sm mt-1">{order.offer?.title ?? "—"}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-primary">{formatGel(Number(order.amount))}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            {order.method === "delivery" ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
            {order.method === "delivery" ? "მიტანა" : "აღება"}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">
        {new Date(order.created_at).toLocaleString("ka-GE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
      </div>
      {showActions && (
        <>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowQr((v) => !v)}
              className="flex-1 py-2 rounded-xl bg-muted text-xs font-semibold flex items-center justify-center gap-1"
            ><QrCode className="w-3.5 h-3.5" /> {showQr ? "დამალვა" : "QR ჩვენება"}</button>
            {order.status === "paid" && (
              <button onClick={markReady} className="flex-1 py-2 rounded-xl bg-warm text-warm-foreground text-xs font-semibold">
                მზადაა
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={markCollected} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> გაცემულია
            </button>
            <button onClick={() => { if (confirm("ნამდვილად გავაუქმო?")) updateOrderStatus(order.id, "cancelled"); }} className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> გაუქმება
            </button>
          </div>
          {showQr && (
            <div className="mt-3 p-3 bg-white rounded-xl grid place-items-center">
              <QRCodeSVG value={order.code} size={140} level="M" />
              <div className="mt-2 font-mono text-xs text-muted-foreground">#{order.code}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "გადახდილი", cls: "bg-primary/10 text-primary" },
    ready: { label: "მზადაა", cls: "bg-warm text-warm-foreground" },
    collected: { label: "გაცემული", cls: "bg-success/15 text-success" },
    cancelled: { label: "გაუქმებული", cls: "bg-muted text-muted-foreground" },
    gifted: { label: "გაჩუქებული", cls: "bg-accent/20 text-accent-foreground" },
    pending: { label: "მოლოდინში", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${s.cls}`}>{s.label}</span>;
}
