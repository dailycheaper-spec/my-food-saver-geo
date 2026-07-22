import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { ArrowLeft, ExternalLink, MapPin, Navigation } from "lucide-react";
import { TBILISI_CENTER, formatPrice, getDistrictLabel, getOfferText, getStoreName, type Offer } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { useUserLocation } from "@/hooks/use-user-location";
import { calculateDistanceKm, formatDistance, isValidLatLng } from "@/lib/geo";
import { CustomerRadiusFilter, type RadiusOption } from "@/components/CustomerRadiusFilter";

const MapCanvas = lazy(() => import("@/components/MapCanvas"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "რუკა — ახლომდებარე შემოთავაზებები | Cheaper" },
      { name: "description", content: "იხილე შემოთავაზებები რუკაზე, გაიგე ზუსტი მდებარეობა და მანძილი." },
    ],
  }),
  component: MapPage,
});

const PARTNER_DEFAULT_RADIUS = 3;

export type MarkerState = "available" | "almost" | "unavailable";

export interface MapOffer extends Offer {
  lat: number;
  lng: number;
  _distanceKm: number | null;
  _state: MarkerState;
}

function externalDirectionsUrl(lat: number, lng: number) {
  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)/.test(navigator.userAgent);
  if (isIOS) return `https://maps.apple.com/?daddr=${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function MapPage() {
  const { t, language } = useI18n();
  const { offers } = useLiveDbCardOffers();
  const { location, status, askPermission, request } = useUserLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [radius, setRadius] = useState<RadiusOption>(5);
  const [effectiveRadius, setEffectiveRadius] = useState<RadiusOption>(5);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const mappable = useMemo<MapOffer[]>(() => {
    const out: MapOffer[] = [];
    for (const o of offers) {
      if (!isValidLatLng(o.lat, o.lng)) continue;
      const partnerRadius = o.visibilityRadiusKm ?? PARTNER_DEFAULT_RADIUS;
      const d = location ? calculateDistanceKm(location.lat, location.lng, o.lat as number, o.lng as number) : null;
      if (location && d !== null) {
        if (d > partnerRadius) continue;
        if (d > effectiveRadius) continue;
      }
      let state: MarkerState = "available";
      if (o.itemsLeft <= 0) state = "unavailable";
      else if (o.itemsLeft <= 2) state = "almost";
      if (state === "unavailable" && !showUnavailable) continue;
      out.push({ ...(o as Offer & { lat: number; lng: number }), _distanceKm: d, _state: state });
    }
    if (location) out.sort((a, b) => (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity));
    return out;
  }, [offers, location, effectiveRadius, showUnavailable]);

  const selected = useMemo(() => mappable.find((o) => o.id === selectedId) ?? null, [selectedId, mappable]);

  const askOrRefresh = () => {
    if (status === "granted") void request();
    else askPermission();
  };

  return (
    <div className="fixed inset-0 top-0 bottom-16 flex flex-col bg-background">
      <div className="absolute top-0 inset-x-0 z-[1000] p-3 flex items-center justify-between gap-2 pointer-events-none">
        <Link to="/" className="pointer-events-auto w-10 h-10 rounded-full bg-card shadow-elevated grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="pointer-events-auto bg-card shadow-elevated rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" /> {t("mapView")} · {mappable.length} {t("offers")}
        </div>
        <button
          onClick={askOrRefresh}
          className="pointer-events-auto w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-elevated grid place-items-center"
          aria-label={t("myLocation")}
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Radius + unavailable toggle */}
      <div className="absolute top-16 inset-x-0 z-[1000] px-3 pointer-events-none">
        <div className="pointer-events-auto bg-card shadow-elevated rounded-2xl p-2 flex items-center gap-2 overflow-x-auto">
          <CustomerRadiusFilter value={radius} onChange={setRadius} onDebouncedChange={setEffectiveRadius} />
          <label className="ml-auto shrink-0 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 pr-1">
            <input
              type="checkbox"
              checked={showUnavailable}
              onChange={(e) => setShowUnavailable(e.target.checked)}
              className="accent-primary"
            />
            მიუწვდომელი
          </label>
        </div>
      </div>

      <div className="flex-1 relative">
        {!location && status !== "prompting" && (
          <div className="absolute inset-x-4 top-32 z-[1000] bg-card border border-border rounded-3xl p-4 shadow-elevated">
            <p className="text-sm font-semibold">გაიგე, რა შემოთავაზებებია შენს ახლოს</p>
            <p className="mt-1 text-xs text-muted-foreground">
              ჩართეთ მდებარეობა, რათა გაჩვენოთ თქვენთან ახლოს არსებული შეთავაზებები.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={askPermission}
                className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold press"
              >
                მდებარეობის ჩართვა
              </button>
              {status === "denied" && (
                <button
                  type="button"
                  onClick={() => void request()}
                  className="h-10 px-4 rounded-full bg-secondary text-foreground text-xs font-semibold press"
                >
                  ხელახლა
                </button>
              )}
            </div>
          </div>
        )}

        {mounted && (
          <Suspense fallback={<div className="h-full w-full grid place-items-center text-sm text-muted-foreground">რუკა იტვირთება…</div>}>
            <MapCanvas
              center={location ? [location.lat, location.lng] : TBILISI_CENTER}
              userPos={location ? [location.lat, location.lng] : null}
              offers={mappable}
              language={language}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
            />
          </Suspense>
        )}

        {location && mappable.length === 0 && (
          <div className="absolute inset-x-4 bottom-24 z-[1000] bg-card border border-border rounded-3xl p-4 text-center shadow-elevated">
            <p className="text-sm text-muted-foreground">
              ამ რადიუსში აქტიური შეთავაზებები ვერ მოიძებნა.
            </p>
            <button
              type="button"
              onClick={() => {
                const next = (radius === 1 ? 3 : radius === 3 ? 5 : radius === 5 ? 10 : 20) as RadiusOption;
                setRadius(next);
                setEffectiveRadius(next);
              }}
              className="mt-2 inline-flex h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold press"
            >
              რადიუსის გაზრდა
            </button>
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute bottom-20 inset-x-3 z-[1000] bg-card rounded-2xl shadow-elevated p-3 flex gap-3 border border-border">
          <img src={selected.image} alt="" width={72} height={72} className="w-[72px] h-[72px] rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
              <span className="text-base leading-none">{selected.storeLogo || "🏪"}</span>
              <span className="truncate">{getStoreName(selected, language)}</span>
              {selected.district ? <span>· {getDistrictLabel(selected.district, language)}</span> : null}
            </div>
            <div className="font-semibold text-sm truncate">{getOfferText(selected, language).title}</div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <span>{t("pickup")} {selected.pickupFrom}–{selected.pickupTo}</span>
              {selected._distanceKm != null && (
                <span className="inline-flex items-center gap-0.5 text-primary font-semibold">
                  · <Navigation className="w-3 h-3" /> {formatDistance(selected._distanceKm)}
                </span>
              )}
              <span>· {selected.itemsLeft} დარჩა</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground line-through">{formatPrice(selected.originalPrice)}</span>
              <span className="text-base font-bold text-primary">{formatPrice(selected.price)}</span>
              {selected.originalPrice > 0 && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  -{Math.round((1 - selected.price / selected.originalPrice) * 100)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 self-center">
            <Link
              to="/offer/$id"
              params={{ id: selected.id }}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-[11px] font-bold text-center"
            >
              შეთავაზების ნახვა
            </Link>
            <a
              href={externalDirectionsUrl(selected.lat, selected.lng)}
              target="_blank"
              rel="noreferrer"
              className="border border-border bg-background px-3 py-1.5 rounded-xl text-[11px] font-bold text-center inline-flex items-center justify-center gap-1"
            >
              <ExternalLink className="h-3 w-3" /> მარშრუტი
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
