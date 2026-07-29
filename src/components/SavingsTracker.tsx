import { Wallet } from "lucide-react";
import { useMemo } from "react";
import { useMyOrders, formatGel } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfWeek(): number {
  // Rolling 7 days
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}
function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function SavingsTracker() {
  const { language } = useI18n();
  const { orders } = useMyOrders();

  const { today, week, month } = useMemo(() => {
    const tStart = startOfToday();
    const wStart = startOfWeek();
    const mStart = startOfMonth();
    let today = 0, week = 0, month = 0;
    for (const o of orders) {
      if (o.status !== "collected" && o.status !== "gifted") continue;
      const orig = o.original_price_at_purchase == null ? null : Number(o.original_price_at_purchase);
      if (orig == null) continue;
      const saved = Math.max(0, orig - Number(o.amount));
      const ts = new Date(o.collected_at ?? o.created_at).getTime();
      if (ts >= tStart) today += saved;
      if (ts >= wStart) week += saved;
      if (ts >= mStart) month += saved;
    }
    return { today, week, month };
  }, [orders]);

  const L = {
    title:
      language === "en" ? "Your savings" :
      language === "ru" ? "Ваша экономия" :
      "შენი დაზოგილი თანხა",
    today:
      language === "en" ? "Today" :
      language === "ru" ? "Сегодня" :
      "დღეს",
    week:
      language === "en" ? "This week" :
      language === "ru" ? "За неделю" :
      "ამ კვირაში",
    month:
      language === "en" ? "This month" :
      language === "ru" ? "За месяц" :
      "ამ თვეში",
  };

  return (
    <section className="mx-auto max-w-6xl px-4 mt-4 sm:mt-5">
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 shadow-soft p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/15 grid place-items-center">
            <Wallet className="w-[18px] h-[18px] text-primary" />
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold">{L.title}</h2>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label={L.today} value={today} />
          <Stat label={L.week} value={week} />
          <Stat label={L.month} value={month} />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-background/60 border border-border/60 px-2 py-2.5 sm:px-3 sm:py-3 text-center">
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-base sm:text-xl font-extrabold text-primary tabular-nums">
        {formatGel(value)}
      </div>
    </div>
  );
}
