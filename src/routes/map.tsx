import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { ArrowLeft, ExternalLink, MapPin, Navigation, X, Search as SearchIcon, SlidersHorizontal, Percent, Clock, Sparkles, Heart, CheckCircle2 } from "lucide-react";
import { TBILISI_CENTER, DISTRICTS, formatPrice, getDistrictLabel, getOfferText, type Offer } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { useUserLocation } from "@/hooks/use-user-location";
import { calculateDistanceKm, formatDistance, isValidLatLng } from "@/lib/geo";
import { CustomerRadiusFilter, type RadiusOption } from "@/components/CustomerRadiusFilter";
import LocationButton from "@/components/map/LocationButton";
import { useFavorites } from "@/lib/storage";

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

type SortMode = "nearby" | "discount" | "endingSoon";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function isOpenNow(o: Offer): boolean {
  const now = new Date();
  const n = now.getHours() * 60 + now.getMinutes();
  return n >= timeToMinutes(o.pickupFrom) && n <= timeToMinutes(o.pickupTo);
}
const NEW_PARTNER_MS = 7 * 24 * 60 * 60 * 1000;

function MapPage() {
  const { t, language } = useI18n();
  const { offers } = useLiveDbCardOffers();
  const { location, status, askPermission, request } = useUserLocation();
  const favorites = useFavorites();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [radius, setRadius] = useState<RadiusOption>(5);
  const [effectiveRadius, setEffectiveRadius] = useState<RadiusOption>(5);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("nearby");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [newPartnersOnly, setNewPartnersOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [districtFilter, setDistrictFilter] = useState<string>("ყველა უბანი");

  useEffect(() => setMounted(true), []);

  const mappable = useMemo<MapOffer[]>(() => {
    const q = query.trim().toLowerCase();
    const favSet = new Set(favorites);
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
      if (availableOnly && (state === "unavailable" || !isOpenNow(o))) continue;
      if (favoritesOnly && !favSet.has(o.storeId)) continue;
      if (newPartnersOnly) {
        if (!o.createdAt || Date.now() - o.createdAt > NEW_PARTNER_MS) continue;
      }
      if (districtFilter !== "ყველა უბანი" && o.district !== districtFilter) continue;
      if (q) {
        const { title: locTitle } = getOfferText(o, language);
        const hay = `${o.storeName} ${o.title} ${locTitle} ${o.district ?? ""} ${getDistrictLabel(o.district ?? "", language)}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      out.push({ ...(o as Offer & { lat: number; lng: number }), _distanceKm: d, _state: state });
    }
    return out;
  }, [offers, location, effectiveRadius, showUnavailable, favoritesOnly, newPartnersOnly, availableOnly, districtFilter, query, favorites, language]);

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
    const bestDiscount = (s: MapStore) => {
      let best = 0;
      for (const o of s.offers) {
        if (o._state === "unavailable") continue;
        const dc = o.originalPrice > 0 ? 1 - o.price / o.originalPrice : 0;
        if (dc > best) best = dc;
      }
      return best;
    };
    const earliestEnd = (s: MapStore) => {
      let min = Infinity;
      for (const o of s.offers) {
        if (o._state === "unavailable") continue;
        const m = timeToMinutes(o.pickupTo);
        if (m < min) min = m;
      }
      return min;
    };
    if (sortMode === "discount") {
      list.sort((a, b) => bestDiscount(b) - bestDiscount(a));
    } else if (sortMode === "endingSoon") {
      list.sort((a, b) => earliestEnd(a) - earliestEnd(b));
    } else if (location) {
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return list;
  }, [mappable, location, sortMode]);

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
        <LocationButton onClick={askOrRefresh} label={t("myLocation")} />
      </div>

      <div className="absolute top-16 inset-x-0 z-[1000] px-3 pointer-events-none space-y-2">
        <div className="pointer-events-auto bg-card shadow-elevated rounded-2xl p-2 flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="მაღაზია, კერძი, უბანი…"
              className="w-full pl-8 pr-8 h-9 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted grid place-items-center"
                aria-label="clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors ${
              showFilters || sortMode !== "nearby" || favoritesOnly || newPartnersOnly || availableOnly || districtFilter !== "ყველა უბანი"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> ფილტრი
          </button>
        </div>

        {showFilters && (
          <div className="pointer-events-auto bg-card shadow-elevated rounded-2xl p-2 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <CustomerRadiusFilter value={radius} onChange={setRadius} onDebouncedChange={setEffectiveRadius} />
              <label className="shrink-0 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 pr-1 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showUnavailable}
                  onChange={(e) => setShowUnavailable(e.target.checked)}
                  className="accent-primary"
                />
                მიუწვდომელი
              </label>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {([
                { id: "nearby", label: "ახლოს", icon: <Navigation className="w-3 h-3" /> },
                { id: "discount", label: "მაქს. ფასდაკლება", icon: <Percent className="w-3 h-3" /> },
                { id: "endingSoon", label: "სრულდება", icon: <Clock className="w-3 h-3" /> },
              ] as { id: SortMode; label: string; icon: React.ReactNode }[]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortMode(s.id)}
                  className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold ${
                    sortMode === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setNewPartnersOnly((v) => !v)}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold ${
                  newPartnersOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" /> ახალი პარტნიორები
              </button>
              <button
                type="button"
                onClick={() => setFavoritesOnly((v) => !v)}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold ${
                  favoritesOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <Heart className="w-3 h-3" /> ფავორიტები
              </button>
              <button
                type="button"
                onClick={() => setAvailableOnly((v) => !v)}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold ${
                  availableOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> ხელმისაწვდომია ახლა
              </button>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold bg-secondary text-foreground focus:outline-none"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{getDistrictLabel(d, language)}</option>
                ))}
              </select>
            </div>
          </div>
        )}
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
              userAccuracy={location?.accuracy}
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
