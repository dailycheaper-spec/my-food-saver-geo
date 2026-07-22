import { Layers } from "lucide-react";
import { useState } from "react";

export type MapLayerId = "standard" | "satellite" | "hybrid";

interface Option {
  id: MapLayerId;
  label: string;
}

const OPTIONS: Option[] = [
  { id: "standard", label: "სტანდარტული" },
  { id: "satellite", label: "სატელიტი" },
  { id: "hybrid", label: "ჰიბრიდი" },
];

interface Props {
  value: MapLayerId;
  onChange: (id: MapLayerId) => void;
}

export default function MapLayerSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.id === value) ?? OPTIONS[0];
  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 pl-3 pr-4 rounded-full bg-card shadow-elevated grid grid-flow-col items-center gap-2 text-xs font-semibold"
        aria-label="რუკის ფენა"
      >
        <Layers className="w-4 h-4 text-primary" />
        <span>{current.label}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[1500] cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 z-[1600] bg-card border border-border rounded-2xl shadow-elevated overflow-hidden min-w-[160px]">
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-secondary ${
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
