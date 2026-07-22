import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { ArrowLeft, ExternalLink, MapPin, Navigation, X } from "lucide-react";
import { TBILISI_CENTER, formatPrice, getDistrictLabel, getOfferText, type Offer } from "@/lib/mock-data";
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

export interface MapStore {
  storeId: string;
  storeName: string;
  storeLogo: string;
  lat: number;
  lng: number;
  district: string;
  distanceKm: number | null;
  offers: MapOffer[];
  activeCount: number;
  minPrice: number;
  hasAlmost: boolean;
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
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
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
    return out;
  }, [offers, location, effectiveRadius, showUnavailable]);

  const stores = useMemo<MapStore[]>(() => {
    const map = new Map<string, MapStore>();
    for (const o of mappable) {
      const existing = map.get(o.storeId);
      if (existing) {
        existing.offers.push(o);
      } else {
        map.set(o.storeId, {
          storeId: o.storeId,
          storeName: o.storeName,
          storeLogo: o.storeLogo,
          lat: o.lat,
          lng: o.lng,
          district: o.district,
          distanceKm: o._distanceKm,
          offers: [o],
          activeCount: 0,
          minPrice: 0,
          hasAlmost: false,
        });
      }
    }
    const list: MapStore[] = [];
    for (const s of map.values()) {
      const active = s.offers.filter((o) => o._state !== "unavailable");
      s.activeCount = active.length;
      s.minPrice = active.length > 0 ? Math.min(...active.map((o) => o.price)) : 0;
      s.hasAlmost = active.some((o) => o._state === "almost");
      // Sort offers: available → almost → unavailable, then by price
      s.offers.sort((a, b) => {
        const order = { available: 0, almost: 1, unavailable: 2 };
        return order[a._state] - order[b._state] || a.price - b.price;
      });
      list.push(s);
    }
    if (location) list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return list;
  }, [mappable, location]);

  const selectedStore = useMemo(
    () => stores.find((s) => s.storeId === selectedStoreId) ?? null,
    [selectedStoreId, stores],
  );

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
          <MapPin className="w-4 h-4 text-primary" /> {t("mapView")} · {stores.length}
        </div>
        <button
          onClick={askOrRefresh}
          className="pointer-events-auto w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-elevated grid place-items-center"
          aria-label={t("myLocation")}
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

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
              stores={stores}
              selectedId={selectedStoreId}
              hoveredId={hoveredId}
              onSelect={setSelectedStoreId}
              onHover={setHoveredId}
            />
          </Suspense>
        )}

        {location && stores.length === 0 && (
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

      {selectedStore && (
        <div className="absolute bottom-20 inset-x-3 z-[1000] bg-card rounded-2xl shadow-elevated border border-border max-h-[60vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 flex items-start gap-3 border-b border-border">
            <div className="w-12 h-12 rounded-xl bg-secondary grid place-items-center text-2xl shrink-0 overflow-hidden">
              {/^(https?:|\/|data:)/.test(selectedStore.storeLogo) ? (
                <img src={selectedStore.storeLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{selectedStore.storeLogo || "🏪"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                to="/store/$id"
                params={{ id: selectedStore.storeId }}
                className="font-bold text-sm truncate block hover:text-primary"
              >
                {selectedStore.storeName}
              </Link>
              <div className="text-xs text-muted-foreground mt-0.5">
                {selectedStore.activeCount > 0 ? (
                  <>
                    {selectedStore.activeCount} აქტიური შეთავაზება
                    {" · "}
                    <span className="font-semibold text-primary">
                      ფასები {formatPrice(selectedStore.minPrice)}-დან
                    </span>
                  </>
                ) : (
                  <span>ამჟამად მიუწვდომელი</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {selectedStore.district && <span>{getDistrictLabel(selectedStore.district, language)}</span>}
                {selectedStore.distanceKm != null && (
                  <span className="inline-flex items-center gap-0.5 text-primary font-semibold">
                    · <Navigation className="w-3 h-3" /> {formatDistance(selectedStore.distanceKm)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <a
                href={externalDirectionsUrl(selectedStore.lat, selectedStore.lng)}
                target="_blank"
                rel="noreferrer"
                className="border border-border bg-background px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center inline-flex items-center justify-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> მარშრუტი
              </a>
              <button
                type="button"
                onClick={() => setSelectedStoreId(null)}
                className="border border-border bg-background px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1"
                aria-label="დახურვა"
              >
                <X className="h-3 w-3" /> დახურვა
              </button>
            </div>
          </div>

          {/* Offers list */}
          <div className="overflow-y-auto p-2 space-y-2">
            {selectedStore.offers.map((o) => {
              const discount = o.originalPrice > 0 ? Math.round((1 - o.price / o.originalPrice) * 100) : 0;
              const unavailable = o._state === "unavailable";
              return (
                <Link
                  key={o.id}
                  to="/offer/$id"
                  params={{ id: o.id }}
                  className={`flex gap-3 p-2 rounded-xl border border-border bg-background hover:bg-secondary transition-colors ${unavailable ? "opacity-60" : ""}`}
                >
                  <img src={o.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{getOfferText(o, language).title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {t("pickup")} {o.pickupFrom}–{o.pickupTo}
                      {" · "}
                      {unavailable ? "ამოწურულია" : `${o.itemsLeft} დარჩა`}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {o.originalPrice > 0 && (
                        <span className="text-[11px] text-muted-foreground line-through">
                          {formatPrice(o.originalPrice)}
                        </span>
                      )}
                      <span className="text-sm font-bold text-primary">{formatPrice(o.price)}</span>
                      {discount > 0 && !unavailable && (
                        <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      )}
                      {o._state === "almost" && (
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full">
                          ⏳ თითქმის გათავდა
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
