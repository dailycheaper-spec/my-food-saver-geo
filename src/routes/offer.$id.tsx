import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, MapPin, Star, Heart, Truck, ShoppingBag, Shield, Leaf } from "lucide-react";
import { findOffer, formatPrice } from "@/lib/mock-data";
import { createOrder, toggleFavorite, useFavorites, trackOfferView, trackPurchase } from "@/lib/storage";
import { ReviewSection } from "@/components/ReviewSection";
import { OfferMiniMap } from "@/components/OfferMiniMap";

export const Route = createFileRoute("/offer/$id")({
  loader: ({ params }) => {
    const offer = findOffer(params.id);
    if (!offer) throw notFound();
    return { offer };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.offer.title} — ${loaderData.offer.storeName} | გემო` },
          { name: "description", content: loaderData.offer.description },
          { property: "og:title", content: `${loaderData.offer.title} — გემო` },
          { property: "og:description", content: loaderData.offer.description },
          { property: "og:image", content: loaderData.offer.image },
        ]
      : [{ title: "შემოთავაზება — გემო" }, { name: "robots", content: "noindex" }],
  }),
  component: OfferPage,
  notFoundComponent: () => (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">შემოთავაზება ვერ მოიძებნა.</p>
      <Link to="/" className="text-primary underline text-sm mt-2 inline-block">მთავარზე დაბრუნება</Link>
    </div>
  ),
});

function OfferPage() {
  const { offer } = Route.useLoaderData();
  const navigate = useNavigate();
  const favs = useFavorites();
  const isFav = favs.includes(offer.storeId);

  const [method, setMethod] = useState<"აღება" | "მიტანა">(offer.delivery ? "მიტანა" : "აღება");
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"TBC" | "BOG" | "APPLE" | "COD">("TBC");

  const deliveryFee = method === "მიტანა" ? offer.deliveryFee : 0;
  const total = offer.price * quantity + deliveryFee;
  const discount = Math.round((1 - offer.price / offer.originalPrice) * 100);

  useEffect(() => { trackOfferView(offer.id); }, [offer.id]);

  function handleReserve() {
    const order = createOrder({
      offerId: offer.id,
      storeName: offer.storeName,
      storeLogo: offer.storeLogo,
      title: offer.title,
      image: offer.image,
      price: total,
      quantity,
      method,
      address: method === "მიტანა" ? address : undefined,
      pickupFrom: offer.pickupFrom,
      pickupTo: offer.pickupTo,
    });
    trackPurchase(offer.storeId, offer.storeName, offer.storeLogo, total);
    navigate({ to: "/orders/$id", params: { id: order.id } });
  }

  return (
    <div>
      <div className="relative aspect-[4/3] bg-muted">
        <img src={offer.image} alt={offer.title} width={1200} height={900} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
        <button
          onClick={() => history.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-card/95 grid place-items-center shadow-soft"
          aria-label="უკან"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => toggleFavorite(offer.storeId)}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card/95 grid place-items-center shadow-soft"
        >
          <Heart className={`w-5 h-5 ${isFav ? "fill-destructive text-destructive" : ""}`} />
        </button>
        <span className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold">
          -{discount}%
        </span>
      </div>

      <div className="mx-auto max-w-2xl px-4 -mt-6 relative">
        <div className="bg-card rounded-2xl shadow-elevated p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-warm grid place-items-center text-2xl">{offer.storeLogo}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{offer.storeName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-accent text-accent" /> {offer.rating}</span>
                <span>•</span>
                <span>{offer.category}</span>
              </div>
            </div>
          </div>

          <h1 className="mt-4 text-xl font-display font-bold">{offer.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{offer.description}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground">აღების დრო</div>
              <div className="font-semibold flex items-center gap-1 mt-0.5">
                <Clock className="w-4 h-4 text-primary" />
                {offer.pickupFrom}–{offer.pickupTo}
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground">მდებარეობა</div>
              <div className="font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-4 h-4 text-primary" />
                {offer.distanceKm} კმ
              </div>
            </div>
          </div>

          <div className="mt-3 text-sm">
            <div className="text-xs text-muted-foreground">მისამართი</div>
            <div className="font-medium">{offer.address}, {offer.district}</div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-success bg-success/10 rounded-lg p-2.5">
            <Leaf className="w-4 h-4" />
            ამ პაკეტის ყიდვით გადაარჩენ ~1.2 კგ CO₂-ს
          </div>
        </div>

        <OfferMiniMap offer={offer} />

        {/* Method selector */}
        <div className="mt-4 bg-card rounded-2xl shadow-card p-5 border border-border">
          <div className="font-semibold mb-3">როგორ მიიღებ?</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("აღება")}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                method === "აღება" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <ShoppingBag className="w-5 h-5 text-primary" />
              <div className="text-sm font-semibold mt-1">ადგილზე აღება</div>
              <div className="text-xs text-muted-foreground">უფასო</div>
            </button>
            <button
              disabled={!offer.delivery}
              onClick={() => setMethod("მიტანა")}
              className={`p-3 rounded-xl border-2 text-left transition-all disabled:opacity-40 ${
                method === "მიტანა" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Truck className="w-5 h-5 text-primary" />
              <div className="text-sm font-semibold mt-1">მიტანა</div>
              <div className="text-xs text-muted-foreground">
                {offer.delivery ? `+${formatPrice(offer.deliveryFee)}` : "მიუწვდომელი"}
              </div>
            </button>
          </div>

          {method === "მიტანა" && (
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="მიტანის მისამართი..."
              className="mt-3 w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          )}

          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">რაოდენობა</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full border border-border grid place-items-center"
              >−</button>
              <span className="font-semibold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(offer.itemsLeft, q + 1))}
                className="w-9 h-9 rounded-full border border-border grid place-items-center"
              >+</button>
              <span className="text-xs text-muted-foreground ml-2">დარჩა {offer.itemsLeft}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="mt-4 bg-card rounded-2xl shadow-card p-5 border border-border">
          <div className="font-semibold mb-3">გადახდის მეთოდი</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { id: "TBC", label: "TBC Pay", icon: "🏦" },
              { id: "BOG", label: "BOG e-commerce", icon: "🏛️" },
              { id: "APPLE", label: "Apple / Google Pay", icon: "📱" },
              { id: "COD", label: "ადგილზე გადახდა", icon: "💵" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPayment(p.id as typeof payment)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  payment === p.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-lg">{p.icon}</span>
                <span className="font-medium text-left">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" /> უსაფრთხო გადახდა SSL დაცვით
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div className="mt-4 bg-card rounded-2xl shadow-card p-5 border border-border mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground">ჯამი</div>
              <div className="text-2xl font-bold text-primary">{formatPrice(total)}</div>
              <div className="text-xs text-muted-foreground line-through">
                ნაცვლად {formatPrice(offer.originalPrice * quantity + deliveryFee)}
              </div>
            </div>
            <button
              onClick={handleReserve}
              disabled={method === "მიტანა" && address.length < 3}
              className="px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-soft hover:opacity-90 disabled:opacity-50"
            >
              დაჯავშნა
            </button>
        </div>

        <ReviewSection offerId={offer.id} storeId={offer.storeId} />
        </div>
      </div>
    </div>
  );
}
