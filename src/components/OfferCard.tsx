import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, MapPin, Heart, Truck, Sparkles, Flame, TimerReset, ShieldCheck } from "lucide-react";
import type { Offer } from "@/lib/mock-data";
import { formatPrice, getOfferText, getStoreName } from "@/lib/mock-data";
import { toggleFavorite, useFavorites, isTrustedPartner } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";

function minutesUntil(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date(); target.setHours(h, m, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

export function OfferCard({ offer }: { offer: Offer }) {
  const { t, language } = useI18n();
  const favs = useFavorites();
  const isFav = favs.includes(offer.storeId);
  const discount = Math.round((1 - offer.price / offer.originalPrice) * 100);
  const offerText = getOfferText(offer, language);
  const storeName = getStoreName(offer, language);

  // Ticker so badges (NEW / Ending Soon) refresh over time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const ageMin = offer.createdAt ? (Date.now() - offer.createdAt) / 60000 : Infinity;
  const isNew = ageMin <= 10;
  const minsLeft = minutesUntil(offer.pickupTo);
  const endingSoon = minsLeft > 0 && minsLeft <= 60;
  const almostGone = offer.itemsLeft <= 3 && offer.itemsLeft > 0;
  const trusted = isTrustedPartner(offer.storeId);
  // reference tick so useEffect refresh triggers re-render
  void tick;

  return (
    <Link
      to="/offer/$id"
      params={{ id: offer.id }}
      className="group block rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={offer.image}
          alt={offerText.title}
          loading="lazy"
          width={800}
          height={600}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[75%]">
          <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            -{discount}%
          </span>
          {isNew && (
            <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {t("badgeNew")}
            </span>
          )}
          {endingSoon && (
            <span className="px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1">
              <TimerReset className="w-3 h-3" /> {t("badgeEndingSoon")}
            </span>
          )}
          {almostGone && (
            <span className="px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3" /> {t("badgeAlmostGone")}
            </span>
          )}
          {offer.delivery && (
            <span className="px-2 py-1 rounded-full bg-card/90 text-foreground text-[10px] font-medium flex items-center gap-1">
              <Truck className="w-3 h-3" /> {t("delivery")}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); toggleFavorite(offer.storeId); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/95 grid place-items-center hover:scale-110 transition-transform"
          aria-label="favorite"
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-destructive text-destructive" : "text-foreground"}`} />
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-card grid place-items-center text-lg shadow-soft">
            {offer.storeLogo}
          </div>
          <div className="flex-1 min-w-0 text-card-foreground bg-card/90 rounded-lg px-2 py-1">
            <div className="text-xs font-semibold truncate flex items-center gap-1">
              {storeName}
              {trusted && <ShieldCheck className="w-3 h-3 text-primary shrink-0" aria-label={t("badgeTrusted")} />}
              {isFav && <Heart className="w-3 h-3 fill-destructive text-destructive shrink-0" aria-label={t("badgeFavStore")} />}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2">{offerText.title}</h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {offer.distanceKm} {t("km")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {offer.pickupFrom}–{offer.pickupTo}
          </span>
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-xs text-muted-foreground line-through">{formatPrice(offer.originalPrice)}</div>
            <div className="text-lg font-bold text-primary">{formatPrice(offer.price)}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("left")} <span className="font-semibold text-foreground">{offer.itemsLeft}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
