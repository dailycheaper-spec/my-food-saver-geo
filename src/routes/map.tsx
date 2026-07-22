import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, Navigation } from "lucide-react";
import { TBILISI_CENTER, formatPrice, getDistrictLabel, getOfferText, getStoreName, type Offer } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useLiveDbCardOffers } from "@/lib/db-adapter";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "რუკა — ახლომდებარე შემოთავაზებები | Cheaper" },
      { name: "description", content: "იხილე შემოთავაზებები რუკაზე, გაიგე ზუსტი მდებარეობა და მანძილი." },
    ],
  }),
  component: MapPage,
});

const MAP_BOUNDS = {
  north: 41.755,
  south: 41.665,
  west: 44.695,
  east: 44.885,
};

function toPercent([lat, lng]: [number, number]) {
  const x = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return {
    left: `${Math.min(94, Math.max(6, x))}%`,
    top: `${Math.min(90, Math.max(10, y))}%`,
  };
}

function osmLink([lat, lng]: [number, number]) {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=16/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}

function MapPage() {
  const { t, language } = useI18n();
  const { offers } = useLiveDbCardOffers();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only offers with real store coordinates can appear on the map.
  const mappable = useMemo(
    () => offers.filter((o): o is Offer & { lat: number; lng: number } => o.lat != null && o.lng != null),
    [offers],
  );

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => setUserPos(TBILISI_CENTER),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const selected = useMemo(() => mappable.find((o) => o.id === selectedId) ?? null, [selectedId, mappable]);

  return (
    <div className="fixed inset-0 top-0 bottom-16 flex flex-col bg-background">
      <div className="absolute top-0 inset-x-0 z-[1000] p-3 flex items-center justify-between gap-2 pointer-events-none">
        <Link to="/" className="pointer-events-auto w-10 h-10 rounded-full bg-card shadow-elevated grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="pointer-events-auto bg-card shadow-elevated rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" /> {t("mapView")} · {mappable.length} {t("offers")}
        </div>
        <button onClick={locate} className="pointer-events-auto w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-elevated grid place-items-center" aria-label={t("myLocation")}>
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]">
          <iframe
            title="თბილისის რუკა"
            src="https://www.openstreetmap.org/export/embed.html?bbox=44.695%2C41.665%2C44.885%2C41.755&layer=mapnik"
            className="h-full w-full border-0 opacity-70 grayscale-[15%]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/20 pointer-events-none" />
        </div>

        <div className="absolute inset-0 z-[500]">
          {userPos && (
            <a
              href={osmLink(userPos)}
              target="_blank"
              rel="noreferrer"
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary p-2 text-primary-foreground shadow-elevated ring-4 ring-primary/25"
              style={toPercent(userPos)}
              aria-label={t("myLocation")}
            >
              <Navigation className="h-4 w-4" />
            </a>
          )}
          {mappable.map((o) => {
            const coords: [number, number] = [o.lat, o.lng];
            const discount = o.originalPrice > 0 ? Math.round((1 - o.price / o.originalPrice) * 100) : 0;
            const isSel = selectedId === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedId(o.id)}
                className={`absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-xs font-bold shadow-elevated transition ${
                  isSel
                    ? "z-20 border-primary bg-primary text-primary-foreground scale-110"
                    : "z-10 border-primary bg-card text-primary hover:scale-105"
                }`}
                style={toPercent(coords)}
              >
                <span className="mr-1">{o.storeLogo}</span>{o.price.toFixed(0)} {t("currency")}
                {discount > 0 && <span className="opacity-70"> -{discount}%</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="absolute bottom-20 inset-x-3 z-[1000] bg-card rounded-2xl shadow-elevated p-3 flex gap-3 border border-border">
          <img src={selected.image} alt="" width={72} height={72} className="w-[72px] h-[72px] rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">
              {getStoreName(selected, language)}
              {selected.district ? ` · ${getDistrictLabel(selected.district, language)}` : ""}
            </div>
            <div className="font-semibold text-sm truncate">{getOfferText(selected, language).title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t("pickup")} {selected.pickupFrom}–{selected.pickupTo}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground line-through">{formatPrice(selected.originalPrice)}</span>
              <span className="text-base font-bold text-primary">{formatPrice(selected.price)}</span>
            </div>
          </div>
          <Link to="/offer/$id" params={{ id: selected.id }} className="self-center bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold">
            {t("buy")}
          </Link>
          <a
            href={osmLink([selected.lat, selected.lng])}
            target="_blank"
            rel="noreferrer"
            className="self-center border border-border bg-background px-3 py-2 rounded-xl text-xs font-bold"
            aria-label="გახსნა OpenStreetMap-ზე"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
