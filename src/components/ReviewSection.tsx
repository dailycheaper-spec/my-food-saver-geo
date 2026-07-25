import { useState } from "react";
import { Star, ThumbsUp, RotateCcw } from "lucide-react";
import { useReviews, addReview } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function ReviewSection({ offerId, storeId }: { offerId: string; storeId: string }) {
  const { t } = useI18n();
  const reviews = useReviews(offerId);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [worthIt, setWorthIt] = useState(true);
  const [wouldBuyAgain, setWouldBuyAgain] = useState(true);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const worthPct = reviews.length ? Math.round((reviews.filter((r) => r.worthIt).length / reviews.length) * 100) : 0;
  const rebuyPct = reviews.length ? Math.round((reviews.filter((r) => r.wouldBuyAgain).length / reviews.length) * 100) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !author.trim()) return;
    addReview({ offerId, storeId, author: author.trim(), rating, text: text.trim(), worthIt, wouldBuyAgain });
    if (rating <= 2 || !worthIt) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("store_reports").insert({
            store_id: storeId, user_id: user.id, rating, worth_it: worthIt, reason: text.trim().slice(0, 500),
          });
        }
      } catch { /* non-blocking */ }
    }
    setText(""); setAuthor(""); setRating(5); setWorthIt(true); setWouldBuyAgain(true); setOpen(false);
  }

  return (
    <div className="mt-4 bg-card rounded-2xl shadow-card p-5 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{t("reviewsTitle")} ({reviews.length})</div>
          {reviews.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-accent text-accent" />
              <span className="font-semibold text-foreground">{avg.toFixed(1)}</span> / 5
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full"
        >
          {open ? t("closeBtn") : t("writeReviewBtn")}
        </button>
      </div>

      {reviews.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-success/10 text-success rounded-xl p-2.5 text-center">
            <ThumbsUp className="w-4 h-4 mx-auto" />
            <div className="text-lg font-bold mt-1">{worthPct}%</div>
            <div className="text-[10px] font-medium">{t("recommendPct")}</div>
          </div>
          <div className="bg-primary/10 text-primary rounded-xl p-2.5 text-center">
            <RotateCcw className="w-4 h-4 mx-auto" />
            <div className="text-lg font-bold mt-1">{rebuyPct}%</div>
            <div className="text-[10px] font-medium">{t("buyAgainPct")}</div>
          </div>
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border pt-4">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={t("yourName")}
            maxLength={40}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("qualityLbl")}</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`w-6 h-6 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("reviewPlaceholder")}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="grid grid-cols-2 gap-2">
            <Toggle label={t("recommendQ")} value={worthIt} onChange={setWorthIt} yesLabel={t("yes")} noLabel={t("no")} />
            <Toggle label={t("buyAgainQ")} value={wouldBuyAgain} onChange={setWouldBuyAgain} yesLabel={t("yes")} noLabel={t("no")} />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || !author.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {t("reviewSubmit")}
          </button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {reviews.length === 0 && !open && (
          <p className="text-sm text-muted-foreground text-center py-4">{t("reviewFirst")}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">{r.author}</div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
                ))}
              </div>
            </div>
            <p className="text-sm mt-1">{r.text}</p>
            <div className="flex gap-2 mt-2 text-[11px]">
              <span className={`px-2 py-0.5 rounded-full font-medium ${r.worthIt ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {r.worthIt ? t("recommendYes") : t("recommendNo")}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${r.wouldBuyAgain ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {r.wouldBuyAgain ? t("buyAgainYes") : t("buyAgainNo")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, yesLabel, noLabel }: { label: string; value: boolean; onChange: (v: boolean) => void; yesLabel: string; noLabel: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-2.5">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${value ? "bg-success text-success-foreground" : "bg-card border border-border"}`}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!value ? "bg-destructive text-destructive-foreground" : "bg-card border border-border"}`}
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}
