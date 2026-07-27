import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, MapPin, Heart, Truck, Sparkles, Flame, TimerReset, ShieldCheck, Star, Gift, ImageOff } from "lucide-react";
import type { Offer } from "@/lib/mock-data";
import { formatPrice, getCategoryLabel, getOfferText, getStoreName } from "@/lib/mock-data";
import { toggleFavorite, useFavorites, isTrustedPartner } from "@/lib/storage";
import { useI18n } from "@/lib/i18n";
import { StoreLogo } from "@/components/StoreLogo";

function minutesUntil(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date(); target.setHours(h, m, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

function isLikelyImageUrl(src: string | undefined | null): boolean {
  if (!src) return false;
  const s = src.trim();
  if (!s) return false;
  if (s.startsWith("data:image/")) return true;
  if (s.startsWith("blob:")) return true;
  if (s.startsWith("/")) return true;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    // Reject search / non-image endpoints (e.g. google.com/search)
    if (/\/search(\/|$|\?)/i.test(u.pathname + (u.search ? "?" : ""))) return false;
    return true;
  } catch { return false; }
}

function OfferImage({ src, alt, soldOut, fallbackLabel }: { src: string; alt: string; soldOut: boolean; fallbackLabel: string }) {
  const [failed, setFailed] = useState(!isLikelyImageUrl(src));
  useEffect(() => { setFailed(!isLikelyImageUrl(src)); }, [src]);
  const base = `w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${soldOut ? "grayscale opacity-70" : ""}`;
  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/40 text-muted-foreground">
        <ImageOff className="w-10 h-10 opacity-60" />
        <span className="text-xs font-medium">{fallbackLabel}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={800}
      height={600}
      className={base}
      onError={() => setFailed(true)}
    />
  );
}

export function OfferCard({ offer }: { offer: Offer }) {
  const { t, language } = useI18n();

  const favs = useFavorites();
  const [mounted, setMounted] = useState(false);
  const isFav = mounted && favs.includes(offer.storeId);
  const discount = Math.round((1 - offer.price / offer.originalPrice) * 100);
  const offerText = getOfferText(offer, language);
  const storeName = getStoreName(offer, language);

  // Ticker so badges (NEW / Ending Soon) refresh over time
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const ageMin = offer.createdAt ? (Date.now() - offer.createdAt) / 60000 : Infinity;
  const isNew = mounted && ageMin <= 10;
  const minsLeft = minutesUntil(offer.pickupTo);
  const endingSoon = mounted && minsLeft > 0 && minsLeft <= 60;
  const almostGone = offer.itemsLeft <= 3 && offer.itemsLeft > 0;
  const trusted = mounted && isTrustedPartner(offer.storeId);
  // reference tick so useEffect refresh triggers re-render
  void tick;

  const soldOut = offer.itemsLeft <= 0;

  return (
    <Link
      to="/offer/$id"
      params={{ id: offer.id }}
      className="group block rounded-3xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border/60 active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <OfferImage
          src={offer.image}
          alt={offerText.title}
          soldOut={soldOut}
          fallbackLabel={getCategoryLabel(offer.category, language)}
        />


        {/* left badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[75%]">
          <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            -{discount}%
          </span>
          {isNew && !soldOut && (
            <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {t("badgeNew")}
            </span>
          )}
          {endingSoon && !soldOut && (
            <span className="px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1">
              <TimerReset className="w-3 h-3" /> {t("badgeEndingSoon")}
            </span>
          )}
          {almostGone && !soldOut && (
            <span className="px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3" /> {t("badgeAlmostGone")}
            </span>
          )}
          {offer.isSurprise && !soldOut && (
            <span className="px-2 py-1 rounded-full bg-fuchsia-500 text-white text-[10px] font-bold flex items-center gap-1">
              <Gift className="w-3 h-3" /> {t("badgeSurprise")}
            </span>
          )}
        </div>

        {/* right badges */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <button
            onClick={(e) => { e.preventDefault(); toggleFavorite(offer.storeId); }}
            className="w-9 h-9 rounded-full bg-card/95 grid place-items-center hover:scale-110 active:scale-95 transition-transform shadow-soft"
            aria-label="favorite"
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-destructive text-destructive" : "text-foreground"}`} />
          </button>
          {offer.rating > 0 && (
            <span className="px-2 py-1 rounded-full bg-card/95 text-foreground text-[10px] font-bold flex items-center gap-1 shadow-soft">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {offer.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* sold out overlay */}
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <span className="px-4 py-2 rounded-full bg-card text-foreground text-sm font-bold uppercase tracking-wider">
              {language === "en" ? "Sold out" : language === "ru" ? "Распродано" : "გაყიდულია"}
            </span>
          </div>
        )}

        {/* bottom pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-card grid place-items-center text-lg shadow-soft shrink-0">
            {offer.storeLogo}
          </div>
          <div className="flex-1 min-w-0 text-card-foreground bg-card/95 rounded-xl px-2.5 py-1.5">
            <div className="text-xs font-bold truncate flex items-center gap-1">
              {storeName}
              {trusted ? <ShieldCheck className="w-3 h-3 text-primary shrink-0" aria-label={t("badgeTrusted")} /> : <span className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {isFav ? <Heart className="w-3 h-3 fill-destructive text-destructive shrink-0" aria-label={t("badgeFavStore")} /> : <span className="w-3 h-3 shrink-0" aria-hidden="true" />}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2 sm:p-4 sm:space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
            {getCategoryLabel(offer.category, language)}
          </span>
          {offer.delivery && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center gap-1">
              <Truck className="w-3 h-3" /> {t("delivery")}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2">{offerText.title}</h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {offer.distanceKm > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {offer.distanceKm} {t("km")}
            </span>
          )}
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
          <div className={`text-xs font-semibold ${soldOut ? "text-destructive" : almostGone ? "text-amber-600" : "text-muted-foreground"}`}>
            {soldOut
              ? language === "en" ? "Sold out" : language === "ru" ? "Нет" : "არ არის"
              : <>{t("left")} <span className="text-foreground font-bold">{offer.itemsLeft}</span></>}
          </div>
        </div>
      </div>
    </Link>
  );
}
