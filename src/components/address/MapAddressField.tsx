import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { autocompleteAddress, placeDetails, reverseGeocode } from "@/lib/geocode.functions";
import { resolveAddress, setCachedAddress, getCachedAddress, geocodeLang } from "@/lib/reverse-address";
import { CITY_CENTERS, type City } from "@/lib/city";

const StoreLocationPicker = lazy(() =>
  import("@/components/StoreLocationPicker").then((m) => ({ default: m.StoreLocationPicker })),
);

interface Props {
  value: { lat: number | null; lng: number | null };
  onChange: (v: { lat: number; lng: number }) => void;
  height?: number;
  radiusKm?: number;
  storageKey?: string;
  /** Biases address search around the selected city. */
  city?: City;
  /** Fires whenever the pin's street address resolves. */
  onAddressResolved?: (address: string) => void;
}

export function MapAddressField({
  value,
  onChange,
  height = 320,
  radiusKm,
  storageKey = "cheaper-picker-map",
  city,
  onAddressResolved,
}: Props) {
  const { t, language } = useI18n();
  const L = (ka: string, en: string, ru: string, tr: string, fa: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? tr : language === "fa" ? fa : ka;
  const lang = geocodeLang(language);

  const reverse = useServerFn(reverseGeocode);
  const autocomplete = useServerFn(autocompleteAddress);
  const details = useServerFn(placeDetails);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; main: string; secondary: string }>>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [resolving, setResolving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const sessionToken = useRef<string>(Math.random().toString(36).slice(2));

  const emit = useRef(onAddressResolved);
  emit.current = onAddressResolved;

  // Debounced reverse-geocode of the current pin.
  useEffect(() => {
    const { lat, lng } = value;
    if (lat == null || lng == null) {
      setAddress("");
      return;
    }
    const cached = getCachedAddress(lat, lng, lang);
    if (cached) {
      setAddress(cached.addressLine);
      setResolving(false);
      if (cached.addressLine) emit.current?.(cached.addressLine);
      return;
    }
    let alive = true;
    setResolving(true);
    const id = setTimeout(() => {
      void resolveAddress(reverse as never, lat, lng, lang).then((res) => {
        if (!alive) return;
        setResolving(false);
        if (!res) {
          setUnavailable(true);
          setAddress("");
          return;
        }
        setUnavailable(false);
        setAddress(res.addressLine);
        if (res.addressLine) emit.current?.(res.addressLine);
      });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [value.lat, value.lng, lang, reverse]);

  // Debounced address autocomplete.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    setSearchBusy(true);
    const bias = value.lat != null && value.lng != null
      ? { lat: value.lat, lng: value.lng }
      : city
        ? { lat: CITY_CENTERS[city]?.[0], lng: CITY_CENTERS[city]?.[1] }
        : {};
    const id = setTimeout(() => {
      void (async () => {
        try {
          const res = await autocomplete({
            data: { query: q, language: lang, sessionToken: sessionToken.current, ...bias },
          });
          if (alive) setSuggestions(res as typeof suggestions);
        } catch {
          if (alive) {
            setSuggestions([]);
            setUnavailable(true);
          }
        } finally {
          if (alive) setSearchBusy(false);
        }
      })();
    }, 350);
    return () => {
      alive = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lang, city, value.lat, value.lng]);

  async function pickSuggestion(placeId: string, label: string) {
    setSuggestions([]);
    setQuery("");
    try {
      const res = await details({ data: { placeId, language: lang, sessionToken: sessionToken.current } });
      sessionToken.current = Math.random().toString(36).slice(2);
      if (res.lat != null && res.lng != null) {
        const line = res.addressLine || label;
        setCachedAddress(res.lat, res.lng, lang, { addressLine: line, city: null });
        setAddress(line);
        onChange({ lat: res.lat, lng: res.lng });
        emit.current?.(line);
      }
    } catch {
      setUnavailable(true);
    }
  }

  const hasPin = value.lat != null && value.lng != null;

  return (
    <div className="space-y-2">
      {/* Address search */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 h-11 rounded-xl border border-border bg-card">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L("მოძებნეთ მისამართი…", "Search address…", "Поиск адреса…", "Adres ara…", "جستجوی آدرس…")}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {searchBusy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {!searchBusy && query && (
            <button type="button" onClick={() => setQuery("")} aria-label={L("გასუფთავება", "Clear", "Очистить", "Temizle", "پاک کردن")}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute z-[600] left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onClick={() => void pickSuggestion(s.placeId, s.main)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{s.main}</span>
                  {s.secondary && (
                    <span className="block text-xs text-muted-foreground truncate">{s.secondary}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={<div className="w-full rounded-2xl bg-muted animate-pulse" style={{ height }} />}>
        <StoreLocationPicker
          value={value}
          onChange={onChange}
          height={height}
          radiusKm={radiusKm}
          storageKey={storageKey}
        />
      </Suspense>

      {/* Resolved address */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          {!hasPin ? (
            <span className="text-xs text-muted-foreground">
              {L("დააკლიკეთ რუკაზე, მოძებნეთ მისამართი ან გამოიყენეთ მიმდინარე მდებარეობა.", "Tap the map, search an address, or use your current location.", "Нажмите на карту, найдите адрес или используйте текущее местоположение.", "Haritaya dokunun, adres arayın veya mevcut konumunuzu kullanın.", "روی نقشه ضربه بزنید، آدرس را جستجو کنید یا از موقعیت فعلی خود استفاده کنید.")}
            </span>
          ) : resolving ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {L("მისამართის დადგენა…", "Resolving address…", "Определяем адрес…", "Adres belirleniyor…", "در حال یافتن آدرس…")}
            </span>
          ) : address ? (
            <>
              <div className="text-sm font-medium leading-snug break-words">{address}</div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {value.lat!.toFixed(5)}, {value.lng!.toFixed(5)}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                {unavailable
                  ? L("მისამართის დადგენა ვერ მოხერხდა", "Address lookup unavailable", "Не удалось определить адрес", "Adres bulunamıyor", "جستجوی آدرس در دسترس نیست")
                  : L("მისამართი ვერ მოიძებნა", "No address found", "Адрес не найден", "Adres bulunamadı", "آدرسی یافت نشد")}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {value.lat!.toFixed(5)}, {value.lng!.toFixed(5)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapAddressField;
