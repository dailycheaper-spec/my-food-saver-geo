import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ShieldCheck, Download, Loader2 } from "lucide-react";
import { getMyContract, signContract } from "@/lib/contracts.functions";
import { CONTRACT_PRINT_CSS } from "@/lib/contracts/template";
import {
  ANNEX3_KEYS,
  ANNEX3_MANDATORY_KEYS,
  ANNEX3_OPTIONAL_KEYS,
  applyAnnex3ToHtml,
  CONSENT_KEYS,
  contractStatusTone,
  type Annex3Key,
  type ConsentKey,
  type PartnerContract,
} from "@/lib/contracts";
import { SignaturePad } from "@/components/contracts/SignaturePad";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/partner/contract")({
  head: () => ({
    meta: [
      { title: "პარტნიორობის ხელშეკრულება — Cheaper" },
      { name: "description", content: "გაეცანით და ხელი მოაწერეთ Cheaper-ის პარტნიორობის ხელშეკრულებას." },
      { property: "og:title", content: "პარტნიორობის ხელშეკრულება — Cheaper" },
      { property: "og:description", content: "Cheaper-ის პარტნიორობის ხელშეკრულების გაცნობა და ელექტრონული ხელმოწერა." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PartnerContractPage,
});

function PartnerContractPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchContract = useServerFn(getMyContract);
  const sign = useServerFn(signContract);

  const { data, isLoading } = useQuery({
    queryKey: ["partner-contract"],
    queryFn: () => fetchContract(),
  });

  const contract = (data?.contract ?? null) as PartnerContract | null;
  const html = data?.html ?? null;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pdfFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    readAll: false,
    authorised: false,
    electronicSignature: false,
  });
  const [annex3Checked, setAnnex3Checked] = useState<Record<Annex3Key, boolean>>(
    () => Object.fromEntries(ANNEX3_KEYS.map((k) => [k, false])) as Record<Annex3Key, boolean>,
  );
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allConsented = useMemo(() => CONSENT_KEYS.every((k) => consents[k]), [consents]);
  const allAnnex3Checked = useMemo(
    () => ANNEX3_MANDATORY_KEYS.every((k) => annex3Checked[k]),
    [annex3Checked],
  );
  const canSign = scrolledToEnd && allConsented && allAnnex3Checked && !!signature && !busy;

  /**
   * The ☐/☑ glyphs appear only in the Annex 3 list, in ANNEX3_KEYS order, so the
   * preview mirrors exactly which items the partner ticked in this session.
   */
  const displayHtml = useMemo(
    () => applyAnnex3ToHtml(html ?? "", annex3Checked),
    [html, annex3Checked],
  );


  // A short contract may never scroll — treat "no overflow" as already read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !html) return;
    if (el.scrollHeight <= el.clientHeight + 8) setScrolledToEnd(true);
  }, [html]);

  /**
   * html2canvas can't parse oklch() (Tailwind v4 tokens leak in through inherited
   * styles), so the PDF is rasterised from an isolated iframe that only ever loads
   * CONTRACT_PRINT_CSS.
   */
  async function renderPrintNode(): Promise<HTMLElement> {
    const frame = pdfFrameRef.current;
    if (!frame) throw new Error("print frame unavailable");
    const doc = frame.contentDocument;
    if (!doc) throw new Error("print frame document unavailable");
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><style>` +
        `html,body{margin:0;padding:16px;background:#ffffff;color:#111111;}` +
        CONTRACT_PRINT_CSS +
        `</style></head><body>${displayHtml}${
          signature
            ? `<div style="margin-top:16px"><div style="font-size:12px;color:#444444">${
                t("partner.contract.signatureLabel")
              }</div><img src="${signature}" style="height:80px" /></div>`
            : ""
        }</body></html>`,
    );
    doc.close();
    // Let the iframe lay out (and decode the signature image) before rasterising.
    await new Promise((r) => setTimeout(r, 150));
    const img = doc.querySelector("img");
    if (img && !img.complete) {
      await new Promise((r) => {
        img.onload = r;
        img.onerror = r;
      });
    }
    frame.style.height = `${doc.body.scrollHeight + 32}px`;
    return doc.body;
  }

  /** Blob → bare base64 (no data: prefix), so it can travel in the JSON payload. */
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = () => reject(new Error("file-read-failed"));
      reader.readAsDataURL(blob);
    });
  }

  async function handleSign() {
    if (!contract || !signature) return;
    setBusy(true);
    setError("");
    try {
      const { contractHtmlToPdfBlob } = await import("@/lib/contract-pdf");
      const pdfBlob = await contractHtmlToPdfBlob(await renderPrintNode());

      // The server stores both files with its own credentials — the browser only renders them.
      await sign({
        data: {
          contractId: contract.id,
          pdfBase64: await blobToBase64(pdfBlob),
          signatureBase64: signature.slice(signature.indexOf(",") + 1),
          consents: { readAll: true, authorised: true, electronicSignature: true },
          annex3: annex3Checked,
        },
      });
      await qc.invalidateQueries({ queryKey: ["partner-contract"] });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(
        raw.includes("CONTRACT_FILE_UPLOAD_FAILED")
          ? t("partner.contract.errorUpload")
          : raw.includes("already signed")
            ? t("partner.contract.errorAlreadySigned")
            : raw.includes("Forbidden")
              ? t("partner.contract.errorForbidden")
              : t("partner.contract.errorGeneric"),
      );
      console.error("[contract sign] failed:", raw);
    } finally {
      setBusy(false);
    }
  }


  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        {t("partner.contract.loading")}
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <h1 className="font-display text-xl font-bold">{t("partner.contract.noneTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("partner.contract.noneBody")}</p>
        </div>
      </div>
    );
  }

  const signed = contract.status === "signed";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <style>{CONTRACT_PRINT_CSS}</style>

      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold">{t("partner.contract.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {contract.contract_number} · v{contract.version}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${contractStatusTone(contract.status)}`}>
          {t(`contract.status.${contract.status}`)}
        </span>
      </header>

      {signed && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <div className="text-sm flex-1">
            <div className="font-semibold">{t("partner.contract.signedTitle")}</div>
            <div className="text-xs text-muted-foreground">
              {contract.signed_at ? new Date(contract.signed_at).toLocaleString() : ""}
            </div>
          </div>
          {data?.pdfUrl && (
            <a
              href={data.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Download className="w-4 h-4" /> {t("partner.contract.downloadPdf")}
            </a>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
        }}
        className="max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-5"
      >
        <div className="bg-white p-2">
          <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
          {signature && (
            <div className="mt-4">
              <div className="text-xs text-[#444]">{t("partner.contract.signatureLabel")}</div>
              <img src={signature} alt={t("partner.contract.signatureLabel")} className="h-20" />
            </div>
          )}
        </div>
      </div>

      {/* Off-screen isolated document used only for PDF rasterisation. */}
      <iframe
        ref={pdfFrameRef}
        title="contract-pdf-source"
        aria-hidden
        tabIndex={-1}
        className="fixed left-[-10000px] top-0 w-[794px] h-[1123px] border-0 pointer-events-none"
      />


      {!signed && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {!scrolledToEnd && (
            <p className="text-xs text-amber-600 font-medium">{t("partner.contract.scrollHint")}</p>
          )}

          <div className="space-y-2">
            {CONSENT_KEYS.map((key) => (
              <label key={key} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={consents[key]}
                  disabled={!scrolledToEnd}
                  onChange={(e) => setConsents((c) => ({ ...c, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                />
                <span className={scrolledToEnd ? "" : "text-muted-foreground"}>
                  {t(`partner.contract.consent.${key}`)}
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground pt-3">
              {t("partner.contract.annex3.heading")}
            </p>
            {ANNEX3_KEYS.map((key) => {
              const optional = ANNEX3_OPTIONAL_KEYS.includes(key);
              return (
                <label key={key} className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={annex3Checked[key]}
                    disabled={!scrolledToEnd}
                    onChange={(e) => setAnnex3Checked((c) => ({ ...c, [key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                  />
                  <span className={scrolledToEnd ? "" : "text-muted-foreground"}>
                    {t(`partner.contract.annex3.${key}`)}
                    {optional ? (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        ({t("partner.contract.annex3.optionalTag")})
                      </span>
                    ) : (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>

          <SignaturePad
            onChange={setSignature}
            clearLabel={t("partner.contract.clearSignature")}
            hint={t("partner.contract.signatureHint")}
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="button"
            onClick={handleSign}
            disabled={!canSign}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? t("partner.contract.signing") : t("partner.contract.signButton")}
          </button>
        </div>
      )}
    </div>
  );
}
