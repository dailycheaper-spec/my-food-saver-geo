import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Wallet, Check, Clock, PlayCircle, Copy, FileDown } from "lucide-react";
import { toast } from "sonner";
import { useAllOrders, useAllStores, formatGel } from "@/lib/db";
import { useAllPayouts } from "@/lib/admin-db";
import { usePlatformCommissionPct } from "@/lib/platform-settings";
import { markAdminPayoutPaid, runPayoutGeneration } from "@/lib/payouts.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => {
    const lang = typeof window !== "undefined" ? window.localStorage.getItem("cheaper-language") : null;
    const title = lang === "en" ? "Payments — Admin" : lang === "ru" ? "Платежи — Админ" : "გადახდები — ადმინი";
    return { meta: [{ title }] };
  },
  component: AdminPayments,
});

function AdminPayments() {
  const { t } = useI18n();
  const { orders } = useAllOrders();
  const { stores } = useAllStores();
  const { payouts, reload, error: payoutsError } = useAllPayouts();
  const commissionPct = usePlatformCommissionPct();
  const rate = commissionPct / 100;
  const runPayouts = useServerFn(runPayoutGeneration);
  const markPaid = useServerFn(markAdminPayoutPaid);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);



  const stats = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    const gross = valid.reduce((s, o) => s + Number(o.amount), 0);
    const commission = gross * rate;
    const partnerNet = gross - commission;
    const paidPayouts = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const pendingPayouts = payouts.filter((p) => p.status !== "paid").reduce((s, p) => s + Number(p.amount), 0);
    // Turnover split by the bank that processed the payment.
    const byProvider = valid.reduce(
      (acc, o) => {
        const key = (o as { payment_provider?: string }).payment_provider === "flitt" ? "flitt" : "bog";
        acc[key].count += 1;
        acc[key].amount += Number(o.amount);
        return acc;
      },
      { bog: { count: 0, amount: 0 }, flitt: { count: 0, amount: 0 } },
    );
    return { gross, commission, partnerNet, paidPayouts, pendingPayouts, byProvider };
  }, [orders, payouts, rate]);



  return (
    <div className="space-y-6">
      <div className="head-row sm:flex sm:items-end sm:justify-between sm:flex-wrap sm:gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{t("admin.payments.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.payments.commission")} {commissionPct}% · {t("admin.payments.partnerBalances")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setGenerating(true); setGenMsg(null);
              try {
                const res = await runPayouts() as { generated: number };
                setGenMsg(t("admin.payments.generatedRecords", { count: res.generated }));
                reload();
              } catch (e) {
                setGenMsg(t("admin.payments.errorPrefix") + (e instanceof Error ? e.message : String(e)));
              } finally { setGenerating(false); }
            }}
            disabled={generating}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
          >
            <PlayCircle className="w-4 h-4" /> {generating ? t("admin.payments.processing") : t("admin.payments.calculateNow")}
          </button>
        </div>
      </div>
      {genMsg && <div className="text-sm text-muted-foreground">{genMsg}</div>}
      {payoutsError && <div className="text-sm text-destructive">{payoutsError}</div>}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label={t("admin.payments.totalTurnover")} value={formatGel(stats.gross)} icon={Wallet} tint="primary" />
        <StatCard label={`${t("admin.payments.commission")} (${commissionPct}%)`} value={formatGel(stats.commission)} icon={Wallet} tint="warm" />
        <StatCard label={t("admin.payments.partnerShare")} value={formatGel(stats.partnerNet)} icon={Check} tint="success" />
        <StatCard label={t("admin.payments.pending")} value={formatGel(stats.pendingPayouts)} icon={Clock} tint="muted" />
      </div>

      <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
        <h3 className="font-display font-bold text-lg mb-3">{t("admin.payments.byBank")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {([
            ["bog", "Bank of Georgia"],
            ["flitt", "Flitt"],
          ] as const).map(([key, name]) => (
            <div key={key} className="rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-semibold uppercase tracking-wide">
                  {key}
                </span>
                <span className="text-sm font-medium truncate">{name}</span>
              </div>
              <div className="mt-2 font-display text-xl font-bold">{formatGel(stats.byProvider[key].amount)}</div>
              <div className="text-xs text-muted-foreground">
                {stats.byProvider[key].count} {t("analytics.orderCount")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border p-5 lg:p-6 shadow-sm">
        <h3 className="font-display font-bold text-lg mb-4">{t("admin.payments.partnerBalancesTitle")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-semibold">{t("admin.payments.colStore")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.payments.colOrders")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.payments.colTurnover")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.payments.commission")}</th>
                <th className="text-right p-3 font-semibold">{t("admin.payments.colPayable")}</th>
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
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h3 className="font-display font-bold text-lg">{t("admin.payments.payoutRequests")}</h3>
            <button
              onClick={() => {
                const pending = payouts.filter((p) => p.status !== "paid" && p.bank_iban);
                if (pending.length === 0) { toast.info(t("admin.payments.noPendingIban")); return; }
                const rows = [["Store", "IBAN", "Account holder", "Amount (GEL)"]];
                pending.forEach((p) => rows.push([
                  (p.store_name ?? "").replace(/"/g, '""'),
                  p.bank_iban ?? "",
                  (p.account_holder ?? "").replace(/"/g, '""'),
                  Number(p.amount).toFixed(2),
                ]));
                const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `pending-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted">
              <FileDown className="w-4 h-4" /> {t("admin.payments.exportAll")}
            </button>
          </div>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/30 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{p.store_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ka-GE")}</div>
                  {p.bank_iban ? (
                    <div className="text-xs mt-1 font-mono text-foreground">IBAN: {p.bank_iban}{p.account_holder ? ` · ${p.account_holder}` : ""}</div>
                  ) : (
                    <div className="text-xs mt-1 text-destructive font-semibold">{t("admin.payments.ibanMissingWarn")}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold">{formatGel(Number(p.amount))}</div>
                  {p.status !== "paid" && p.bank_iban && (
                    <button
                      onClick={async () => {
                        const text = [
                          `${t("admin.payments.colStore")}: ${p.store_name ?? ""}`,
                          `IBAN: ${p.bank_iban}`,
                          `${t("admin.payments.holder")}: ${p.account_holder ?? p.store_name ?? ""}`,
                          `${t("admin.payments.amount")}: ${Number(p.amount).toFixed(2)} GEL`,
                        ].join("\n");
                        try {
                          await navigator.clipboard.writeText(text);
                          toast.success(t("admin.payments.copied"));
                        } catch { toast.error(t("admin.payments.copyFailed")); }
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-card border border-border font-semibold hover:bg-muted inline-flex items-center gap-1">
                      <Copy className="w-3 h-3" /> {t("admin.payments.copyDetails")}
                    </button>
                  )}
                  {p.status === "paid" ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-semibold">{t("admin.payments.paid")}</span>
                  ) : (
                    <button onClick={async () => { await markPaid({ data: { payoutId: p.id } }); reload(); }}
                      disabled={!p.bank_iban}
                      title={!p.bank_iban ? t("admin.payments.ibanRequired") : undefined}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                      {t("admin.payments.confirmPayout")}
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
