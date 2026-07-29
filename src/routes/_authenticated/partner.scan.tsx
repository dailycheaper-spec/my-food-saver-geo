import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, XCircle, Hash, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateOrderStatus, useMyStores, formatGel } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/partner/scan")({
  head: () => ({ meta: [{ title: "QR Scanner — Cheaper" }] }),
  component: ScanPage,
});

function ScanPage() {
  const { t } = useI18n();
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string; order?: { code: string; amount: number; title: string } } | null>(null);

  function stopCamera() {
    scanningRef.current = false;
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera() {
    setResult(null);
    setScanning(true);
    scanningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-expect-error - BarcodeDetector is not in TS lib
      if (typeof window.BarcodeDetector === "undefined") {
        setResult({ ok: false, msg: t("cameraAccessError") });
        stopCamera();
        return;
      }
      // @ts-expect-error
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            stopCamera();
            await handleCode(codes[0].rawValue);
            return;
          }
        } catch { /* frame skip */ }
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      stopCamera();
      setResult({ ok: false, msg: t("cameraAccessError") });
    }
  }

  async function handleCode(raw: string) {
    if (!store) return;
    let orderCode = raw.trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.code) orderCode = String(parsed.code);
      else if (parsed.orderId) orderCode = String(parsed.orderId);
    } catch {}

    const isUuid = /^[0-9a-f-]{36}$/i.test(orderCode);
    const query = supabase.from("orders").select("*, offer:offers(title)").eq("store_id", store.id);
    const { data } = isUuid ? await query.eq("id", orderCode).maybeSingle() : await query.eq("code", orderCode).maybeSingle();

    if (!data) {
      setResult({ ok: false, msg: `${t("orderNotFoundCode")} (${orderCode})` });
      return;
    }
    if (data.status === "collected") {
      setResult({ ok: false, msg: `#${data.code} — ${t("alreadyCollected")}.` });
      return;
    }
    if (data.status === "cancelled" || data.status === "gifted") {
      setResult({ ok: false, msg: `#${data.code} — ${t("statusLbl")}: ${data.status}` });
      return;
    }
    await updateOrderStatus(data.id, "collected");
    setResult({ ok: true, msg: t("successGiven"), order: { code: data.code, amount: Number(data.amount), title: (data.offer as { title?: string } | null)?.title ?? "" } });
    setCode("");
  }

  useEffect(() => () => { stopCamera(); }, []);


  if (loading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-2xl font-bold mb-4">{t("qrScannerTitle")}</h1>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="aspect-square bg-black grid place-items-center relative">
          {scanning ? (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          ) : (
            <div className="text-center text-white/60">
              <Camera className="w-12 h-12 mx-auto opacity-40" />
              <p className="text-sm mt-2">{t("tapStartCamera")}</p>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-8 border-2 border-primary rounded-2xl pointer-events-none" />
          )}
        </div>
        <div className="p-4">
          <button
            onClick={startCamera}
            disabled={scanning}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Camera className="w-4 h-4" /> {scanning ? t("scanningLbl") : t("startCamera")}
          </button>
        </div>
      </div>

      <div className="mt-4 bg-card rounded-2xl border border-border p-4">
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <Hash className="w-3 h-3" /> {t("orEnterCode")}
        </div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="flex-1 px-3 py-2.5 rounded-xl bg-muted/40 border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => handleCode(code)} disabled={!code} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50">
            {t("validate")}
          </button>
        </div>
      </div>

      {result && (
        <div className={`mt-4 rounded-2xl p-5 border-2 ${result.ok ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}`}>
          <div className="flex items-center gap-2">
            {result.ok ? <CheckCircle2 className="w-6 h-6 text-success" /> : <XCircle className="w-6 h-6 text-destructive" />}
            <div className="font-semibold">{result.msg}</div>
          </div>
          {result.order && (
            <div className="mt-3 text-sm space-y-0.5">
              <div>{t("codeLbl")}: <span className="font-mono font-bold">#{result.order.code}</span></div>
              <div>{t("productLbl")}: {result.order.title}</div>
              <div>{t("amountLbl")}: {formatGel(result.order.amount)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
