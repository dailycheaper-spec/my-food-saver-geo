import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, XCircle, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateOrderStatus, useMyStores, formatGel } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/partner/scan")({
  head: () => ({ meta: [{ title: "QR სკანერი — Cheaper" }] }),
  component: ScanPage,
});

function ScanPage() {
  const { stores } = useMyStores();
  const store = stores[0] ?? null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string; order?: { code: string; amount: number; title: string } } | null>(null);

  async function startCamera() {
    setResult(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // @ts-expect-error - BarcodeDetector is not in TS lib
      if (typeof window.BarcodeDetector !== "undefined") {
        // @ts-expect-error
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stream.getTracks().forEach((t) => t.stop());
              setScanning(false);
              await handleCode(codes[0].rawValue);
              return;
            }
          } catch {}
          requestAnimationFrame(tick);
        };
        tick();
      }
    } catch (e) {
      setScanning(false);
      setResult({ ok: false, msg: "კამერასთან წვდომა ვერ მოხერხდა. გამოიყენე კოდის შეყვანა ხელით." });
    }
  }

  async function handleCode(raw: string) {
    if (!store) return;
    let orderCode = raw.trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.code) orderCode = parsed.code;
      else if (parsed.orderId) orderCode = parsed.orderId;
    } catch {}

    const isUuid = /^[0-9a-f-]{36}$/i.test(orderCode);
    const query = supabase.from("orders").select("*, offer:offers(title)").eq("store_id", store.id);
    const { data } = isUuid ? await query.eq("id", orderCode).maybeSingle() : await query.eq("code", orderCode).maybeSingle();

    if (!data) {
      setResult({ ok: false, msg: `შეკვეთა ვერ მოიძებნა (${orderCode})` });
      return;
    }
    if (data.status === "collected") {
      setResult({ ok: false, msg: `შეკვეთა #${data.code} უკვე გაცემულია.` });
      return;
    }
    if (data.status === "cancelled" || data.status === "gifted") {
      setResult({ ok: false, msg: `შეკვეთა #${data.code} — სტატუსი: ${data.status}` });
      return;
    }
    await updateOrderStatus(data.id, "collected");
    setResult({ ok: true, msg: "შეკვეთა წარმატებით გაცემულია!", order: { code: data.code, amount: Number(data.amount), title: (data.offer as { title?: string } | null)?.title ?? "" } });
    setCode("");
  }

  useEffect(() => () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
  }, []);

  if (!store) return <div className="text-center py-12 text-muted-foreground">ჯერ არ გაქვს დამტკიცებული მაღაზია.</div>;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-display text-2xl font-bold mb-4">QR სკანერი</h1>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="aspect-square bg-black grid place-items-center relative">
          {scanning ? (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          ) : (
            <div className="text-center text-white/60">
              <Camera className="w-12 h-12 mx-auto opacity-40" />
              <p className="text-sm mt-2">დააჭირე „კამერის ჩართვას"</p>
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
            <Camera className="w-4 h-4" /> {scanning ? "სკანირება…" : "კამერის ჩართვა"}
          </button>
        </div>
      </div>

      <div className="mt-4 bg-card rounded-2xl border border-border p-4">
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <Hash className="w-3 h-3" /> ან შეიყვანე კოდი ხელით
        </div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="flex-1 px-3 py-2.5 rounded-xl bg-muted/40 border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={() => handleCode(code)} disabled={!code} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50">
            ვალიდაცია
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
              <div>კოდი: <span className="font-mono font-bold">#{result.order.code}</span></div>
              <div>პროდუქტი: {result.order.title}</div>
              <div>თანხა: {formatGel(result.order.amount)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
