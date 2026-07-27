import { Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  onClick: () => void;
  label?: string;
}

export default function LocationButton({ onClick, label }: Props) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-elevated grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={label ?? t("map.myLocation")}
    >
      <Navigation className="w-5 h-5" aria-hidden="true" />
    </button>
  );
}
