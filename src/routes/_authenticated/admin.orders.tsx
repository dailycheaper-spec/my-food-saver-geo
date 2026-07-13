import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Truck, ShoppingBag } from "lucide-react";
import { useAllOrders, formatGel } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({ meta: [{ title: "შეკვეთები — ადმინი" }] }),
  component: AdminOrders,
});

function AdminOrders() {
  const { orders } = useAllOrders();
  const [q, setQ] = useState("");

  const filtered = orders.filter((o) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return o.code?.toLowerCase().includes(s) || o.offer?.title?.toLowerCase().includes(s) || o.store?.name?.toLowerCase().includes(s);
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-4">ყველა შეკვეთა</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ძებნა კოდით, პროდუქტით ან მაღაზიით…"
        className="w-full mb-4 px-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">კოდი</th>
              <th className="text-left p-3">მაღაზია</th>
              <th className="text-left p-3">პროდუქტი</th>
              <th className="text-left p-3">მიწოდება</th>
              <th className="text-right p-3">თანხა</th>
              <th className="text-left p-3">სტატუსი</th>
              <th className="text-left p-3">დრო</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono font-bold">#{o.code}</td>
                <td className="p-3">{o.store?.name ?? "—"}</td>
                <td className="p-3 truncate max-w-[200px]">{o.offer?.title ?? "—"}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-xs">
                    {o.method === "delivery" ? <Truck className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                    {o.method === "delivery" ? "მიტანა" : "აღება"}
                  </span>
                </td>
                <td className="p-3 text-right font-semibold">{formatGel(Number(o.amount))}</td>
                <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase font-semibold">{o.status}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ka-GE", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">შეკვეთა არ მოიძებნა.</p>}
      </div>
    </div>
  );
}
