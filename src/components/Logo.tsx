import { useI18n } from "@/lib/i18n";

/**
 * Official Cheaper brand lockup. Always rendered from the approved logo assets —
 * never re-created with text. Use `variant="light"` only on dark/green surfaces.
 */
export function Logo({
  className = "",
  compact = false,
  showTagline = false,
  variant = "brand",
}: {
  className?: string;
  /** Hides the wordmark on narrow screens to save horizontal space. */
  compact?: boolean;
  /** Shows the small tagline under the wordmark. Only where there's vertical room (footer, login). */
  showTagline?: boolean;
  /** "brand" = green logo (light backgrounds), "light" = white logo (dark backgrounds). */
  variant?: "brand" | "light";
}) {
  const { t } = useI18n();
  const mark = variant === "light" ? "/logo-mark-white.png" : "/logo-mark.png";
  const wordmark = variant === "light" ? "/logo-wordmark-white.png" : "/logo-wordmark.png";
  const markSize = compact ? "w-7 h-7" : "w-8 h-8";

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <img src={mark} alt={t("brand")} width={32} height={32} className={`${markSize} shrink-0 object-contain`} />
        <img
          src={wordmark}
          alt=""
          aria-hidden="true"
          className={`w-auto object-contain ${compact ? "h-5 hidden sm:block" : "h-5"}`}
        />
      </div>
      {showTagline && (
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("tagline")}</div>
      )}
    </div>
  );
}
