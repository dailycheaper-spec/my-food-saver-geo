import { Wallet, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
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
  const [open, setOpen] = useState(false);

  const { total, today, week, month } = useMemo(() => {
    const tStart = startOfToday();
    const wStart = startOfWeek();
    const mStart = startOfMonth();
    let total = 0, today = 0, week = 0, month = 0;
    for (const o of orders) {
      if (o.status !== "collected" && o.status !== "gifted") continue;
      const orig = o.original_price_at_purchase == null ? null : Number(o.original_price_at_purchase);
      if (orig == null) continue;
      const saved = Math.max(0, orig - Number(o.amount));
      total += saved;
      const ts = new Date(o.collected_at ?? o.created_at).getTime();
      if (ts >= tStart) today += saved;
      if (ts >= wStart) week += saved;
      if (ts >= mStart) month += saved;
    }
    return { total, today, week, month };
  }, [orders]);

  const L = {
    saved:
      language === "en" ? "saved" :
      language === "ru" ? "сэкономлено" :
      "დაზოგილი",
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
    details:
      language === "en" ? "Show details" :
      language === "ru" ? "Подробнее" :
      "დეტალურად",
  };

  return (
    <section className="mx-auto max-w-6xl px-4 mt-3 sm:mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={L.details}
        className="w-full flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 shadow-soft pl-2 pr-3 py-1.5 sm:py-2 active:scale-[0.99] transition"
      >
        <span className="w-7 h-7 rounded-full bg-primary/15 grid place-items-center shrink-0">
          <Wallet className="w-4 h-4 text-primary" />
        </span>
        <span className="font-display text-sm sm:text-base font-extrabold text-primary tabular-nums">
          {formatGel(total)}
        </span>
        <span className="text-xs sm:text-sm text-muted-foreground">{L.saved}</span>
        <ChevronDown
          className={`ml-auto w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <Stat label={L.today} value={today} />
          <Stat label={L.week} value={week} />
          <Stat label={L.month} value={month} />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 px-2 py-2 sm:px-3 sm:py-2.5 text-center">
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-sm sm:text-lg font-extrabold text-primary tabular-nums">
        {formatGel(value)}
      </div>
    </div>
  );
}
