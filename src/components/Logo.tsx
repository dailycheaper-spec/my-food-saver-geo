import { useI18n } from "@/lib/i18n";

/**
 * Official Cheaper brand lockup. Always rendered from the approved logo assets —
 * never re-created with text. Use `variant="light"` only on dark/green surfaces.
 */
export function Logo({
  className = "",
  compact = false,
  variant = "brand",
}: {
  className?: string;
  /** Hides the wordmark on narrow screens to save horizontal space. */
  compact?: boolean;
  /** "brand" = green logo (light backgrounds), "light" = white logo (dark backgrounds). */
  variant?: "brand" | "light";
}) {
  const { t } = useI18n();
  const mark = variant === "light" ? "/logo-mark-white.png" : "/logo-mark.png";
  const wordmark = variant === "light" ? "/logo-wordmark-white.png" : "/logo-wordmark.png";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={mark} alt={t("brand")} width={36} height={36} className="w-9 h-9 shrink-0 object-contain" />
      <img
        src={wordmark}
        alt=""
        aria-hidden="true"
        className={`h-6 w-auto object-contain ${compact ? "hidden sm:block" : ""}`}
      />
    </div>
  );
}
