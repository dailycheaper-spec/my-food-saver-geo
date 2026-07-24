import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Navigation, ChevronRight } from "lucide-react";
import type { Offer } from "@/lib/mock-data";
import { calculateDistanceKm, formatDistance, isValidLatLng } from "@/lib/geo";
import { useUserLocation } from "@/hooks/use-user-location";
import { CustomerRadiusFilter, type RadiusOption } from "@/components/CustomerRadiusFilter";
import { OfferCard } from "@/components/OfferCard";

interface Props {
  offers: Offer[];
}

const PARTNER_DEFAULT_RADIUS = 3;

export function computeNearbyOffers(
  offers: Offer[],
  userLat: number,
  userLng: number,
  customerRadiusKm: number,
): Array<Offer & { _distanceKm: number }> {
  const out: Array<Offer & { _distanceKm: number }> = [];
  for (const o of offers) {
    if (!isValidLatLng(o.lat, o.lng)) continue;
    const partnerRadius = o.visibilityRadiusKm ?? PARTNER_DEFAULT_RADIUS;
    const d = calculateDistanceKm(userLat, userLng, o.lat as number, o.lng as number);
    if (d > partnerRadius) continue;
    if (d > customerRadiusKm) continue;
    out.push({ ...o, _distanceKm: d });
  }
  out.sort((a, b) => a._distanceKm - b._distanceKm);
  return out;
}

export function NearbyOffersSection({ offers }: Props) {
  const { location, status, askPermission, request } = useUserLocation();
  const [radius, setRadius] = useState<RadiusOption>(3);
  const [effectiveRadius, setEffectiveRadius] = useState<RadiusOption>(3);

  const nearby = useMemo(() => {
    if (!location) return [];
    return computeNearbyOffers(offers, location.lat, location.lng, effectiveRadius);
  }, [offers, location, effectiveRadius]);

  return (
    <section className="mx-auto max-w-6xl px-4 mt-5 sm:mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <MapPin className="w-[18px] h-[18px] text-primary" /> 📍 თქვენთან ახლოს
        </h2>
        {location && nearby.length > 0 && (
          <Link
            to="/map"
            className="text-xs font-semibold text-primary flex items-center gap-0.5 active:scale-95"
          >
            ყველას ნახვა <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {location && (
        <div className="mb-3">
          <CustomerRadiusFilter value={radius} onChange={setRadius} onDebouncedChange={setEffectiveRadius} />
        </div>
      )}

      {!location && status !== "prompting" && (
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 text-center">
          <div className="text-3xl mb-2">📍</div>
          <p className="text-sm font-semibold">გაიგე, რა შემოთავაზებებია შენს ახლოს</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ჩართეთ მდებარეობა, რათა გაჩვენოთ თქვენთან ახლოს არსებული შეთავაზებები.
          </p>
          <button
            type="button"
            onClick={askPermission}
            className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold press"
          >
            <Navigation className="w-4 h-4" /> მდებარეობის ჩართვა
          </button>
          {status === "denied" && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              წვდომა უარყოფილია. შეგიძლიათ{" "}
              <button
                type="button"
                onClick={() => void request()}
                className="underline underline-offset-2 font-semibold"
              >
                ხელახლა ცადოთ
              </button>
              .
            </p>
          )}
        </div>
      )}

      {status === "prompting" && !location && (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          იძებნება მდებარეობა…
        </div>
      )}

      {location && nearby.length === 0 && (
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 text-center">
          <div className="text-3xl mb-2">🥲</div>
          <p className="text-sm text-muted-foreground">თქვენთან ახლოს აქტიური შეთავაზებები ვერ მოიძებნა.</p>
          {radius < 20 && (
            <button
              type="button"
              onClick={() => {
                const next = (radius === 1 ? 3 : radius === 3 ? 5 : radius === 5 ? 10 : 20) as RadiusOption;
                setRadius(next);
                setEffectiveRadius(next);
              }}
              className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-secondary text-foreground text-xs font-semibold press"
            >
              რადიუსის გაზრდა
            </button>
          )}
        </div>
      )}

      {location && nearby.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {nearby.slice(0, 6).map((o) => (
            <div key={o.id} className="relative">
              <OfferCard offer={o} />
              <div className="absolute top-2 left-2 z-10 bg-card/95 backdrop-blur px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border border-border flex items-center gap-1">
                <Navigation className="w-3 h-3 text-primary" />
                {formatDistance(o._distanceKm)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default NearbyOffersSection;
