import { useI18n } from "@/lib/i18n";

export function Logo({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-9 h-9 rounded-xl gradient-hero grid place-items-center shadow-soft">
        <span className="text-primary-foreground text-lg font-bold">C</span>
        <span className="absolute -top-1 -right-1 text-sm">🌿</span>
      </div>
      <div className="leading-tight">
        <div className="font-display font-bold text-lg tracking-tight">{t("brand")}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground -mt-0.5">{t("tagline")}</div>
      </div>
    </div>
  );
}
