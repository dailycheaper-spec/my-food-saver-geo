import { useI18n } from "@/lib/i18n";

export function Logo({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Hides the wordmark text on narrow screens to save horizontal space. */
  compact?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.svg"
        alt={t("brand")}
        width={36}
        height={36}
        className="w-9 h-9 shrink-0 rounded-xl shadow-soft"
      />
      <div className={`leading-tight min-w-0 ${compact ? "hidden sm:block" : ""}`}>
        <div className="font-display font-bold text-lg tracking-tight truncate">{t("brand")}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground -mt-0.5 truncate">{t("tagline")}</div>
      </div>
    </div>
  );
}
