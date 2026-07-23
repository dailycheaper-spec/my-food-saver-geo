import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, lazy, Suspense } from "react";
import { ArrowLeft, ExternalLink, MapPin, Navigation, X, Search as SearchIcon, SlidersHorizontal, Percent, Clock, Sparkles, Heart, CheckCircle2, Store as StoreIcon, Utensils } from "lucide-react";
import { TBILISI_CENTER, DISTRICTS, CATEGORIES, formatPrice, getDistrictLabel, getCategoryLabel, getOfferText, type Offer, type Category } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { useUserLocation } from "@/hooks/use-user-location";
import { calculateDistanceKm, formatDistance, isValidLatLng } from "@/lib/geo";
import { CustomerRadiusFilter, type RadiusOption } from "@/components/CustomerRadiusFilter";
import LocationButton from "@/components/map/LocationButton";
import { useFavorites, toggleFavorite } from "@/lib/storage";
import { useCity, CITY_CENTERS } from "@/lib/city";

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
  const { offers: allOffers } = useLiveDbCardOffers();
  const { city } = useCity();
  const offers = useMemo(
    () => allOffers.filter((o) => (o.city ?? "თბილისი") === city),
    [allOffers, city],
  );
  const { location, status, askPermission, request } = useUserLocation();
  const favorites = useFavorites();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [radius, setRadius] = useState<RadiusOption>(5);
  const [effectiveRadius, setEffectiveRadius] = useState<RadiusOption>(5);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("nearby");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [newPartnersOnly, setNewPartnersOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [districtFilter, setDistrictFilter] = useState<string>("ყველა უბანი");
  const [categoryFilter, setCategoryFilter] = useState<Category | "ყველა">("ყველა");
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close suggestions when clicking outside the search box
  useEffect(() => {
    if (!suggestOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [suggestOpen]);

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
      if (categoryFilter !== "ყველა" && o.category !== categoryFilter) continue;
      if (q) {
        const { title: locTitle } = getOfferText(o, language);
        const catLabel = getCategoryLabel(o.category as Category, language);
        const hay = `${o.storeName} ${o.title} ${locTitle} ${o.district ?? ""} ${getDistrictLabel(o.district ?? "", language)} ${o.category ?? ""} ${catLabel}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      out.push({ ...(o as Offer & { lat: number; lng: number }), _distanceKm: d, _state: state });
    }
    return out;
  }, [offers, location, effectiveRadius, showUnavailable, favoritesOnly, newPartnersOnly, availableOnly, districtFilter, categoryFilter, query, favorites, language]);

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

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (sortMode !== "nearby") n++;
    if (favoritesOnly) n++;
    if (newPartnersOnly) n++;
    if (availableOnly) n++;
    if (districtFilter !== "ყველა უბანი") n++;
    if (categoryFilter !== "ყველა") n++;
    if (showUnavailable) n++;
    return n;
  }, [sortMode, favoritesOnly, newPartnersOnly, availableOnly, districtFilter, categoryFilter, showUnavailable]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const seenStores = new Set<string>();
    const partners: { id: string; name: string; logo: string }[] = [];
    const foods: { id: string; title: string; storeName: string; image: string }[] = [];
    for (const o of offers) {
      const { title: locTitle } = getOfferText(o, language);
      if (!seenStores.has(o.storeId) && (o.storeName.toLowerCase().includes(q))) {
        seenStores.add(o.storeId);
        partners.push({ id: o.storeId, name: o.storeName, logo: o.storeLogo });
      }
      if (
        (o.title.toLowerCase().includes(q) || locTitle.toLowerCase().includes(q)) &&
        foods.length < 4
      ) {
        foods.push({ id: o.id, title: locTitle || o.title, storeName: o.storeName, image: o.image });
      }
      if (partners.length >= 3 && foods.length >= 4) break;
    }
    const cats = CATEGORIES.filter(
      (c) => c.id !== "ყველა" && getCategoryLabel(c.id, language).toLowerCase().includes(q),
    ).slice(0, 3);
    const districts = DISTRICTS.filter(
      (d) => d !== "ყველა უბანი" && getDistrictLabel(d, language).toLowerCase().includes(q),
    ).slice(0, 3);
    if (!partners.length && !foods.length && !cats.length && !districts.length) return null;
    return { partners: partners.slice(0, 3), foods, cats, districts };
  }, [query, offers, language]);

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

      <div className="absolute top-14 inset-x-0 z-[1000] px-3 pointer-events-none space-y-1.5">
        <div ref={searchWrapRef} className="relative max-w-md mx-auto">
          <div className="pointer-events-auto bg-card/95 backdrop-blur shadow-elevated rounded-full p-1 flex items-center gap-1">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSuggestOpen(false); (e.target as HTMLInputElement).blur(); } }}
                placeholder="მაღაზია, კერძი, კატეგორია, უბანი…"
                aria-label="ძებნა რუკაზე"
                aria-expanded={Boolean(suggestOpen && suggestions)}
                aria-controls="map-search-suggestions"
                className="w-full pl-7 pr-7 h-8 rounded-full bg-transparent text-foreground placeholder:text-muted-foreground text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setSuggestOpen(false); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="ძებნის გასუფთავება"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`relative h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
              aria-label={`ფილტრი${activeFilterCount > 0 ? ` (${activeFilterCount} აქტიური)` : ""}`}
              aria-pressed={showFilters}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold grid place-items-center border border-card"
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {suggestOpen && suggestions && (
            <div
              id="map-search-suggestions"
              role="listbox"
              className="pointer-events-auto absolute inset-x-0 top-[calc(100%+6px)] bg-card border border-border rounded-2xl shadow-elevated overflow-hidden max-h-[60vh] overflow-y-auto"
            >
              {suggestions.partners.length > 0 && (
                <div className="p-2">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1">პარტნიორები</div>
                  {suggestions.partners.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      onClick={() => { setSelectedStoreId(p.id); setSuggestOpen(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary focus:bg-secondary focus:outline-none text-left"
                    >
                      <span className="w-7 h-7 rounded-full bg-secondary grid place-items-center text-sm shrink-0 overflow-hidden">
                        {/^(https?:|\/|data:)/.test(p.logo)
                          ? <img src={p.logo} alt="" className="w-full h-full object-cover" />
                          : <span>{p.logo || "🏪"}</span>}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-xs font-semibold">{p.name}</span>
                      <StoreIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {suggestions.foods.length > 0 && (
                <div className="p-2 border-t border-border">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1">კერძები</div>
                  {suggestions.foods.map((f) => (
                    <Link
                      key={f.id}
                      to="/offer/$id"
                      params={{ id: f.id }}
                      onClick={() => setSuggestOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary focus:bg-secondary focus:outline-none"
                    >
                      <img src={f.image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-xs font-semibold">{f.title}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{f.storeName}</span>
                      </span>
                      <Utensils className="w-3 h-3 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.cats.length > 0 && (
                <div className="p-2 border-t border-border">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1">კატეგორიები</div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.cats.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        role="option"
                        onClick={() => { setCategoryFilter(c.id as Category | "ყველა"); setQuery(""); setSuggestOpen(false); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span>{c.icon}</span>{getCategoryLabel(c.id, language)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {suggestions.districts.length > 0 && (
                <div className="p-2 border-t border-border">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground px-2 pb-1">უბნები</div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.districts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="option"
                        onClick={() => { setDistrictFilter(d); setQuery(""); setSuggestOpen(false); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <MapPin className="w-3 h-3" />{getDistrictLabel(d, language)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" role="group" aria-label="დალაგება">
              {([
                { id: "nearby", label: "ახლოს", icon: <Navigation className="w-3 h-3" /> },
                { id: "discount", label: "მაქს. ფასდაკლება", icon: <Percent className="w-3 h-3" /> },
                { id: "endingSoon", label: "სრულდება", icon: <Clock className="w-3 h-3" /> },
              ] as { id: SortMode; label: string; icon: React.ReactNode }[]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortMode(s.id)}
                  aria-pressed={sortMode === s.id}
                  className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    sortMode === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" role="group" aria-label="კატეგორია">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id)}
                  aria-pressed={categoryFilter === c.id}
                  className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    categoryFilter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  <span>{c.icon}</span> {getCategoryLabel(c.id, language)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" role="group" aria-label="ფილტრები">
              <button
                type="button"
                onClick={() => setNewPartnersOnly((v) => !v)}
                aria-pressed={newPartnersOnly}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  newPartnersOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" /> ახალი
              </button>
              <button
                type="button"
                onClick={() => setFavoritesOnly((v) => !v)}
                aria-pressed={favoritesOnly}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  favoritesOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <Heart className="w-3 h-3" /> ფავორიტები
              </button>
              <button
                type="button"
                onClick={() => setAvailableOnly((v) => !v)}
                aria-pressed={availableOnly}
                className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  availableOnly ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> ხელმისაწვდომია ახლა
              </button>
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                aria-label="უბანი"
                className="shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold bg-secondary text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{getDistrictLabel(d, language)}</option>
                ))}
              </select>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSortMode("nearby");
                    setFavoritesOnly(false);
                    setNewPartnersOnly(false);
                    setAvailableOnly(false);
                    setDistrictFilter("ყველა უბანი");
                    setCategoryFilter("ყველა");
                    setShowUnavailable(false);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-semibold bg-muted text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="w-3 h-3" /> გასუფთავება
                </button>
              )}
            </div>

          </div>
        )}
      </div>

      <div className="flex-1 relative">
        {!location && status !== "prompting" && (
          <div className="absolute left-1/2 -translate-x-1/2 top-28 z-[1000] pointer-events-auto bg-card/95 backdrop-blur border border-border rounded-full shadow-elevated pl-3 pr-1 py-1 flex items-center gap-2 max-w-[92%]">
            <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-[11px] font-semibold text-foreground truncate">მდებარეობა გამორთულია</p>
            <button
              type="button"
              onClick={status === "denied" ? () => void request() : askPermission}
              className="h-7 px-3 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold press shrink-0"
            >
              {status === "denied" ? "ხელახლა" : "ჩართვა"}
            </button>
          </div>
        )}


        {mounted && (
          <Suspense fallback={<div className="h-full w-full grid place-items-center text-sm text-muted-foreground">რუკა იტვირთება…</div>}>
            <MapCanvas
              center={location ? [location.lat, location.lng] : (CITY_CENTERS[city] ?? TBILISI_CENTER)}
              userPos={location ? [location.lat, location.lng] : null}
              userAccuracy={location?.accuracy}
              stores={stores}
              selectedId={selectedStoreId}
              hoveredId={hoveredId}
              onSelect={setSelectedStoreId}
              onHover={setHoveredId}
              searchRadiusKm={location ? effectiveRadius : undefined}
              storageKey="cheaper-customer-map"
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
        <div
          key={selectedStore.storeId}
          className="absolute bottom-20 inset-x-3 z-[1000] bg-card rounded-2xl shadow-elevated border border-border max-h-[60vh] flex flex-col overflow-hidden animate-[mapPreviewIn_.28s_cubic-bezier(.22,1,.36,1)_both]"
          style={{ willChange: "transform" }}
        >
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
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFavorite(selectedStore.storeId)}
                  className={`flex-1 border px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 transition-colors ${
                    favorites.includes(selectedStore.storeId)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background"
                  }`}
                  aria-label="ფავორიტი"
                  aria-pressed={favorites.includes(selectedStore.storeId)}
                >
                  <Heart className={`h-3 w-3 ${favorites.includes(selectedStore.storeId) ? "fill-current" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStoreId(null)}
                  className="flex-1 border border-border bg-background px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1"
                  aria-label="დახურვა"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
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
                      {o.originalPrice > o.price && !unavailable && (
                        <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded-full">
                          დაზოგე {formatPrice(o.originalPrice - o.price)}
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
