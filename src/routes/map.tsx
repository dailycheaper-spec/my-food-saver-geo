import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, MapPin, Navigation } from "lucide-react";
import { TBILISI_CENTER, formatPrice, getDistrictLabel, getOfferText, getStoreName, type Offer } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "რუკა — ახლომდებარე შემოთავაზებები | Cheaper" },
      { name: "description", content: "იხილე შემოთავაზებები რუკაზე, გაიგე ზუსტი მდებარეობა და მანძილი." },
    ],
  }),
  component: MapPage,
});

function osmLink([lat, lng]: [number, number]) {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lng.toFixed(5)}#map=16/${lat.toFixed(5)}/${lng.toFixed(5)}`;
}

function priceIcon(o: Offer, selected: boolean) {
  const discount = o.originalPrice > 0 ? Math.round((1 - o.price / o.originalPrice) * 100) : 0;
  const bg = selected ? "hsl(var(--primary))" : "hsl(var(--card))";
  const fg = selected ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))";
  const html = `<div style="transform:translate(-50%,-100%);white-space:nowrap;border:2px solid hsl(var(--primary));background:${bg};color:${fg};padding:4px 10px;border-radius:9999px;font-weight:700;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,.2)"><span style="margin-right:4px">${o.storeLogo}</span>${o.price.toFixed(0)}${discount > 0 ? ` <span style="opacity:.7">-${discount}%</span>` : ""}</div>`;
  return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

function RecenterOn({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 14));
  }, [pos, map]);
  return null;
}

function MapPage() {
  const { t, language } = useI18n();
  const { offers } = useLiveDbCardOffers();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
        {mounted && (
          <MapContainer
            center={TBILISI_CENTER}
            zoom={12}
            scrollWheelZoom
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterOn pos={userPos} />
            {userPos && (
              <Marker
                position={userPos}
                icon={L.divIcon({
                  html: `<div style="transform:translate(-50%,-50%);width:16px;height:16px;border-radius:9999px;background:hsl(var(--primary));box-shadow:0 0 0 6px hsl(var(--primary)/.25)"></div>`,
                  className: "",
                  iconSize: [0, 0],
                })}
              />
            )}
            {mappable.map((o) => (
              <Marker
                key={o.id}
                position={[o.lat, o.lng]}
                icon={priceIcon(o, selectedId === o.id)}
                eventHandlers={{ click: () => setSelectedId(o.id) }}
              >
                <Popup>
                  <div className="text-xs font-semibold">{getStoreName(o, language)}</div>
                  <div className="text-xs">{getOfferText(o, language).title}</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
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
