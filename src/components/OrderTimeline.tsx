import { Check } from "lucide-react";
import { useOrderStatusHistory } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

const STATUS_KEYS: Record<string, string> = {
  pending: "orderStatus_pending",
  paid: "orderStatus_paid",
  ready: "orderStatus_ready",
  collected: "orderStatus_collected",
  gifted: "orderStatus_gifted",
  cancelled: "orderStatus_cancelled",
};

export function OrderTimeline({ orderId, method }: { orderId: string; method?: "pickup" | "delivery" }) {
  const { t, language } = useI18n();
  const { events, loading } = useOrderStatusHistory(orderId);

  if (loading || events.length === 0) return null;

  return (
    <div className="mt-4 bg-card rounded-2xl border border-border shadow-card p-4 sm:p-5">
      <h3 className="font-semibold mb-3">{t("activityTimeline")}</h3>
      <div className="space-y-0">
        {events.map((e, i) => {
          const isLast = i === events.length - 1;
          const label = e.status === "ready" && method === "delivery"
            ? t("orderStatus_ready_delivery")
            : STATUS_KEYS[e.status] ? t(STATUS_KEYS[e.status]) : e.status;
          const time = new Date(e.changed_at).toLocaleString(
            language === "en" ? "en-GB" : language === "ru" ? "ru-RU" : "ka-GE",
            { dateStyle: "short", timeStyle: "short" },
          );
          return (
            <div key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                {!isLast && <span className="w-0.5 flex-1 bg-border my-0.5" />}
              </div>
              <div className={`pb-4 ${isLast ? "" : ""}`}>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
