import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles, Mic, MicOff, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { parseOfferText } from "@/lib/ai-offer.functions";
import { useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partner/ai")({
  head: () => ({ meta: [{ title: "AI Mode — Cheaper" }] }),
  component: AiOfferPage,
});

type Draft = {
  title: string;
  description: string;
  category: string;
  quantity_available: number;
  discounted_price: number;
  original_price: number;
  pickup_from: string;
  pickup_to: string;
};

function AiOfferPage() {
  const { t } = useI18n();
  const { stores, loading: storesLoading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const navigate = useNavigate();
  const parse = useServerFn(parseOfferText);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function runParse() {
    if (!text.trim()) return;
    setLoading(true); setDraft(null);
    try {
      const r = (await parse({ data: { text } })) as Draft;
      setDraft(r);
    } catch (e: any) {
      toast.error("AI: " + e.message);
    }
    setLoading(false);
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error(t("unsupported")); return; }
    if (listening) { setListening(false); return; }
    const rec = new SR();
    rec.lang = "ka-GE";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setText((prev) => (prev ? prev + " " : "") + t);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  async function publish() {
    if (!store || !draft) return;
    setPublishing(true);
    const { error } = await supabase.from("offers").insert({
      store_id: store.id,
      title: draft.title,
      description: draft.description ?? "",
      category: draft.category ?? "meal",
      original_price: Number(draft.original_price),
      discounted_price: Number(draft.discounted_price),
      quantity_available: Number(draft.quantity_available),
      pickup_from: draft.pickup_from ?? "18:00",
      pickup_to: draft.pickup_to ?? "21:00",
      is_active: true,
    });
    setPublishing(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/partner/offers" });
  }

  if (storesLoading) return <div className="text-center py-12 text-muted-foreground">{t("loading")}</div>;
  if (!store) return <div className="text-center py-12 text-muted-foreground">{t("noApprovedStore")}</div>;

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={() => navigate({ to: "/partner" })} className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft className="w-4 h-4" /> {t("back")}
      </button>

      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> {t("aiMode")}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t("aiIntro")}</p>

      <div className="bg-card rounded-3xl border border-border p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("aiExample")}
          rows={4}
          className="w-full bg-transparent resize-none focus:outline-none text-sm"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <button
            onClick={toggleMic}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted"}`}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {listening ? t("listening") : t("voice")}
          </button>
          <button
            onClick={runParse}
            disabled={!text.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t("analyzing") : t("runAi")}
          </button>
        </div>
      </div>

      {draft && (
        <div className="mt-5 bg-card rounded-3xl border-2 border-primary/30 p-5 space-y-3">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">{t("aiResult")}</div>
          <Row k={t("name")} v={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
          <Row k={t("description")} v={draft.description ?? ""} onChange={(v) => setDraft({ ...draft, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Row k={t("quantityAvailable")} v={String(draft.quantity_available)} onChange={(v) => setDraft({ ...draft, quantity_available: Number(v) })} type="number" />
            <Row k={t("discountedPrice")} v={String(draft.discounted_price)} onChange={(v) => setDraft({ ...draft, discounted_price: Number(v) })} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Row k={t("pickupEnd")} v={draft.pickup_to} onChange={(v) => setDraft({ ...draft, pickup_to: v })} type="time" />
            <Row k={t("originalPrice")} v={String(draft.original_price)} onChange={(v) => setDraft({ ...draft, original_price: Number(v) })} type="number" />
          </div>
          <button onClick={publish} disabled={publishing} className="mt-2 w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg disabled:opacity-50">
            {publishing ? t("creating") : `✅ ${t("approvePublish")}`}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ k, v, onChange, type = "text" }: { k: string; v: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{k}</div>
      <input type={type} value={v} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm" />
    </label>
  );
}
