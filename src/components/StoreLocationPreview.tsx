import { evaluateStoreLocation } from "@/lib/geo";

interface Props {
  lat: number | null | undefined;
  lng: number | null | undefined;
  height?: number;
}

function osmEmbed(lat: number, lng: number) {
  const d = 0.008;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - d).toFixed(5)}%2C${(lat - d).toFixed(5)}%2C${(lng + d).toFixed(5)}%2C${(lat + d).toFixed(5)}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
}

export function StoreLocationPreview({ lat, lng, height = 140 }: Props) {
  const status = evaluateStoreLocation(lat, lng);
  if (status !== "ok" || lat == null || lng == null) {
    return (
      <div
        className="rounded-2xl bg-muted/40 border border-dashed border-border grid place-items-center text-xs text-muted-foreground"
        style={{ height }}
      >
        {status === "invalid" ? "კოორდინატები არასწორია" : "მდებარეობა არ არის მითითებული"}
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-muted" style={{ height }}>
      <iframe
        title="store-location-preview"
        src={osmEmbed(lat, lng)}
        className="w-full h-full border-0"
        loading="lazy"
      />
    </div>
  );
}

export default StoreLocationPreview;
