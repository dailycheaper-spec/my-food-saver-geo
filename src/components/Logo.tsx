import { useI18n } from "@/lib/i18n";

/**
 * Official Cheaper brand lockup — the single approved logo: white "C + discount
 * tag" mark and white "Cheaper" wordmark on the official brand green plate.
 * Because the logo carries its own green background it renders identically on
 * light and dark surfaces. Never re-create it with text.
 */
export function Logo({
  className = "",
  compact = false,
  showTagline = false,
}: {
  className?: string;
  /** Uses the square green tile (mark only) — for narrow screens / tight spots. */
  compact?: boolean;
  /** Shows the small tagline under the lockup. Only where there's vertical room. */
  showTagline?: boolean;
  /** @deprecated There is one official logo; kept so existing call sites keep compiling. */
  variant?: "brand" | "light";
}) {
  const { t } = useI18n();

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {compact ? (
        <>
          <img
            src="/logo-tile.png"
            alt={t("brand")}
            width={32}
            height={32}
            className="w-8 h-8 shrink-0 object-contain sm:hidden"
          />
          <img
            src="/logo-lockup.png"
            alt={t("brand")}
            width={94}
            height={36}
            className="h-9 w-auto shrink-0 object-contain hidden sm:block"
          />
        </>
      ) : (
        <img
          src="/logo-lockup.png"
          alt={t("brand")}
          width={104}
          height={40}
          className="h-10 w-auto shrink-0 object-contain"
        />
      )}
      {showTagline && (
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("tagline")}</div>
      )}
    </div>
  );
}
