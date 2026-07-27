import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Truck, ShoppingBag, Search } from "lucide-react";
import { useAllOrders, formatGel } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "შეკვეთები — ადმინი" }] }),
  component: AdminOrders,
});

const STATUSES = ["all", "pending", "paid", "ready", "collected", "gifted", "cancelled"] as const;

function AdminOrders() {
  const { orders } = useAllOrders();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [method, setMethod] = useState<"all" | "pickup" | "delivery">("all");
  const [range, setRange] = useState<"all" | "today" | "week" | "month">("all");

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<typeof range, number> = {
      all: 0,
      today: now - 24 * 3600 * 1000,
      week: now - 7 * 24 * 3600 * 1000,
      month: now - 30 * 24 * 3600 * 1000,
    };
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (method !== "all" && o.method !== method) return false;
      if (range !== "all" && new Date(o.created_at).getTime() < cutoffs[range]) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!o.code?.toLowerCase().includes(s)
          && !o.offer?.title?.toLowerCase().includes(s)
          && !o.store?.name?.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [orders, q, status, method, range]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">შეკვეთები</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} შეკვეთა · Realtime</p>
      </div>

      <div className="bg-card rounded-3xl border border-border p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ძებნა კოდით, პროდუქტით, მაღაზიით…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "ყველა სტატუსი" : s}</option>)}
          </select>
          <select value={method} onChange={(e) => setMethod(e.target.value as any)}
            className="px-3 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm">
            <option value="all">ყველა ტიპი</option>
            <option value="pickup">აღება</option>
            <option value="delivery">მიტანა</option>
          </select>
          <select value={range} onChange={(e) => setRange(e.target.value as any)}
            className="px-3 py-2.5 rounded-2xl bg-muted/50 border border-border text-sm">
            <option value="all">ყველა დრო</option>
            <option value="today">დღეს</option>
            <option value="week">7 დღე</option>
            <option value="month">30 დღე</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-semibold">კოდი</th>
                <th className="text-left p-3 font-semibold">მაღაზია</th>
                <th className="text-left p-3 font-semibold">პროდუქტი</th>
                <th className="text-left p-3 font-semibold">ტიპი</th>
                <th className="text-right p-3 font-semibold">თანხა</th>
                <th className="text-left p-3 font-semibold">გადახდა</th>
                <th className="text-left p-3 font-semibold">სტატუსი</th>
                <th className="text-left p-3 font-semibold">დრო</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-mono font-bold">#{o.code}</td>
                  <td className="p-3 truncate max-w-[160px]">{o.store?.name ?? "—"}</td>
                  <td className="p-3 truncate max-w-[200px]">{o.offer?.title ?? "—"}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {o.method === "delivery" ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                      {o.method === "delivery" ? "მიტანა" : "აღება"}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold">{formatGel(Number(o.amount))}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${["paid", "collected", "ready", "gifted"].includes(o.status) ? "bg-success/15 text-success" : o.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-warm text-warm-foreground"}`}>
                      {["paid", "collected", "ready", "gifted"].includes(o.status) ? "გადახდილი" : o.status === "cancelled" ? "გაუქმდა" : "მოლოდინი"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase font-semibold">{o.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(o.created_at).toLocaleString("ka-GE", { dateStyle: "short", timeStyle: "short", hour12: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">შეკვეთა არ მოიძებნა.</p>}
      </div>
    </div>
  );
}
