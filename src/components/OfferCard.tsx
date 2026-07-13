import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Star, Heart, Truck } from "lucide-react";
import type { Offer } from "@/lib/mock-data";
import { formatPrice } from "@/lib/mock-data";
import { toggleFavorite, useFavorites } from "@/lib/storage";

export function OfferCard({ offer }: { offer: Offer }) {
  const favs = useFavorites();
  const isFav = favs.includes(offer.storeId);
  const discount = Math.round((1 - offer.price / offer.originalPrice) * 100);

  return (
    <Link
      to="/offer/$id"
      params={{ id: offer.id }}
      className="group block rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={offer.image}
          alt={offer.title}
          loading="lazy"
          width={800}
          height={600}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            -{discount}%
          </span>
          {offer.delivery && (
            <span className="px-2.5 py-1 rounded-full bg-card/90 text-foreground text-xs font-medium flex items-center gap-1">
              <Truck className="w-3 h-3" /> მიტანა
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.preventDefault(); toggleFavorite(offer.storeId); }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-card/95 grid place-items-center hover:scale-110 transition-transform"
          aria-label="ფავორიტებში დამატება"
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-destructive text-destructive" : "text-foreground"}`} />
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-card grid place-items-center text-lg shadow-soft">
            {offer.storeLogo}
          </div>
          <div className="flex-1 min-w-0 text-card-foreground bg-card/90 rounded-lg px-2 py-1">
            <div className="text-xs font-semibold truncate">{offer.storeName}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2">{offer.title}</h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            <span className="font-medium text-foreground">{offer.rating}</span>
            <span>({offer.reviewCount})</span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {offer.distanceKm} კმ
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {offer.pickupFrom}
          </span>
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <div className="text-xs text-muted-foreground line-through">{formatPrice(offer.originalPrice)}</div>
            <div className="text-lg font-bold text-primary">{formatPrice(offer.price)}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            დარჩა <span className="font-semibold text-foreground">{offer.itemsLeft}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
