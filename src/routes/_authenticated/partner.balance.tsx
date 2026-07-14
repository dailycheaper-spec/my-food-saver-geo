import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, Coins, Clock, CheckCircle2, Wallet } from "lucide-react";
import { useMyStores, useStoreOrders, formatGel } from "@/lib/db";
import { PLATFORM_COMMISSION, usePayouts } from "@/lib/partner-db";

export const Route = createFileRoute("/_authenticated/partner/balance")({
  head: () => ({ meta: [{ title: "ბალანსი — SaveBite" }] }),
  component: BalancePage,
});

function BalancePage() {
  const { stores } = useMyStores();
  const store = stores[0] ?? null;
  const { orders } = useStoreOrders(store?.id ?? null);
  const { payouts } = usePayouts(store?.id ?? null);
  const navigate = useNavigate();

  const s = useMemo(() => {
    const paid = orders.filter((o) => o.status === "paid" || o.status === "ready" || o.status === "collected");
    const today = new Date().toDateString();
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;

    const todayGross = paid.filter((o) => new Date(o.created_at).toDateString() === today).reduce((a, o) => a + Number(o.amount), 0);
    const weekGross = paid.filter((o) => new Date(o.created_at).getTime() >= weekAgo).reduce((a, o) => a + Number(o.amount), 0);
    const allGross = paid.reduce((a, o) => a + Number(o.amount), 0);
    const commission = todayGross * PLATFORM_COMMISSION;

    const paidOut = payouts.filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount), 0);
    const pending = Math.max(0, allGross * (1 - PLATFORM_COMMISSION) - paidOut);
    const lastPayout = payouts.find((p) => p.status === "paid");

    return {
      todayNet: todayGross * (1 - PLATFORM_COMMISSION),
      weekNet: weekGross * (1 - PLATFORM_COMMISSION),
      pending,
      commission,
      lastPayoutAmount: lastPayout ? Number(lastPayout.amount) : 0,
      lastPayoutDate: lastPayout?.paid_at ?? null,
    };
  }, [orders, payouts]);

  if (!store) return <div className="text-center py-12 text-muted-foreground">ჯერ არ გაქვს დამტკიცებული მაღაზია.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> უკან
      </button>
      <h1 className="font-display text-2xl font-bold mb-5">ბალანსი</h1>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-primary via-primary to-primary/70 text-white shadow-xl mb-4">
        <div className="text-sm opacity-90">გამოსატანი ბალანსი</div>
        <div className="text-4xl font-black mt-1">{formatGel(s.pending)}</div>
        <div className="text-xs opacity-80 mt-1">პლატფორმის საკომისიო: {(PLATFORM_COMMISSION * 100).toFixed(0)}%</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Row icon={<Coins className="w-4 h-4" />} label="დღეს (წმინდა)" value={formatGel(s.todayNet)} />
        <Row icon={<Clock className="w-4 h-4" />} label="7 დღეში" value={formatGel(s.weekNet)} />
        <Row icon={<Wallet className="w-4 h-4" />} label="ბოლო გადახდა" value={s.lastPayoutAmount ? formatGel(s.lastPayoutAmount) : "—"} />
        <Row icon={<CheckCircle2 className="w-4 h-4" />} label="ბოლო თარიღი" value={s.lastPayoutDate ? new Date(s.lastPayoutDate).toLocaleDateString("ka-GE") : "—"} />
      </div>

      <div className="mt-6 bg-card rounded-3xl border border-border p-5">
        <h3 className="font-semibold mb-3">გადახდების ისტორია</h3>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ჯერ არ არის გადახდები.</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0">
                <div>
                  <div className="font-semibold">{formatGel(Number(p.amount))}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ka-GE")}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-primary/10 text-primary" : "bg-warm text-warm-foreground"}`}>
                  {p.status === "paid" ? "გადახდილი" : "მოლოდინში"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <div className="text-lg font-bold mt-2">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
