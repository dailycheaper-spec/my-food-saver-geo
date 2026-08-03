import { useState } from "react";
import { History, X } from "lucide-react";
import { useAuditLog, formatGel } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const ACTION_LABELS: Record<string, string> = {
  original_price_changed: "auditAction_originalPrice",
  discounted_price_changed: "auditAction_discountedPrice",
  quantity_changed: "auditAction_quantity",
};

function formatValue(action: string, value: string | null): string {
  if (value === null) return "—";
  if (action === "original_price_changed" || action === "discounted_price_changed") {
    const n = Number(value);
    return Number.isFinite(n) ? formatGel(n) : value;
  }
  return value;
}

export function AuditLogButton({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1" aria-label={t("auditLogTitle")}>
        <History className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && <AuditLogPanel entityType={entityType} entityId={entityId} onClose={() => setOpen(false)} />}
    </>
  );
}

function AuditLogPanel({ entityType, entityId, onClose }: { entityType: string; entityId: string; onClose: () => void }) {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { entries, loading } = useAuditLog(entityType, entityId);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[85dvh] flex flex-col overscroll-contain pb-safe shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-display text-lg font-bold">{t("auditLogTitle")}</h3>
          <button onClick={onClose} aria-label={t("close")}><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto -mx-5 px-5 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("loading")}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("auditLogEmpty")}</p>
          ) : (
            entries.map((e) => {
              const label = ACTION_LABELS[e.action] ? t(ACTION_LABELS[e.action]) : e.action;
              const who = e.actor_id === user?.id ? t("auditLogYou") : e.actor_id ? `${e.actor_id.slice(0, 8)}…` : "—";
              const time = new Date(e.created_at).toLocaleString(
                language === "en" ? "en-GB" : language === "ru" ? "ru-RU" : "ka-GE",
                { dateStyle: "short", timeStyle: "short" },
              );
              return (
                <div key={e.id} className="p-3 rounded-2xl bg-muted/40">
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-sm mt-0.5">
                    <span className="line-through text-muted-foreground">{formatValue(e.action, e.old_value)}</span>
                    {" → "}
                    <span className="font-semibold text-primary">{formatValue(e.action, e.new_value)}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{who} · {time}</div>
                </div>
              );
            })
          )}
        </div>

        <button onClick={onClose} className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold shrink-0">
          {t("close")}
        </button>
      </div>
    </div>
  );
}
