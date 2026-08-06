import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useNotifications, type AppNotification } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";

function timeAgo(iso: string, language: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return language === "en" ? "now" : language === "ru" ? "сейчас" : "ახლა";
  if (mins < 60) return `${mins} ${language === "en" ? "min" : language === "ru" ? "мин" : "წთ"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${language === "en" ? "h" : language === "ru" ? "ч" : "სთ"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${language === "en" ? "d" : language === "ru" ? "дн" : "დღ"}`;
}

export function NotificationBell({ userId, buttonClassName, iconClassName, onOpen }: { userId: string | null; buttonClassName?: string; iconClassName?: string; onOpen?: () => void }) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { items, unreadCount, markRead, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  function onItemClick(n: AppNotification) {
    if (!n.read_at) void markRead(n.id);
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); onOpen?.(); }}
        aria-label={t("notificationsTitle")}
        className={buttonClassName ?? "relative tap-target w-11 h-11 rounded-full bg-card border border-border grid place-items-center press focus-visible:outline-none"}
      >
        <Bell className={iconClassName ?? "w-[18px] h-[18px]"} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-5 max-h-[85dvh] flex flex-col overscroll-contain pb-safe shadow-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="font-display text-lg font-bold">{t("notificationsTitle")}</h3>
              {unreadCount > 0 && (
                <button onClick={() => void markAllRead()} className="text-xs font-semibold text-primary flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t("notifMarkAllRead")}
                </button>
              )}
            </div>

            <div className="overflow-y-auto -mx-5 px-5 space-y-1">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t("notifEmpty")}</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onItemClick(n)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl transition-colors ${n.read_at ? "" : "bg-primary/5"}`}
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{n.title}</span>
                      {n.body && <span className="block text-xs text-muted-foreground truncate">{n.body}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at, language)}</span>
                  </button>
                ))
              )}
            </div>

            <button onClick={() => setOpen(false)} className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold shrink-0">
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
