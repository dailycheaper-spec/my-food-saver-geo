import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, Check, Clock, Download, PlayCircle, Copy, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useAllOrders, useAllStores, formatGel } from "@/lib/db";
import { useAllPayouts, markPayoutPaid } from "@/lib/admin-db";
import { loadAdminSettings } from "@/lib/admin-settings";
import { runPayoutGeneration } from "@/lib/payouts.functions";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({ meta: [{ title: "გადახდები — ადმინი" }] }),
  component: AdminPayments,
});

function AdminPayments() {
  const { orders } = useAllOrders();
  const { stores } = useAllStores();
  const { payouts, reload } = useAllPayouts();
  const settings = loadAdminSettings();
  const rate = settings.commissionPct / 100;
  const runPayouts = useServerFn(runPayoutGeneration);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);



  const stats = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    const gross = valid.reduce((s, o) => s + Number(o.amount), 0);
    const commission = gross * rate;
    const partnerNet = gross - commission;
    const paidPayouts = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const pendingPayouts = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + Number(p.amount), 0);
    return { gross, commission, partnerNet, paidPayouts, pendingPayouts };
  }, [orders, payouts, rate]);

  function exportCsv() {
    const rows = [["Store", "Orders", "Gross", "Commission", "Net"]];
    stores.forEach((s) => {
      const oList = orders.filter((o) => o.store_id === s.id && o.status !== "cancelled");
      const g = oList.reduce((sum, o) => sum + Number(o.amount), 0);
      rows.push([s.name, String(oList.length), g.toFixed(2), (g * rate).toFixed(2), (g * (1 - rate)).toFixed(2)]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">გადახდები</h1>
          <p className="text-sm text-muted-foreground mt-1">კომისია {settings.commissionPct}% · პარტნიორების ბალანსი</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setGenerating(true); setGenMsg(null);
              try {
                const res = await runPayouts() as { generated: number };
                setGenMsg(`შეიქმნა ${res.generated} ახალი გატანის ჩანაწერი.`);
                reload();
              } catch (e) {
                setGenMsg("შეცდომა: " + (e instanceof Error ? e.message : String(e)));
              } finally { setGenerating(false); }
            }}
            disabled={generating}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
          >
            <PlayCircle className="w-4 h-4" /> {generating ? "მიმდინარეობს…" : "გატანის დათვლა ახლა"}
          </button>
          <button onClick={exportCsv} className="px-4 py-2.5 rounded-2xl bg-foreground text-background text-sm font-semibold flex items-center gap-2 hover:opacity-90">
            <Download className="w-4 h-4" /> ანგარიშის ექსპორტი
          </button>
        </div>
      </div>
      {genMsg && <div className="text-sm text-muted-foreground">{genMsg}</div>}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="სულ ბრუნვა" value={formatGel(stats.gross)} icon={Wallet} tint="primary" />
        <StatCard label={`კომისია (${settings.commissionPct}%)`} value={formatGel(stats.commission)} icon={Wallet} tint="warm" />
        <StatCard label="პარტნიორთა წილი" value={formatGel(stats.partnerNet)} icon={Check} tint="success" />
        <StatCard label="მოლოდინში" value={formatGel(stats.pendingPayouts)} icon={Clock} tint="muted" />
      </div>

      <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
        <h3 className="font-display font-bold text-lg mb-4">პარტნიორთა ბალანსი</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-semibold">მაღაზია</th>
                <th className="text-right p-3 font-semibold">შეკვეთა</th>
                <th className="text-right p-3 font-semibold">ბრუნვა</th>
                <th className="text-right p-3 font-semibold">კომისია</th>
                <th className="text-right p-3 font-semibold">გადასახდელი</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => {
                const oList = orders.filter((o) => o.store_id === s.id && o.status !== "cancelled");
                const g = oList.reduce((sum, o) => sum + Number(o.amount), 0);
                return (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-right">{oList.length}</td>
                    <td className="p-3 text-right">{formatGel(g)}</td>
                    <td className="p-3 text-right text-warm-foreground">{formatGel(g * rate)}</td>
                    <td className="p-3 text-right font-bold text-success">{formatGel(g * (1 - rate))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {payouts.length > 0 && (
        <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">გატანის მოთხოვნები</h3>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/30 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.store_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ka-GE")}</div>
                  {p.bank_iban ? (
                    <div className="text-xs mt-1 font-mono text-foreground">IBAN: {p.bank_iban}{p.account_holder ? ` · ${p.account_holder}` : ""}</div>
                  ) : (
                    <div className="text-xs mt-1 text-destructive font-semibold">⚠ IBAN არაა — მოთხოვე პარტნიორს</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold">{formatGel(Number(p.amount))}</div>
                  {p.status === "paid" ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-semibold">გადახდილი</span>
                  ) : (
                    <button onClick={async () => { await markPayoutPaid(p.id); reload(); }}
                      disabled={!p.bank_iban}
                      title={!p.bank_iban ? "IBAN საჭიროა გადახდის დადასტურებამდე" : undefined}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                      გადახდის დადასტურება
                    </button>
                  )}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tint }: { label: string; value: string; icon: React.ElementType; tint: "primary" | "warm" | "success" | "muted" }) {
  const tints = {
    primary: "bg-primary/10 text-primary",
    warm: "bg-warm text-warm-foreground",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-foreground",
  };
  return (
    <div className="bg-card rounded-3xl border border-border p-4 lg:p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-2xl grid place-items-center mb-3 ${tints[tint]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
