import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft, Clock, MapPin, Star, Heart, Truck, ShoppingBag, Shield, Leaf,
  Share2, Navigation, Info, AlertTriangle, Utensils, ChevronRight, Check,
} from "lucide-react";
import {
  findOffer, formatPrice, getCategoryLabel, getDistrictLabel, getOfferText, getStoreName,
  getAllergens, getIngredients, getPickupInstructions, getSimilarOffers,
} from "@/lib/mock-data";
import { toggleFavorite, useFavorites, trackOfferView, isTrustedPartner } from "@/lib/storage";
import { allergenLabels } from "@/lib/allergens";
import { createOrder as createOrderDb } from "@/lib/db";
import { dispatchDelivery } from "@/lib/delivery/dispatch.functions";
import { startBogCheckout, startBogGooglePayCheckout } from "@/lib/payments/bog.functions";
import { ReviewSection } from "@/components/ReviewSection";
import { OfferMiniMap } from "@/components/OfferMiniMap";
import { OfferCard } from "@/components/OfferCard";
import { GooglePayButton } from "@/components/GooglePayButton";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/offer/$id")({
  loader: async ({ params }) => {
    // Real database first — never merge with mocks on a purchase surface.
    try {
      const { fetchOffer } = await import("@/lib/db");
      const { dbOfferToCardOffer } = await import("@/lib/db-adapter");
      const row = await fetchOffer(params.id);
      if (row) return { offer: dbOfferToCardOffer(row), realDb: true };
    } catch {
      // ignore — fall through
    }
    // Fallback: mock/demo pages (browse-only, purchase disabled).
    const offer = findOffer(params.id);
    if (offer) return { offer, realDb: false };
    throw notFound();
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.offer.title} — ${loaderData.offer.storeName} | Cheaper` },
          { name: "description", content: loaderData.offer.description },
          { property: "og:title", content: `${loaderData.offer.title} — Cheaper` },
          { property: "og:description", content: loaderData.offer.description },
          { property: "og:image", content: loaderData.offer.image },
        ]
      : [{ title: "შემოთავაზება — Cheaper" }, { name: "robots", content: "noindex" }],
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
  const { t, language } = useI18n();
  const { offer, realDb } = Route.useLoaderData();
  const dispatchDeliveryFn = useServerFn(dispatchDelivery);
  const startBogCheckoutFn = useServerFn(startBogCheckout);
  const startBogGooglePayFn = useServerFn(startBogGooglePayCheckout);
  const offerText = getOfferText(offer, language);
  const storeName = getStoreName(offer, language);
  const navigate = useNavigate();
  const { user } = useAuth();
  const favs = useFavorites();
  const isFav = favs.includes(offer.storeId);
  const [mounted, setMounted] = useState(false);
  const trusted = mounted && isTrustedPartner(offer.storeId);

  const [method, setMethod] = useState<"აღება" | "მიტანა">("აღება");
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"TBC" | "BOG" | "GPAY" | "COD">("BOG");
  const [copied, setCopied] = useState(false);

  const deliveryFee = method === "მიტანა" ? offer.deliveryFee : 0;
  const total = offer.price * quantity + deliveryFee;
  const discount = Math.round((1 - offer.price / offer.originalPrice) * 100);
  const soldOut = offer.itemsLeft <= 0;

  const allergens = useMemo<string[]>(() => {
    if (offer.allergens && offer.allergens.length > 0) {
      return allergenLabels(offer.allergens, language);
    }
    return getAllergens(offer, language);
  }, [offer, language]);
  const ingredients = useMemo(() => getIngredients(offer, language), [offer, language]);
  const pickupInstructions = useMemo(() => getPickupInstructions(offer, language), [offer, language]);
  const similar = useMemo(() => getSimilarOffers(offer, 4), [offer]);

  useEffect(() => {
    setMounted(true);
    trackOfferView(offer.id);
    try {
      const KEY = "cheaper:recent-views";
      const raw = localStorage.getItem(KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [offer.id, ...list.filter((x) => x !== offer.id)].slice(0, 10);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, [offer.id]);

  async function handleReserve() {
    if (soldOut) return;
    if (!realDb) {
      toast.error(language === "en"
        ? "This is a demo listing — not available for purchase."
        : language === "ru"
        ? "Это демо-предложение — покупка недоступна."
        : "დემო შემოთავაზება — შეძენა შეუძლებელია.");
      return;
    }
    if (!user) {
      // Remember where to return after sign-in
      try {
        sessionStorage.setItem("cheaper:next", `/offer/${offer.id}`);
      } catch {}
      navigate({ to: "/auth" });
      return;
    }
    try {
      const isDelivery = method === "მიტანა";
      const methodDb: "pickup" | "delivery" = isDelivery ? "delivery" : "pickup";

      // Cash / Pay-at-pickup: unchanged legacy flow — creates a paid order immediately.
      if (payment === "COD") {
        const order = await createOrderDb({
          offer_id: offer.id,
          store_id: offer.storeId,
          amount: total,
          quantity,
          method: methodDb,
          delivery_address: isDelivery ? address : undefined,
        });
        if (isDelivery) {
          dispatchDeliveryFn({ data: { orderId: order.id } }).catch(() => {});
        }
        navigate({ to: "/orders/$id", params: { id: order.id } });
        return;
      }

      // Card / wallet payments → Bank of Georgia Hosted Payment Page.
      // Server creates a PENDING order and returns the hosted redirect URL.
      // Order flips to paid only after BOG's server-to-server callback is
      // independently verified against BOG's API.
      const { redirectUrl } = await startBogCheckoutFn({
        data: {
          offerId: offer.id,
          storeId: offer.storeId,
          amount: total,
          quantity,
          method: methodDb,
          deliveryAddress: isDelivery ? address : undefined,
        },
      });
      window.location.href = redirectUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }


  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareText = `${offerText.title} — ${storeName} · ${formatPrice(offer.price)} (-${discount}%)`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: offerText.title, text: shareText, url });
        return;
      }
    } catch { /* user dismissed */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const gmapsUrl = offer.lat && offer.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${offer.lat},${offer.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${offer.address}, ${offer.district}`)}`;

  // ---- Localized labels ----
  const L = {
    back: language === "en" ? "Back" : language === "ru" ? "Назад" : t("back"),
    share: language === "en" ? "Share" : language === "ru" ? "Поделиться" : "გაზიარება",
    copied: language === "en" ? "Link copied" : language === "ru" ? "Ссылка скопирована" : "ბმული დაკოპირდა",
    aboutBag: language === "en" ? "About this surprise bag" : language === "ru" ? "Об этом пакете" : "პაკეტის შესახებ",
    ingredients: language === "en" ? "May include" : language === "ru" ? "Возможный состав" : "შესაძლო შემადგენლობა",
    allergens: language === "en" ? "Allergens" : language === "ru" ? "Аллергены" : "ალერგენები",
    noAllergens: language === "en" ? "No common allergens listed" : language === "ru" ? "Без распространённых аллергенов" : "გავრცელებული ალერგენების გარეშე",
    pickupHow: language === "en" ? "Pickup instructions" : language === "ru" ? "Инструкции по получению" : "აღების ინსტრუქცია",
    getDirections: language === "en" ? "Get directions" : language === "ru" ? "Построить маршрут" : "მარშრუტი",
    aboutStore: language === "en" ? "About the partner" : language === "ru" ? "О партнёре" : "პარტნიორის შესახებ",
    trustedPartner: language === "en" ? "Trusted partner" : language === "ru" ? "Надёжный партнёр" : "სანდო პარტნიორი",
    similar: language === "en" ? "Similar offers" : language === "ru" ? "Похожие предложения" : "მსგავსი შემოთავაზებები",
    soldOut: language === "en" ? "Sold out" : language === "ru" ? "Распродано" : "გაყიდულია",
    reviews: t("gift") /* placeholder unused */,
  };

  return (
    <div className="pb-6">
      {/* ---- Image "gallery" ---- */}
      <div className="relative aspect-[4/3] bg-muted">
        <img
          src={offer.image}
          alt={offerText.title}
          width={1200}
          height={900}
          className={`w-full h-full object-cover ${soldOut ? "grayscale opacity-80" : ""}`}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

        <button
          onClick={() => history.back()}
          className="absolute top-4 left-4 w-11 h-11 rounded-full bg-card/95 backdrop-blur grid place-items-center shadow-soft active:scale-95 transition-transform pt-[env(safe-area-inset-top)]"
          aria-label={L.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-full bg-card/95 backdrop-blur grid place-items-center shadow-soft active:scale-95 transition-transform"
            aria-label={L.share}
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => toggleFavorite(offer.storeId)}
            className="w-11 h-11 rounded-full bg-card/95 backdrop-blur grid place-items-center shadow-soft active:scale-95 transition-transform"
            aria-label="favorite"
          >
            <Heart className={`w-5 h-5 ${isFav ? "fill-destructive text-destructive" : ""}`} />
          </button>
        </div>

        {/* Image dots (single image but visually indicates gallery) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <span className="w-6 h-1.5 rounded-full bg-white/90" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
          <span className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-soft">
            -{discount}%
          </span>
          {soldOut && (
            <span className="px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold shadow-soft">
              {L.soldOut}
            </span>
          )}
        </div>

        {copied && (
          <div className="absolute top-20 inset-x-0 mx-auto w-fit px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold animate-fade-in">
            <Check className="inline w-3.5 h-3.5 mr-1" /> {L.copied}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-2xl px-4 -mt-6 relative space-y-3 sm:space-y-4">
        {/* ---- Store header + title + meta ---- */}
        <div className="bg-card rounded-3xl shadow-elevated p-4 sm:p-5 border border-border">

          <Link
            to="/store/$id"
            params={{ id: offer.storeId }}
            className="flex items-center gap-3 -m-1 p-1 rounded-2xl hover:bg-secondary/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl gradient-warm grid place-items-center text-2xl shrink-0">{offer.storeLogo}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <div className="font-bold truncate">{storeName}</div>
                {trusted && <Shield className="w-3.5 h-3.5 text-primary shrink-0" aria-label={L.trustedPartner} />}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {offer.rating} <span className="text-muted-foreground/70">({offer.reviewCount})</span></span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-semibold uppercase">{getCategoryLabel(offer.category, language)}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>

          <h1 className="mt-4 text-[22px] leading-tight font-display font-bold">{offerText.title}</h1>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatChip icon={<Clock className="w-4 h-4 text-primary" />} label={t("pickupTime")}>
              <div className="font-semibold text-sm">{offer.pickupFrom}–{offer.pickupTo}</div>
            </StatChip>
            <StatChip icon={<MapPin className="w-4 h-4 text-primary" />} label={language === "en" ? "Distance" : language === "ru" ? "Расстояние" : "მანძილი"}>
              <div className="font-semibold text-sm">{offer.distanceKm} {t("km")}</div>
            </StatChip>
            <StatChip icon={<ShoppingBag className="w-4 h-4 text-primary" />} label={t("left")}>
              <div className={`font-semibold text-sm ${soldOut ? "text-destructive" : ""}`}>
                {soldOut ? "0" : offer.itemsLeft}
              </div>
            </StatChip>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-success bg-success/10 rounded-xl p-2.5">
            <Leaf className="w-4 h-4 shrink-0" />
            <span>{t("impactLine")}</span>
          </div>
        </div>

        {/* ---- Description ---- */}
        <SectionCard icon={<Info className="w-4 h-4 text-primary" />} title={L.aboutBag}>
          <p className="text-sm text-muted-foreground leading-relaxed">{offerText.description}</p>
        </SectionCard>

        {/* ---- Ingredients ---- */}
        {ingredients.length > 0 && (
          <SectionCard icon={<Utensils className="w-4 h-4 text-primary" />} title={L.ingredients}>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold">
                  {i}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ---- Allergens ---- */}
        <SectionCard icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} title={L.allergens}>
          {allergens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{L.noAllergens}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allergens.map((a) => (
                <span key={a} className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/20">
                  ⚠ {a}
                </span>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ---- Pickup instructions ---- */}
        <SectionCard icon={<Clock className="w-4 h-4 text-primary" />} title={L.pickupHow}>
          <p className="text-sm text-muted-foreground leading-relaxed">{pickupInstructions}</p>
          <div className="mt-3 text-sm">
            <div className="font-medium">{offer.address}</div>
            <div className="text-xs text-muted-foreground">{getDistrictLabel(offer.district, language)}</div>
          </div>
        </SectionCard>

        {/* ---- Map + directions button ---- */}
        <div className="bg-card rounded-3xl shadow-card border border-border overflow-hidden">
          <OfferMiniMap offer={offer} />
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 border-t border-border font-semibold text-sm text-primary active:scale-[0.99] transition-transform"
          >
            <Navigation className="w-4 h-4" /> {L.getDirections}
          </a>
        </div>

        {/* ---- Method selector ---- */}
        <div className="bg-card rounded-3xl shadow-card p-4 sm:p-5 border border-border">

          <div className="font-bold mb-3">{t("howReceive")}</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("აღება")}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                method === "აღება" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <ShoppingBag className="w-5 h-5 text-primary" />
              <div className="text-sm font-bold mt-1">{t("pickupInStore")}</div>
              <div className="text-xs text-muted-foreground">{t("free")}</div>
            </button>
            <button
              disabled={!offer.delivery}
              onClick={() => setMethod("მიტანა")}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all disabled:opacity-40 active:scale-[0.98] ${
                method === "მიტანა" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Truck className="w-5 h-5 text-primary" />
              <div className="text-sm font-bold mt-1">{t("delivery")}</div>
              <div className="text-xs text-muted-foreground">
                {offer.delivery ? `+${formatPrice(offer.deliveryFee)}` : t("unavailable")}
              </div>
            </button>
          </div>

          {method === "მიტანა" && (
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("deliveryAddress")}
              style={{}}
              className="mt-3 w-full px-4 py-3 rounded-2xl bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          )}

          <div className="mt-5">
            <div className="text-sm font-bold mb-2">{t("quantity")}</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border border-border grid place-items-center text-lg active:scale-95 transition-transform"
              >−</button>
              <span className="font-bold w-8 text-center text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(offer.itemsLeft, q + 1))}
                disabled={quantity >= offer.itemsLeft}
                className="w-10 h-10 rounded-full border border-border grid place-items-center text-lg disabled:opacity-40 active:scale-95 transition-transform"
              >+</button>
              <span className="text-xs text-muted-foreground ml-2">{t("left")} {offer.itemsLeft}</span>
            </div>
          </div>
        </div>

        {/* ---- Payment ---- */}
        <div className="bg-card rounded-3xl shadow-card p-4 sm:p-5 border border-border">
          <div className="font-bold mb-3">{t("paymentMethod")}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { id: "BOG", label: "ბარათით (BOG)", icon: "💳" },
              { id: "GPAY", label: "Google Pay", icon: "🟢" },
              { id: "TBC", label: "TBC Pay", icon: "🏦" },
              { id: "COD", label: t("payAtPickup"), icon: "💵" },

            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPayment(p.id as typeof payment)}
                className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  payment === p.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-lg">{p.icon}</span>
                <span className="font-medium text-left">{p.label}</span>
              </button>
            ))}
          </div>

          {payment === "GPAY" && (
            <div className="mt-4">
              <GooglePayButton
                amount={total}
                currency="GEL"
                disabled={soldOut || (method === "მიტანა" && address.length < 3)}
                onPaymentAuthorized={async (googlePayToken) => {
                  if (!realDb) {
                    toast.error(language === "en"
                      ? "This is a demo listing — not available for purchase."
                      : language === "ru"
                      ? "Это демо-предложение — покупка недоступна."
                      : "დემო შემოთავაზება — შეძენა შეუძლებელია.");
                    return;
                  }
                  if (!user) {
                    try { sessionStorage.setItem("cheaper:next", `/offer/${offer.id}`); } catch {}
                    navigate({ to: "/auth" });
                    return;
                  }
                  try {
                    const isDelivery = method === "მიტანა";
                    const { orderId, redirectUrl } = await startBogGooglePayFn({
                      data: {
                        offerId: offer.id,
                        storeId: offer.storeId,
                        amount: total,
                        quantity,
                        method: isDelivery ? "delivery" : "pickup",
                        deliveryAddress: isDelivery ? address : undefined,
                        googlePayToken,
                      },
                    });
                    // 3DS challenge required — hand off to BOG. Otherwise
                    // land on the order page; the callback webhook will
                    // flip status to `paid` after server-to-server verify.
                    if (redirectUrl) {
                      window.location.href = redirectUrl;
                    } else {
                      navigate({ to: "/orders/$id", params: { id: orderId } });
                    }
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : String(e));
                  }
                }}
                onFallback={() => setPayment("BOG")}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {language === "en"
                  ? "Google Pay (TEST mode) — 3DS may be required to complete the charge."
                  : language === "ru"
                  ? "Google Pay (тест) — может потребоваться 3DS-подтверждение."
                  : "Google Pay (ტესტ-რეჟიმი) — შესაძლოა საჭირო გახდეს 3DS-დადასტურება."}
              </p>
            </div>
          )}


          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" /> {t("safePayment")}
          </div>
        </div>


        {/* ---- Partner information ---- */}
        <SectionCard icon={<Shield className="w-4 h-4 text-primary" />} title={L.aboutStore}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl gradient-warm grid place-items-center text-3xl shrink-0">
              {offer.storeLogo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold flex items-center gap-1.5">
                {storeName}
                {trusted && <Shield className="w-3.5 h-3.5 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {offer.rating} · {offer.reviewCount} {language === "en" ? "reviews" : language === "ru" ? "отзывов" : "შეფასება"}
              </div>
              {trusted && (
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Shield className="w-3 h-3" /> {L.trustedPartner}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ---- Reviews ---- */}
        <ReviewSection offerId={offer.id} storeId={offer.storeId} />

        {/* ---- Similar offers ---- */}
        {similar.length > 0 && (
          <section className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Utensils className="w-4 h-4 text-primary" /> {L.similar}
              </h2>
              <Link to="/search" className="text-xs font-semibold text-primary flex items-center gap-0.5">
                {language === "en" ? "See all" : language === "ru" ? "Все" : "ყველა"} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {similar.map((s) => (
                <div key={s.id} className="snap-start shrink-0 w-[260px]">
                  <OfferCard offer={s} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-24" />
      </div>

      {/* ---- Sticky bottom purchase bar ---- */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
              {t("total")}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-primary">{formatPrice(total)}</div>
              <div className="text-xs text-muted-foreground line-through truncate">
                {formatPrice(offer.originalPrice * quantity + deliveryFee)}
              </div>
            </div>
          </div>
          <button
            onClick={handleReserve}
            disabled={soldOut || (method === "მიტანა" && address.length < 3)}
            className="px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-soft hover:opacity-90 disabled:opacity-40 active:scale-95 transition-all"
          >
            {soldOut
              ? L.soldOut
              : !user
              ? (language === "en" ? "Sign in to reserve" : language === "ru" ? "Войти для брони" : "შედი დასაჯავშნად")
              : t("reserve")}
          </button>
        </div>
      </div>
    </div>
  );
}



function SectionCard({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-3xl shadow-card p-4 sm:p-5 border border-border">
      <h2 className="font-bold text-[15px] flex items-center gap-2 mb-3">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function StatChip({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/70 rounded-2xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
