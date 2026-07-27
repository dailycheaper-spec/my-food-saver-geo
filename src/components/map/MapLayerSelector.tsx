import { Layers } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export type MapLayerId = "standard" | "satellite" | "hybrid";

interface Props {
  value: MapLayerId;
  onChange: (id: MapLayerId) => void;
}

export default function MapLayerSelector({ value, onChange }: Props) {
  const { t } = useI18n();
  const OPTIONS: { id: MapLayerId; label: string }[] = [
    { id: "standard", label: t("map.layer.standard") },
    { id: "satellite", label: t("map.layer.satellite") },
    { id: "hybrid", label: t("map.layer.hybrid") },
  ];
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];
  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 pl-3 pr-4 rounded-full bg-card shadow-elevated grid grid-flow-col items-center gap-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t("map.layer.aria").replace("{label}", current.label)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Layers className="w-4 h-4 text-primary" aria-hidden="true" />
        <span>{current.label}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1500] cursor-default"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label={t("map.layer.menu")}
            className="absolute right-0 mt-2 z-[1600] bg-card border border-border rounded-2xl shadow-elevated overflow-hidden min-w-[160px]"
          >
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={o.id === value}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-secondary focus:bg-secondary focus:outline-none ${
                  o.id === value ? "text-primary" : "text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
