import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, ChevronDown, Loader2, Send, X, RefreshCw, Download } from "lucide-react";
import {
  cancelContract,
  createContractVersion,
  generateContractForStore,
  getAdminStoreContract,
  resendContract,
} from "@/lib/contracts.functions";
import { contractStatusTone, type ContractEvent, type PartnerContract } from "@/lib/contracts";
import { useI18n } from "@/lib/i18n";

/** Admin-side contract status, actions and audit trail for one store. */
export function ContractPanel({ storeId }: { storeId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchContract = useServerFn(getAdminStoreContract);
  const generateFn = useServerFn(generateContractForStore);
  const resendFn = useServerFn(resendContract);
  const cancelFn = useServerFn(cancelContract);
  const newVersionFn = useServerFn(createContractVersion);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contract", storeId],
    queryFn: () => fetchContract({ data: { storeId } }),
    enabled: open,
  });

  const current = (data?.current ?? null) as PartnerContract | null;
  const events = (data?.events ?? []) as ContractEvent[];

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["admin-contract", storeId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left text-xs font-semibold"
      >
        <FileSignature className="w-4 h-4 text-primary" />
        <span className="flex-1">{t("admin.contract.panelTitle")}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-3 pt-0 space-y-3">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

          {!isLoading && !current && (
            <div className="text-xs text-muted-foreground">
              {t("admin.contract.none")}
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => generateFn({ data: { storeId } }))}
                className="mt-2 w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> {t("admin.contract.generate")}
              </button>
            </div>
          )}

          {current && (
            <>
              <div className="flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold">{current.contract_number}</div>
                  <div className="text-muted-foreground">v{current.version}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-semibold ${contractStatusTone(current.status)}`}>
                  {t(`contract.status.${current.status}`)}
                </span>
              </div>

              {current.signed_at && (
                <div className="text-[11px] text-muted-foreground">
                  {t("admin.contract.signedAt")}: {new Date(current.signed_at).toLocaleString()}
                  {current.signed_ip ? ` · IP ${current.signed_ip}` : ""}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {data?.pdfUrl && (
                  <a
                    href={data.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 h-8 rounded-xl bg-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> {t("admin.contract.viewPdf")}
                  </a>
                )}
                {data?.signatureUrl && (
                  <a
                    href={data.signatureUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 h-8 rounded-xl bg-secondary text-xs font-semibold inline-flex items-center"
                  >
                    {t("admin.contract.viewSignature")}
                  </a>
                )}
                {(current.status === "sent" || current.status === "viewed") && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => resendFn({ data: { contractId: current.id } }))}
                      className="px-3 h-8 rounded-xl bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {t("admin.contract.resend")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => act(() => cancelFn({ data: { contractId: current.id } }))}
                      className="px-3 h-8 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> {t("admin.contract.cancel")}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(() => newVersionFn({ data: { storeId } }))}
                  className="px-3 h-8 rounded-xl bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> {t("admin.contract.newVersion")}
                </button>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  {t("admin.contract.timeline")}
                </div>
                <ul className="space-y-1">
                  {events.map((ev) => (
                    <li key={ev.id} className="text-[11px] text-muted-foreground flex gap-2">
                      <span className="font-semibold text-foreground">{t(`contract.event.${ev.event_type}`)}</span>
                      <span>{new Date(ev.created_at).toLocaleString()}</span>
                      {ev.actor_email && <span className="truncate">{ev.actor_email}</span>}
                    </li>
                  ))}
                  {!events.length && (
                    <li className="text-[11px] text-muted-foreground">{t("admin.contract.noEvents")}</li>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ContractPanel;
