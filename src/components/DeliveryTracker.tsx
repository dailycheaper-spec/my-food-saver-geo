import { useDeliveryForOrder } from "@/lib/delivery/hooks";
import { providerBadge } from "@/lib/delivery/registry";
import type { DeliveryProviderId } from "@/lib/delivery/types";
import { useI18n } from "@/lib/i18n";
import { formatGel } from "@/lib/db";
import { Bike, CheckCircle2, Clock, MapPin, Phone } from "lucide-react";

const STATUS_STEPS = ["pending", "assigned", "picked_up", "on_the_way", "delivered"] as const;

export function DeliveryTracker({ orderId }: { orderId: string }) {
  const { t } = useI18n();
  const delivery = useDeliveryForOrder(orderId);
  if (!delivery) return null;

  const badge = providerBadge(delivery.provider as DeliveryProviderId);
  const stepIndex = STATUS_STEPS.indexOf(delivery.status as typeof STATUS_STEPS[number]);
  const isFailed = delivery.status === "failed" || delivery.status === "cancelled";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{badge.icon}</span>
          <div>
            <div className="font-display font-bold text-sm">{t("deliveryTracking")}</div>
            <div className="text-xs text-muted-foreground">{badge.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-primary text-sm">{formatGel(Number(delivery.fee))}</div>
          {delivery.estimated_delivery_at && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" />
              {new Date(delivery.estimated_delivery_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
            </div>
          )}
        </div>
      </div>

      {!isFailed ? (
        <div className="flex items-center gap-1 mb-3">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      ) : (
        <div className="mb-3 py-1.5 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
          {t(delivery.status === "cancelled" ? "cancelled" : "deliveryFailed")}
        </div>
      )}

      <div className="text-xs font-semibold mb-2 flex items-center gap-1">
        {delivery.status === "delivered" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Bike className="w-3.5 h-3.5 text-primary" />}
        {t(`deliveryStatus_${delivery.status}`)}
      </div>

      {delivery.courier_name && (
        <div className="flex items-center justify-between text-xs bg-muted/50 rounded-xl p-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 grid place-items-center">🧑‍🍳</div>
            <div>
              <div className="font-semibold">{delivery.courier_name}</div>
              <div className="text-[10px] text-muted-foreground">{t("courier")}</div>
            </div>
          </div>
          {delivery.courier_phone && (
            <a href={`tel:${delivery.courier_phone}`} className="p-2 rounded-full bg-primary text-primary-foreground">
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {delivery.dropoff_address && (
        <div className="mt-2 text-[11px] text-muted-foreground flex items-start gap-1">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{delivery.dropoff_address}</span>
        </div>
      )}
    </div>
  );
}
