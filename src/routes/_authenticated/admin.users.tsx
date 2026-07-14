import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { useAllCustomers } from "@/lib/admin-db";
import { formatGel } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "მომხმარებლები — ადმინი" }] }),
  component: AdminUsers,
});

function AdminUsers() {
  const { rows, loading } = useAllCustomers();
  const [q, setQ] = useState("");

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.first_name ?? "").toLowerCase().includes(s)
      || (r.last_name ?? "").toLowerCase().includes(s)
      || (r.phone ?? "").includes(s)
      || (r.district ?? "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">მომხმარებლები</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} რეგისტრირებული</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ძებნა სახელით, ტელეფონით, უბნით…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">იტვირთება…</p>
      ) : (
        <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3 font-semibold">სახელი</th>
                  <th className="text-left p-3 font-semibold">უბანი</th>
                  <th className="text-left p-3 font-semibold">ტელეფონი</th>
                  <th className="text-right p-3 font-semibold">შეკვეთა</th>
                  <th className="text-right p-3 font-semibold">დახარჯული</th>
                  <th className="text-right p-3 font-semibold">დაზოგილი</th>
                  <th className="text-left p-3 font-semibold">როლი</th>
                  <th className="text-left p-3 font-semibold">რეგისტრაცია</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3">{r.district ?? "—"}</td>
                    <td className="p-3">{r.phone ?? "—"}</td>
                    <td className="p-3 text-right">{r.order_count}</td>
                    <td className="p-3 text-right">{formatGel(r.total_spent)}</td>
                    <td className="p-3 text-right text-success font-semibold">{formatGel(r.money_saved)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.roles.map((role) => (
                          <span key={role} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${role === "admin" ? "bg-destructive text-destructive-foreground" : role === "partner" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("ka-GE")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">არაფერი მოიძებნა.</p>}
        </div>
      )}
    </div>
  );
}
