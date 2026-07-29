import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowLeft, Check, Crosshair, Home, Briefcase, MapPin, Navigation, Pencil,
  Plus, Search, Trash2, X, AlertTriangle, Loader2, ChevronDown, Building2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useUserLocation } from "@/hooks/use-user-location";
import { useAuth } from "@/lib/auth";
import { reverseGeocode, autocompleteAddress, placeDetails } from "@/lib/geocode.functions";
import {
  addressLabelText, formatAddressDetails, rememberLastAddressId, useDeleteAddress,
  useMyAddresses, useSaveAddress, type AddressLabel, type UserAddress,
} from "@/lib/addresses";
import { CITIES, CITY_CENTERS, cityLabel, useCity, type City } from "@/lib/city";
import { validateDeliveryLocation } from "@/lib/delivery/zones";

export interface SelectedAddress {
  id?: string;
  addressLine: string;
  details: string;
  courierNote: string;
  lat: number;
  lng: number;
  placeId?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Omit in manage-only mode (profile screen). */
  onSelect?: (address: SelectedAddress) => void;
  /** Store position used to warn when the pin sits outside the delivery radius. */
  store?: { lat: number | null; lng: number | null; radiusKm?: number | null; name?: string };
  manageOnly?: boolean;
  /** Show the "change city" section (home-header entry point). */
  showCitySwitch?: boolean;
}

type Step = "list" | "map" | "details";

function MapCenterWatcher({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove(c.lat, c.lng);
    },
  });
  return null;
}

function MapFlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, Math.max(map.getZoom(), 17), { animate: true });
  }, [pos, map]);
  return null;
}

export default function AddressPicker({ open, onClose, onSelect, store, manageOnly, showCitySwitch }: Props) {
  const { language } = useI18n();
  const L = useCallback(
    (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka),
    [language],
  );
  const { user } = useAuth();
  const { city, setCity } = useCity();
  const { location, status, askPermission, request } = useUserLocation();
  const { data: saved = [], isLoading: loadingSaved } = useMyAddresses(!!user && open);
  const saveAddress = useSaveAddress();
  const deleteAddress = useDeleteAddress();

  const reverse = useServerFn(reverseGeocode);
  const autocomplete = useServerFn(autocompleteAddress);
  const details = useServerFn(placeDetails);

  const [step, setStep] = useState<Step>("list");
  const [center, setCenter] = useState<[number, number]>(CITY_CENTERS[city] ?? [41.7151, 44.8271]);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [pinAddress, setPinAddress] = useState("");
  const [pinCity, setPinCity] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ placeId: string; main: string; secondary: string }>>([]);
  const [currentLabel, setCurrentLabel] = useState<string>("");
  const [searchFailed, setSearchFailed] = useState(false);
  const [reverseFailed, setReverseFailed] = useState(false);
  const [pinPlaceId, setPinPlaceId] = useState<string | null>(null);

  // details-step form
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [label, setLabel] = useState<AddressLabel>("home");
  const [customLabel, setCustomLabel] = useState("");
  const [entrance, setEntrance] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [doorCode, setDoorCode] = useState("");
  const [courierNote, setCourierNote] = useState("");
  const [saveForLater, setSaveForLater] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  const sessionToken = useRef<string>(Math.random().toString(36).slice(2));
  const reverseCache = useRef(new Map<string, { addressLine: string; city: string | null }>());

  const resetForm = useCallback(() => {
    setEditingId(undefined);
    setLabel("home");
    setCustomLabel("");
    setEntrance("");
    setFloor("");
    setApartment("");
    setDoorCode("");
    setCourierNote("");
    setSaveForLater(true);
    setIsDefault(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("list");
      setQuery("");
      setSuggestions([]);
      resetForm();
    }
  }, [open, resetForm]);

  const resolvePin = useCallback(
    async (lat: number, lng: number) => {
      const key = `${lat.toFixed(5)},${lng.toFixed(5)},${language}`;
      const cached = reverseCache.current.get(key);
      if (cached) {
        setPinAddress(cached.addressLine);
        setPinCity(cached.city);
        return;
      }
      setResolving(true);
      setReverseFailed(false);
      try {
        const res = await reverse({ data: { lat, lng, language } });
        const value = { addressLine: res.addressLine || res.formatted || "", city: res.city ?? null };
        reverseCache.current.set(key, value);
        setPinAddress(value.addressLine);
        setPinCity(value.city);
      } catch {
        setReverseFailed(true);
        setPinAddress("");
      } finally {
        setResolving(false);
      }
    },
    [language, reverse],
  );

  /** Debounced reverse-geocode: fires ~400ms after the map settles. */
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueResolve = useCallback(
    (lat: number, lng: number) => {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
      setResolving(true);
      resolveTimer.current = setTimeout(() => void resolvePin(lat, lng), 400);
    },
    [resolvePin],
  );
  useEffect(() => () => { if (resolveTimer.current) clearTimeout(resolveTimer.current); }, []);


  // Resolve a readable label for the "current location" row.
  useEffect(() => {
    if (!open || !location) return;
    let alive = true;
    void (async () => {
      try {
        const res = await reverse({ data: { lat: location.lat, lng: location.lng, language } });
        if (alive) setCurrentLabel(res.addressLine || res.formatted || "");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, location, language, reverse]);

  // Debounced autocomplete
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(() => {
      void (async () => {
        try {
          const res = await autocomplete({
            data: {
              query: q,
              language,
              lat: location?.lat,
              lng: location?.lng,
              sessionToken: sessionToken.current,
            },
          });
          setSuggestions(res);
          setSearchFailed(false);
        } catch {
          setSuggestions([]);
          setSearchFailed(true);
        }
      })();
    }, 350);
    return () => clearTimeout(id);
  }, [query, language, location, autocomplete]);

  const zone = useMemo(
    () => validateDeliveryLocation({ lat: center[0], lng: center[1] }, store ?? null),
    [store, center],
  );
  const distanceKm = zone.distanceKm;
  const outOfRange = !zone.allowed;

  const poorAccuracy = location?.accuracy != null && location.accuracy > 100;

  function openMapAt(lat: number, lng: number) {
    setPinPlaceId(null);
    setCenter([lat, lng]);
    setFlyTo([lat, lng]);
    void resolvePin(lat, lng);
    setStep("map");
  }

  async function useCurrentLocation() {
    if (!location) {
      if (status === "denied" || status === "error") {
        const loc = await request();
        if (loc) openMapAt(loc.lat, loc.lng);
      } else {
        askPermission();
      }
      return;
    }
    openMapAt(location.lat, location.lng);
  }

  function pickSaved(a: UserAddress) {
    rememberLastAddressId(a.id);
    onSelect?.({
      id: a.id,
      addressLine: a.address_line,
      details: formatAddressDetails(a, language),
      courierNote: a.courier_note ?? "",
      lat: a.lat,
      lng: a.lng,
      placeId: a.place_id ?? null,
    });
    onClose();
  }

  function editSaved(a: UserAddress) {
    setEditingId(a.id);
    setLabel(a.label);
    setCustomLabel(a.custom_label ?? "");
    setEntrance(a.entrance ?? "");
    setFloor(a.floor ?? "");
    setApartment(a.apartment ?? "");
    setDoorCode(a.door_code ?? "");
    setCourierNote(a.courier_note ?? "");
    setIsDefault(a.is_default);
    setSaveForLater(true);
    setPinAddress(a.address_line);
    setPinCity(a.city);
    setPinPlaceId(a.place_id ?? null);
    setCenter([a.lat, a.lng]);
    setStep("details");
  }

  async function confirmDetails() {
    const line =
      pinAddress.trim() ||
      (reverseFailed ? `${center[0].toFixed(5)}, ${center[1].toFixed(5)}` : "");
    if (line.length < 3) {
      toast.error(L("აირჩიეთ მისამართი რუკაზე", "Pick an address on the map", "Выберите адрес на карте"));
      return;
    }
    let savedId: string | undefined = editingId;
    if (user && (saveForLater || editingId)) {
      try {
        const row = await saveAddress.mutateAsync({
          id: editingId,
          label,
          custom_label: customLabel || null,
          address_line: line,
          entrance: entrance || null,
          floor: floor || null,
          apartment: apartment || null,
          door_code: doorCode || null,
          courier_note: courierNote || null,
          lat: center[0],
          lng: center[1],
          city: pinCity,
          place_id: pinPlaceId,
          is_default: isDefault,
        });
        savedId = row.id;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
        return;
      }
    }
    if (manageOnly) {
      resetForm();
      setStep("list");
      return;
    }
    if (savedId) rememberLastAddressId(savedId);
    onSelect?.({
      id: savedId,
      addressLine: line,
      details: formatAddressDetails(
        { entrance, floor, apartment, door_code: doorCode },
        language,
      ),
      courierNote,
      lat: center[0],
      lng: center[1],
      placeId: pinPlaceId,
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-full h-[92dvh] sm:h-[85dvh] sm:max-w-lg sm:mx-auto bg-card rounded-t-3xl shadow-elevated flex flex-col overflow-hidden animate-fade-in pb-[env(safe-area-inset-bottom)]">
        {/* grabber */}
        <div className="shrink-0 pt-2 pb-1 grid place-items-center sm:hidden" aria-hidden="true">
          <span className="w-10 h-1.5 rounded-full bg-border" />
        </div>
        {/* header */}
        <div className="shrink-0 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
          <button
            type="button"
            onClick={() => (step === "list" ? onClose() : setStep(step === "details" ? "map" : "list"))}
            className="w-9 h-9 rounded-full bg-secondary grid place-items-center shrink-0"
            aria-label={L("უკან", "Back", "Назад")}
          >
            {step === "list" ? <X className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <h2 className="font-display text-base font-bold truncate">
            {step === "list"
              ? manageOnly
                ? L("ჩემი მისამართები", "My addresses", "Мои адреса")
                : L("სად მოგიტანოთ?", "Where should we deliver?", "Куда доставить?")
              : step === "map"
                ? L("მიუთითეთ ზუსტი ადგილი", "Pin the exact spot", "Укажите точное место")
                : L("მისამართის დეტალები", "Address details", "Детали адреса")}
          </h2>
          <span className="w-9" />
        </div>

        {/* ── LIST ── */}
        {step === "list" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={L("მისამართის ძებნა", "Search address", "Поиск адреса")}
                placeholder={L("მოძებნეთ ქუჩა და ნომერი…", "Search street and number…", "Найдите улицу и номер…")}
                className="w-full h-12 pl-10 pr-4 rounded-2xl bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {suggestions.length > 0 && (
              <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                {suggestions.map((s) => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={async () => {
                      try {
                        const d = await details({
                          data: { placeId: s.placeId, language, sessionToken: sessionToken.current },
                        });
                        sessionToken.current = Math.random().toString(36).slice(2);
                        if (d.lat == null || d.lng == null) throw new Error("no location");
                        setQuery("");
                        setSuggestions([]);
                        setReverseFailed(false);
                        setPinPlaceId(s.placeId);
                        setPinAddress(d.addressLine || s.main);
                        setCenter([d.lat, d.lng]);
                        setFlyTo([d.lat, d.lng]);
                        setStep("map");
                      } catch {
                        toast.error(L("მისამართი ვერ მოიძებნა", "Could not load that address", "Не удалось загрузить адрес"));
                      }
                    }}
                    className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{s.main}</span>
                      {s.secondary && (
                        <span className="block text-xs text-muted-foreground truncate">{s.secondary}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchFailed && query.trim().length >= 3 && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground px-1" role="status">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warm-foreground shrink-0" />
                {L(
                  "მისამართის ძებნა დროებით მიუწვდომელია — მონიშნეთ ადგილი რუკაზე.",
                  "Address search is temporarily unavailable — pick your location on the map.",
                  "Поиск адреса временно недоступен — укажите место на карте.",
                )}
              </p>
            )}

            {/* current location */}
            <button
              type="button"
              onClick={() => void useCurrentLocation()}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border text-left hover:bg-muted/40 transition-colors"
            >
              <Navigation className="w-5 h-5 text-primary shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {L("მიმდინარე მდებარეობა", "Current location", "Текущее местоположение")}
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {location
                    ? currentLabel || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : status === "denied"
                      ? L("წვდომა დახურულია — შეეხეთ ხელახლა", "Access blocked — tap to retry", "Доступ закрыт — нажмите ещё раз")
                      : L("შეეხეთ მდებარეობის ჩასართავად", "Tap to enable location", "Нажмите, чтобы включить")}
                </span>
              </span>
            </button>

            {status === "denied" && (
              <p className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warm-foreground shrink-0" />
                {L(
                  "მდებარეობა დაბლოკილია. მოძებნეთ მისამართი ან მონიშნეთ რუკაზე.",
                  "Location is blocked. Search for the address or drop a pin on the map instead.",
                  "Геолокация заблокирована. Найдите адрес или укажите точку на карте.",
                )}
              </p>
            )}

            {/* saved */}
            {user && (
              <div className="pt-1">
                <div className="text-xs font-semibold text-muted-foreground px-1 mb-1.5">
                  {L("შენახული მისამართები", "Saved addresses", "Сохранённые адреса")}
                </div>
                {loadingSaved ? (
                  <div className="h-16 rounded-2xl bg-secondary animate-pulse" />
                ) : saved.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">
                    {L("ჯერ არაფერია შენახული.", "Nothing saved yet.", "Пока ничего не сохранено.")}
                  </p>
                ) : (
                  <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
                    {saved.map((a) => (
                      <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => (manageOnly ? editSaved(a) : pickSaved(a))}
                          className="flex items-center gap-3 min-w-0 text-left"
                        >
                          <span className="w-9 h-9 rounded-xl bg-secondary grid place-items-center shrink-0">
                            {a.label === "home" ? (
                              <Home className="w-4 h-4 text-primary" />
                            ) : a.label === "work" ? (
                              <Briefcase className="w-4 h-4 text-primary" />
                            ) : (
                              <MapPin className="w-4 h-4 text-primary" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm font-bold truncate">{addressLabelText(a, language)}</span>
                              {a.is_default && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                                  {L("ძირითადი", "Default", "Основной")}
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">{a.address_line}</span>
                            {formatAddressDetails(a, language) && (
                              <span className="block text-[11px] text-muted-foreground truncate">
                                {formatAddressDetails(a, language)}
                              </span>
                            )}
                          </span>
                        </button>
                        <span className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => editSaved(a)}
                            className="w-9 h-9 rounded-full bg-secondary grid place-items-center"
                            aria-label={L("რედაქტირება", "Edit", "Изменить")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteAddress.mutateAsync(a.id)}
                            className="w-9 h-9 rounded-full bg-secondary grid place-items-center text-destructive"
                            aria-label={L("წაშლა", "Delete", "Удалить")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                resetForm();
                const start = location ? [location.lat, location.lng] : (CITY_CENTERS[city] ?? [41.7151, 44.8271]);
                openMapAt(start[0], start[1]);
              }}
              className="w-full h-12 rounded-2xl bg-secondary font-semibold text-sm flex items-center justify-center gap-2 press"
            >
              <Plus className="w-4 h-4" />
              {L("ახალი მისამართის დამატება", "Add a new address", "Добавить новый адрес")}
            </button>

            {showCitySwitch && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-muted-foreground px-1 mb-1.5">
                  {L("ქალაქის შეცვლა", "Change city", "Сменить город")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c: City) => {
                    const active = c === city;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCity(c)}
                        className={`inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border-2 text-sm font-semibold transition-colors ${
                          active ? "border-primary bg-primary/5 text-primary" : "border-border"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {cityLabel(c, language)}
                        {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MAP ── */}
        {step === "map" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative flex-1 min-h-0">
              <MapContainer
                center={center}
                zoom={17}
                zoomControl={false}
                scrollWheelZoom
                className="h-full w-full"
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapFlyTo pos={flyTo} />
                <MapCenterWatcher
                  onMove={(lat, lng) => {
                    setPinPlaceId(null);
                    setCenter([lat, lng]);
                    queueResolve(lat, lng);
                  }}
                />

              </MapContainer>

              {/* fixed centre pin */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="-translate-y-3 flex flex-col items-center">
                  <MapPin className="w-9 h-9 text-primary drop-shadow-lg" fill="currentColor" />
                  <span className="w-2 h-2 rounded-full bg-foreground/40" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void useCurrentLocation()}
                className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-card shadow-elevated grid place-items-center"
                aria-label={L("ჩემი მდებარეობა", "My location", "Моё местоположение")}
              >
                <Crosshair className="w-5 h-5 text-primary" />
              </button>
            </div>

            <div className="shrink-0 p-4 space-y-3 border-t border-border">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate" aria-live="polite">
                    {resolving ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {L("იძებნება…", "Locating…", "Поиск…")}
                      </span>
                    ) : (
                      pinAddress ||
                      (reverseFailed
                        ? `${center[0].toFixed(5)}, ${center[1].toFixed(5)}`
                        : L("გადაათრიეთ რუკა", "Drag the map", "Перетащите карту"))
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {distanceKm != null &&
                      `${L("მაღაზიიდან", "from the store", "от магазина")} ${distanceKm.toFixed(1)} ${L("კმ", "km", "км")}`}
                  </div>
                </div>
              </div>

              {reverseFailed && !resolving && (
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warm-foreground shrink-0" />
                  <span>
                    {L(
                      "მისამართის სახელი ვერ ჩაიტვირთა — ადგილი მაინც სწორია.",
                      "Couldn't load the address name — the spot itself is still correct.",
                      "Не удалось загрузить название адреса — само место указано верно.",
                    )}{" "}
                    <button
                      type="button"
                      onClick={() => void resolvePin(center[0], center[1])}
                      className="text-primary font-semibold underline"
                    >
                      {L("ხელახლა", "Retry", "Повторить")}
                    </button>
                  </span>
                </div>
              )}

              {poorAccuracy && (
                <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-warm-foreground shrink-0" />
                  {L(
                    "GPS სიზუსტე დაბალია — გთხოვთ, გადაათრიოთ რუკა ზუსტ ადგილზე.",
                    "GPS accuracy is low — please drag the map onto the exact spot.",
                    "Низкая точность GPS — перетащите карту на точное место.",
                  )}
                </p>
              )}

              {outOfRange && (
                <p className="flex items-start gap-2 text-[11px] text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {L(
                    "ეს ადგილი მაღაზიის მიტანის ზონის გარეთაა.",
                    "This spot is outside the store's delivery zone.",
                    "Это место вне зоны доставки магазина.",
                  )}
                </p>
              )}

              <button
                type="button"
                disabled={resolving || (!reverseFailed && pinAddress.trim().length < 3) || outOfRange}
                onClick={() => setStep("details")}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 press"
              >
                {L("დადასტურება", "Confirm location", "Подтвердить")}
              </button>
            </div>
          </div>
        )}

        {/* ── DETAILS ── */}
        {step === "details" && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-secondary">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <input
                  value={pinAddress}
                  onChange={(e) => setPinAddress(e.target.value.slice(0, 200))}
                  aria-label={L("მისამართი", "Address", "Адрес")}
                  className="w-full bg-transparent text-sm font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="text-xs text-primary font-semibold"
                >
                  {L("რუკაზე შეცვლა", "Change on map", "Изменить на карте")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "entrance", value: entrance, set: setEntrance, ph: L("სადარბაზო", "Entrance", "Подъезд") },
                { id: "floor", value: floor, set: setFloor, ph: L("სართული", "Floor", "Этаж") },
                { id: "apartment", value: apartment, set: setApartment, ph: L("ბინა", "Apartment", "Квартира") },
                { id: "doorCode", value: doorCode, set: setDoorCode, ph: L("კარის კოდი", "Door code", "Код двери") },
              ].map((f) => (
                <input
                  key={f.id}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value.slice(0, 20))}
                  placeholder={f.ph}
                  className="h-12 px-4 rounded-2xl bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ))}
            </div>

            <textarea
              value={courierNote}
              onChange={(e) => setCourierNote(e.target.value.slice(0, 300))}
              rows={2}
              placeholder={L(
                "შენიშვნა კურიერისთვის (მაგ: დარეკეთ მისვლისას)",
                "Note for the courier (e.g. call on arrival)",
                "Заметка курьеру (напр.: позвоните по прибытии)",
              )}
              className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {user && (
              <>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                    {L("იარლიყი", "Label", "Метка")}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["home", "work", "other"] as AddressLabel[]).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLabel(id)}
                        className={`h-11 rounded-2xl border-2 text-sm font-semibold transition-colors ${
                          label === id ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        {id === "home"
                          ? L("სახლი", "Home", "Дом")
                          : id === "work"
                            ? L("სამსახური", "Work", "Работа")
                            : L("სხვა", "Other", "Другое")}
                      </button>
                    ))}
                  </div>
                  {label === "other" && (
                    <input
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value.slice(0, 40))}
                      placeholder={L("სახელი (მაგ: მეგობარი)", "Name (e.g. friend)", "Название (напр.: друг)")}
                      className="mt-2 w-full h-12 px-4 rounded-2xl bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  )}
                </div>

                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>{L("ძირითად მისამართად დაყენება", "Set as default address", "Сделать основным")}</span>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-5 h-5 accent-[hsl(var(--primary))]"
                  />
                </label>

                {!manageOnly && !editingId && (
                  <label className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span>{L("მისამართის შენახვა", "Save this address", "Сохранить адрес")}</span>
                    <input
                      type="checkbox"
                      checked={saveForLater}
                      onChange={(e) => setSaveForLater(e.target.checked)}
                      className="w-5 h-5 accent-[hsl(var(--primary))]"
                    />
                  </label>
                )}
              </>
            )}

            <button
              type="button"
              disabled={saveAddress.isPending}
              onClick={() => void confirmDetails()}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 press"
            >
              {saveAddress.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {manageOnly
                ? L("შენახვა", "Save", "Сохранить")
                : L("მისამართის გამოყენება", "Use this address", "Использовать адрес")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
