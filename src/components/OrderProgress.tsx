import { Check, Clock, ChefHat, PackageCheck, ShoppingBag, X } from "lucide-react";
import type { Order } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

export type OrderStage =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export function stageOfOrder(o: Order): OrderStage {
  if (o.status === "გაუქმებული") return "cancelled";
  if (o.status === "მიღებული" || o.status === "გაჩუქებული") return "completed";
  // booked → derive from time
  const elapsedMin = (Date.now() - o.createdAt) / 60000;
  const [ph, pm] = o.pickupFrom.split(":").map(Number);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const pickupMin = (ph || 0) * 60 + (pm || 0);
  if (nowMin >= pickupMin) return "ready";
  if (elapsedMin < 3) return "pending";
  if (elapsedMin < 8) return "confirmed";
  return "preparing";
}

export function useStageLabel(): (s: OrderStage) => string {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) =>
    language === "en" ? en : language === "ru" ? ru : ka;
  return (s) => {
    switch (s) {
      case "pending": return L("მოლოდინში", "Pending", "В ожидании");
      case "confirmed": return L("დადასტურდა", "Confirmed", "Подтверждено");
      case "preparing": return L("მზადდება", "Preparing", "Готовится");
      case "ready": return L("მზადაა აღებისთვის", "Ready for pickup", "Готово к выдаче");
      case "completed": return L("დასრულებული", "Completed", "Завершено");
      case "cancelled": return L("გაუქმებული", "Cancelled", "Отменено");
    }
  };
}

const STAGES: OrderStage[] = ["pending", "confirmed", "preparing", "ready", "completed"];
const ICONS: Record<OrderStage, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: Check,
  preparing: ChefHat,
  ready: PackageCheck,
  completed: ShoppingBag,
  cancelled: X,
};

export function OrderProgress({ order }: { order: Order }) {
  const stage = stageOfOrder(order);
  const label = useStageLabel();

  if (stage === "cancelled") {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive p-4 flex items-center gap-3">
        <X className="w-5 h-5" />
        <span className="font-semibold">{label("cancelled")}</span>
      </div>
    );
  }

  const currentIdx = STAGES.indexOf(stage);

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="grid grid-cols-5 gap-1">
        {STAGES.map((s, i) => {
          const Icon = ICONS[s];
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s} className="flex flex-col items-center gap-1.5 relative">
              {i > 0 && (
                <div
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${
                    done || active ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div
                className={`relative z-10 grid place-items-center w-8 h-8 rounded-full transition-colors ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div
                className={`text-[9px] font-semibold text-center leading-tight ${
                  active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground"
                }`}
              >
                {label(s)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
