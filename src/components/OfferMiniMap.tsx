import { useState } from "react";
import { ExternalLink, Navigation } from "lucide-react";
import { DISTRICT_COORDS, TBILISI_CENTER, type Offer } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { formatDistanceLocalized } from "@/lib/geo";

function hashOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 255 - 0.5) * 0.012;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 0.012;
  return [dx, dy];
}

function offerCoords(o: Offer): [number, number] {
  if (o.lat != null && o.lng != null) return [o.lat, o.lng];
  const base = DISTRICT_COORDS[o.district] ?? TBILISI_CENTER;
  const [dx, dy] = hashOffset(o.id);
  return [base[0] + dx, base[1] + dy];
}

function osmEmbed([lat, lng]: [number, number]) {
  const d = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - d).toFixed(5)}%2C${(lat - d).toFixed(5)}%2C${(lng + d).toFixed(5)}%2C${(lat + d).toFixed(5)}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
}

function osmLink([lat, lng]: [number, number]) {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=16/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}

export function OfferMiniMap({ offer }: { offer: Offer }) {
  const { t, language } = useI18n();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const pos = offerCoords(offer);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="mt-4 bg-card rounded-2xl shadow-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="font-semibold">{t("map.locationOnMap")}</div>
        <div className="flex items-center gap-3">
          <button onClick={locate} className="text-xs font-medium text-primary hover:underline">
            📍 {t("map.myLocation")}
          </button>
          <a href={osmLink(pos)} target="_blank" rel="noreferrer" className="text-primary" aria-label={t("map.openInMap")}>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
      <div className="relative h-64 w-full bg-muted overflow-hidden">
        <iframe title={`${offer.storeName} — ${t("map.locationOnMap")}`} src={osmEmbed(pos)} className="h-full w-full border-0" loading="lazy" />
        {userPos && (
          <a
            href={osmLink(userPos)}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-elevated"
          >
            <Navigation className="h-3.5 w-3.5" /> {t("map.myLocation")}
          </a>
        )}
      </div>
      <div className="px-5 py-3 text-xs text-muted-foreground flex items-center justify-between">
        <span>{offer.address}, {offer.district}</span>
        <span>~{formatDistanceLocalized(offer.distanceKm, language)}</span>
      </div>
    </div>
  );
}
