import { lazy, Suspense, useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { cityLabel, useCity } from "@/lib/city";
import { useI18n } from "@/lib/i18n";
import { useDeliveryAddress } from "@/lib/delivery-address";

const AddressPicker = lazy(() => import("@/components/address/AddressPicker"));

type Variant = "compact" | "block";

/**
 * The single location control used across the app (home header, profile).
 * Shows the confirmed delivery address when there is one, otherwise the city,
 * and opens the same address sheet in both cases.
 */
export function LocationChip({
  variant = "compact",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { language } = useI18n();
  const { city } = useCity();
  const { address, setAddress } = useDeliveryAddress();
  const [open, setOpen] = useState(false);

  const L = (ka: string, en: string, ru: string, tr: string, fa: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? tr : language === "fa" ? fa : ka;

  const label = address
    ? L("მიწოდება", "Delivery to", "Доставка", "Teslimat adresi", "تحویل به")
    : L("ქალაქი", "City", "Город", "Şehir", "شهر");
  const value = address ? address.addressLine : cityLabel(city, language);

  const trigger =
    variant === "compact" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        className="flex items-center gap-1.5 min-w-0 w-full press rounded-2xl focus-visible:outline-none"
      >
        <span className="w-9 h-9 rounded-full bg-primary/10 grid place-items-center shrink-0">
          <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-left">
          <span className="hidden sm:block text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
            {label}
          </span>
          <span className="text-sm font-bold leading-tight flex items-center gap-1 min-w-0">
            <span className="truncate">{value}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
          </span>
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        <span className="text-primary shrink-0"><MapPin className="w-4 h-4" aria-hidden="true" /></span>
        <span className="flex-1 min-w-0">
          <span className="block">{label}</span>
          <span className="block text-xs text-muted-foreground truncate">{value}</span>
        </span>
        <span className="text-muted-foreground">›</span>
      </button>
    );

  return (
    <div className={`relative ${className}`}>
      {trigger}
      {open && (
        <Suspense fallback={null}>
          <AddressPicker
            open
            showCitySwitch
            onClose={() => setOpen(false)}
            onSelect={(a) => {
              setAddress(a);
              setOpen(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
