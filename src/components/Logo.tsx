import { useI18n } from "@/lib/i18n";

export function Logo({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.svg"
        alt={t("brand")}
        width={36}
        height={36}
        className="w-9 h-9 rounded-xl shadow-soft"
      />
      <div className="leading-tight">
        <div className="font-display font-bold text-lg tracking-tight">{t("brand")}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground -mt-0.5">{t("tagline")}</div>
      </div>
    </div>
  );
}
