interface Props {
  value: number;
  onChange: (v: number) => void;
}

const OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 კმ" },
  { value: 2, label: "2 კმ" },
  { value: 3, label: "3 კმ" },
  { value: 5, label: "5 კმ" },
  { value: 10, label: "10 კმ" },
  { value: 20, label: "20 კმ" },
  { value: 50, label: "მთელი ქალაქი" },
];

export function VisibilityRadiusSelector({ value, onChange }: Props) {
  const isCityWide = value >= 50;
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {isCityWide
          ? "თქვენი შეთავაზებები გამოჩნდება მთელი ქალაქის მასშტაბით."
          : `თქვენი შეთავაზებები გამოჩნდება მომხმარებლებისთვის მაქსიმუმ ${value} კმ-ის რადიუსში.`}
      </p>
    </div>
  );
}

export default VisibilityRadiusSelector;
