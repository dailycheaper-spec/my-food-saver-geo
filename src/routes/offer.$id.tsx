import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
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
import { startTbcCheckout } from "@/lib/payments/tbc.functions";
import { isNative, openExternal } from "@/lib/native";
import { ReviewSection } from "@/components/ReviewSection";
import { OfferMiniMap } from "@/components/OfferMiniMap";
import { OfferCard } from "@/components/OfferCard";
import { GooglePayButton } from "@/components/GooglePayButton";
import { StoreLogo } from "@/components/StoreLogo";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { useDeliveryAddress, formatDeliveryAddress } from "@/lib/delivery-address";
import { validateDeliveryLocation, deliveryZoneMessage } from "@/lib/delivery/zones";
import { useMyAddresses, formatAddressDetails, readLastAddressId } from "@/lib/addresses";

const AddressPicker = lazy(() => import("@/components/address/AddressPicker"));

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
  notFoundComponent: () => {
    const { t } = useI18n();
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">{t("offer.notFound")}</p>
        <Link to="/" className="text-primary underline text-sm mt-2 inline-block">{t("offer.backHome")}</Link>
      </div>
    );
  },
});

function OfferPage() {
  const { t, language } = useI18n();
  const { offer, realDb } = Route.useLoaderData();
  const dispatchDeliveryFn = useServerFn(dispatchDelivery);
  const startBogCheckoutFn = useServerFn(startBogCheckout);
  const startTbcCheckoutFn = useServerFn(startTbcCheckout);
  const startBogGooglePayFn = useServerFn(startBogGooglePayCheckout);
  const offerText = getOfferText(offer, language);
  const storeName = getStoreName(offer, language);
  const navigate = useNavigate();
  const { user } = useAuth();
  const favs = useFavorites();
  const isFav = favs.includes(offer.id);
  const [mounted, setMounted] = useState(false);
  const trusted = mounted && isTrustedPartner(offer.storeId);

  const [method, setMethod] = useState<"აღება" | "მიტანა">("აღება");
  const [quantity, setQuantity] = useState(1);
  const { address: selectedAddr, setAddress: setSelectedAddr } = useDeliveryAddress();
  const [pickerOpen, setPickerOpen] = useState(false);
  const address = formatDeliveryAddress(selectedAddr);
  const { data: savedAddresses = [] } = useMyAddresses(!!user && method === "მიტანა");

  // Fewer taps: pre-select the last used (or default) saved address the first
  // time delivery is chosen, so returning customers just confirm.
  useEffect(() => {
    if (method !== "მიტანა" || selectedAddr || savedAddresses.length === 0) return;
    const lastId = readLastAddressId();
    const pick =
      savedAddresses.find((a) => a.id === lastId) ??
      savedAddresses.find((a) => a.is_default) ??
      null;
    if (!pick) return;
    setSelectedAddr({
      id: pick.id,
      addressLine: pick.address_line,
      details: formatAddressDetails(pick, language),
      courierNote: pick.courier_note ?? "",
      lat: pick.lat,
      lng: pick.lng,
      placeId: pick.place_id ?? null,
    });
  }, [method, selectedAddr, savedAddresses, language, setSelectedAddr]);

  const deliveryZone = useMemo(
    () =>
      validateDeliveryLocation(
        selectedAddr ? { lat: selectedAddr.lat, lng: selectedAddr.lng } : null,
        { lat: offer.lat ?? null, lng: offer.lng ?? null, radiusKm: offer.deliveryRadiusKm ?? null },
      ),
    [selectedAddr, offer.lat, offer.lng, offer.deliveryRadiusKm],
  );
  const deliveryBlocked = method === "მიტანა" && !deliveryZone.allowed;
  const [customerNote, setCustomerNote] = useState("");
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
        : language === "tr"
        ? "Bu bir demo ilanıdır — satın alma için uygun değil."
        : language === "fa"
        ? "این یک آگهی نمایشی است — امکان خرید وجود ندارد."
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
    if (deliveryBlocked) {
      toast.error(deliveryZoneMessage(deliveryZone, language) ?? "");
      setPickerOpen(true);
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
          delivery_lat: isDelivery ? selectedAddr?.lat ?? null : null,
          delivery_lng: isDelivery ? selectedAddr?.lng ?? null : null,
          delivery_place_id: isDelivery ? selectedAddr?.placeId ?? null : null,
          customer_note: customerNote.trim() || undefined,
        });
        if (isDelivery) {
          dispatchDeliveryFn({ data: { orderId: order.id } }).catch((err) => {
            console.error("Delivery dispatch failed:", err);
            toast.error(language === "en"
              ? "Delivery couldn't be arranged automatically — the store will contact you."
              : language === "ru"
              ? "Не удалось автоматически организовать доставку — магазин свяжется с вами."
              : language === "tr"
              ? "Teslimat otomatik olarak ayarlanamadı — mağaza sizinle iletişime geçecek."
              : language === "fa"
              ? "امکان هماهنگی خودکار تحویل نبود — فروشگاه با شما تماس خواهد گرفت."
              : "მიწოდების ავტომატურად დაგეგმვა ვერ მოხერხდა — მაღაზია დაგიკავშირდებათ.");
          });
        }
        navigate({ to: "/orders/$id", params: { id: order.id } });
        return;
      }

      // Card payments → the selected bank's hosted payment page.
      // Server creates a PENDING order and returns the hosted redirect URL.
      // The order flips to paid only after the bank's server-to-server
      // callback is independently re-verified against the bank's API.
      const checkoutInput = {
        offerId: offer.id,
        storeId: offer.storeId,
        amount: total,
        quantity,
        method: methodDb,
        deliveryAddress: isDelivery ? address : undefined,
        deliveryLat: isDelivery ? selectedAddr?.lat ?? null : null,
        deliveryLng: isDelivery ? selectedAddr?.lng ?? null : null,
        deliveryPlaceId: isDelivery ? selectedAddr?.placeId ?? null : null,
        customerNote: customerNote.trim() || undefined,
        nativeReturn: isNative(),
      };
      const { redirectUrl } =
        payment === "TBC"
          ? await startTbcCheckoutFn({ data: { ...checkoutInput, language } })
          : await startBogCheckoutFn({ data: checkoutInput });
      await openExternal(redirectUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Store staff cannot place orders on their own store")) {
        toast.error(language === "en"
          ? "You can't order from your own store."
          : language === "ru"
          ? "Нельзя заказывать в своём собственном магазине."
          : language === "tr"
          ? "Kendi mağazanızdan sipariş veremezsiniz."
          : language === "fa"
          ? "شما نمی‌توانید از فروشگاه خودتان سفارش دهید."
          : "საკუთარი მაღაზიიდან შეკვეთის გაკეთება არ შეიძლება.");
      } else {
        toast.error(msg);
      }
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
    back: language === "en" ? "Back" : language === "ru" ? "Назад" : language === "tr" ? "Geri" : language === "fa" ? "بازگشت" : t("back"),
    share: language === "en" ? "Share" : language === "ru" ? "Поделиться" : language === "tr" ? "Paylaş" : language === "fa" ? "اشتراک‌گذاری" : "გაზიარება",
    copied: language === "en" ? "Link copied" : language === "ru" ? "Ссылка скопирована" : language === "tr" ? "Bağlantı kopyalandı" : language === "fa" ? "پیوند کپی شد" : "ბმული დაკოპირდა",
    aboutBag: language === "en" ? "About this surprise bag" : language === "ru" ? "Об этом пакете" : language === "tr" ? "Bu sürpriz paket hakkında" : language === "fa" ? "درباره این کیف شگفت‌انگیز" : "პაკეტის შესახებ",
    ingredients: language === "en" ? "May include" : language === "ru" ? "Возможный состав" : language === "tr" ? "İçerebilir" : language === "fa" ? "ممکن است شامل شود" : "შესაძლო შემადგენლობა",
    allergens: language === "en" ? "Allergens" : language === "ru" ? "Аллергены" : language === "tr" ? "Alerjenler" : language === "fa" ? "آلرژن‌ها" : "ალერგენები",
    noAllergens: language === "en" ? "No common allergens listed" : language === "ru" ? "Без распространённых аллергенов" : language === "tr" ? "Yaygın alerjen belirtilmemiş" : language === "fa" ? "آلرژن رایجی ذکر نشده است" : "გავრცელებული ალერგენების გარეშე",
    pickupHow: language === "en" ? "Pickup instructions" : language === "ru" ? "Инструкции по получению" : language === "tr" ? "Teslim alma talimatları" : language === "fa" ? "راهنمای تحویل‌گیری" : "აღების ინსტრუქცია",
    getDirections: language === "en" ? "Get directions" : language === "ru" ? "Построить маршрут" : language === "tr" ? "Yol tarifi al" : language === "fa" ? "دریافت مسیر" : "მარშრუტი",
    aboutStore: language === "en" ? "About the partner" : language === "ru" ? "О партнёре" : language === "tr" ? "Ortak hakkında" : language === "fa" ? "درباره همکار" : "პარტნიორის შესახებ",
    trustedPartner: language === "en" ? "Trusted partner" : language === "ru" ? "Надёжный партнёр" : language === "tr" ? "Güvenilir ortak" : language === "fa" ? "همکار مورد اعتماد" : "სანდო პარტნიორი",
    similar: language === "en" ? "Similar offers" : language === "ru" ? "Похожие предложения" : language === "tr" ? "Benzer fırsatlar" : language === "fa" ? "پیشنهادهای مشابه" : "მსგავსი შემოთავაზებები",
    soldOut: language === "en" ? "Sold out" : language === "ru" ? "Распродано" : language === "tr" ? "Tükendi" : language === "fa" ? "به فروش رفته" : "გაყიდულია",
    reviews: t("gift") /* placeholder unused */,
  };

  return (
    <div className="pb-32">
      {/* ---- Image "gallery" ---- */}
      <div className="relative aspect-[4/3] bg-muted">
        <ImageWithSkeleton
          src={offer.image}
          alt={offerText.title}
          priority
          aspect="absolute inset-0 w-full h-full"
          imgClassName={soldOut ? "grayscale opacity-80" : ""}
        />

        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

        <button
          onClick={() => history.back()}
          className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 w-11 h-11 rounded-full bg-card/95 backdrop-blur grid place-items-center shadow-soft active:scale-95 transition-transform"
          aria-label={L.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex gap-2">

          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-full bg-card/95 backdrop-blur grid place-items-center shadow-soft active:scale-95 transition-transform"
            aria-label={L.share}
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => toggleFavorite(offer.id)}
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
            <div className="w-12 h-12 rounded-2xl gradient-warm grid place-items-center text-2xl shrink-0 overflow-hidden"><StoreLogo value={offer.storeLogo} emojiClassName="text-2xl" alt={storeName} /></div>
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
            <StatChip icon={<MapPin className="w-4 h-4 text-primary" />} label={language === "en" ? "Distance" : language === "ru" ? "Расстояние" : language === "tr" ? "Mesafe" : language === "fa" ? "فاصله" : "მანძილი"}>
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
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-3 w-full flex items-start gap-3 px-4 py-3 rounded-2xl bg-secondary text-left border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span className="min-w-0 flex-1">
                {selectedAddr ? (
                  <>
                    <span className="block text-sm font-semibold truncate">{selectedAddr.addressLine}</span>
                    {(selectedAddr.details || selectedAddr.courierNote) && (
                      <span className="block text-xs text-muted-foreground truncate">
                        {[selectedAddr.details, selectedAddr.courierNote].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="block text-sm text-muted-foreground">{t("deliveryAddress")}</span>
                )}
              </span>
              <span className="text-xs font-semibold text-primary shrink-0 mt-0.5">
                {selectedAddr
                  ? language === "en" ? "Change" : language === "ru" ? "Изменить" : language === "tr" ? "Değiştir" : language === "fa" ? "تغییر" : "შეცვლა"
                  : language === "en" ? "Choose" : language === "ru" ? "Выбрать" : language === "tr" ? "Seç" : language === "fa" ? "انتخاب" : "არჩევა"}
              </span>
            </button>
          )}

          {deliveryBlocked && (
            <div className="mt-2 flex items-start justify-between gap-3 px-4 py-3 rounded-2xl bg-destructive/10 text-destructive text-xs" role="status">
              <span>{deliveryZoneMessage(deliveryZone, language)}</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="font-semibold underline shrink-0"
              >
                {language === "en" ? "Choose another" : language === "ru" ? "Выбрать другой" : language === "tr" ? "Başka seç" : language === "fa" ? "انتخاب دیگر" : "სხვის არჩევა"}
              </button>
            </div>
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

          <div className="mt-5">
            <label className="text-sm font-bold mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              {language === "en" ? "Special request (optional)" : language === "ru" ? "Особый запрос (необязательно)" : language === "tr" ? "Özel istek (isteğe bağlı)" : language === "fa" ? "درخواست خاص (اختیاری)" : "სპეციალური მოთხოვნა (არასავალდებულო)"}
            </label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value.slice(0, 300))}
              maxLength={300}
              rows={2}
              placeholder={language === "en" ? "e.g. no onions / no hazelnuts" : language === "ru" ? "напр.: без лука / без фундука" : language === "tr" ? "örn: soğansız / fındıksız" : language === "fa" ? "مثلاً بدون پیاز / بدون فندق" : "მაგ: ხახვის გარეშე / თხილის გარეშე"}
              className="w-full px-3 py-2.5 rounded-2xl bg-secondary border border-transparent focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
            />
            <div className="mt-1 flex items-start justify-between gap-2 text-[11px]">
              <p className="text-muted-foreground leading-snug flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 text-warm-foreground shrink-0" />
                <span>{language === "en"
                  ? "The partner will try to accommodate your request, but cannot fully guarantee it — please keep this in mind if you have serious allergies."
                  : language === "ru"
                  ? "Партнёр постарается учесть ваш запрос, но не может дать полной гарантии — при серьёзной аллергии, пожалуйста, учитывайте это при заказе."
                  : language === "tr"
                  ? "Ortak isteğinizi karşılamaya çalışacaktır ancak tam garanti veremez — ciddi alerjiniz varsa lütfen bunu göz önünde bulundurun."
                  : language === "fa"
                  ? "همکار تلاش می‌کند درخواست شما را در نظر بگیرد، اما نمی‌تواند آن را کاملاً تضمین کند — در صورت داشتن آلرژی جدی، لطفاً این را در نظر بگیرید."
                  : "პარტნიორი შეეცდება გაითვალისწინოს თქვენი მოთხოვნა, თუმცა სრულ გარანტიას ვერ იძლევა — სერიოზული ალერგიის შემთხვევაში."}</span>
              </p>
              <span className="text-muted-foreground shrink-0 tabular-nums">{customerNote.length}/300</span>
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
              { id: "TBC", label: "ბარათით (TBC)", icon: "🏦" },
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
                disabled={soldOut || deliveryBlocked || (method === "მიტანა" && address.length < 3)}
                onPaymentAuthorized={async (googlePayToken) => {
                  if (!realDb) {
                    toast.error(language === "en"
                      ? "This is a demo listing — not available for purchase."
                      : language === "ru"
                      ? "Это демо-предложение — покупка недоступна."
                      : language === "tr"
                      ? "Bu bir demo ilanıdır — satın alma için uygun değil."
                      : language === "fa"
                      ? "این یک آگهی نمایشی است — امکان خرید وجود ندارد."
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
                        customerNote: customerNote.trim() || undefined,
                        googlePayToken,
                        nativeReturn: isNative(),
                      },
                    });
                    // 3DS challenge required — hand off to BOG. Otherwise
                    // land on the order page; the callback webhook will
                    // flip status to `paid` after server-to-server verify.
                    if (redirectUrl) {
                      await openExternal(redirectUrl);
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
                  : language === "tr"
                  ? "Google Pay (TEST modu) — ödemeyi tamamlamak için 3DS gerekebilir."
                  : language === "fa"
                  ? "Google Pay (حالت آزمایشی) — ممکن است برای تکمیل پرداخت 3DS لازم باشد."
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
            <div className="w-14 h-14 rounded-2xl gradient-warm grid place-items-center text-3xl shrink-0 overflow-hidden">
              <StoreLogo value={offer.storeLogo} emojiClassName="text-3xl" alt={storeName} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold flex items-center gap-1.5">
                {storeName}
                {trusted && <Shield className="w-3.5 h-3.5 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {offer.rating} · {offer.reviewCount} {language === "en" ? "reviews" : language === "ru" ? "отзывов" : language === "tr" ? "değerlendirme" : language === "fa" ? "نظر" : "შეფასება"}
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
                {language === "en" ? "See all" : language === "ru" ? "Все" : language === "tr" ? "Tümünü gör" : language === "fa" ? "مشاهده همه" : "ყველა"} <ChevronRight className="w-3.5 h-3.5" />
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
            disabled={soldOut || deliveryBlocked || (method === "მიტანა" && address.length < 3)}
            className="px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-soft hover:opacity-90 disabled:opacity-40 active:scale-95 transition-all"
          >
            {soldOut
              ? L.soldOut
              : !user
              ? (language === "en" ? "Sign in to reserve" : language === "ru" ? "Войти для брони" : language === "tr" ? "Rezervasyon için giriş yap" : language === "fa" ? "برای رزرو وارد شوید" : "შედი დასაჯავშნად")
              : t("reserve")}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <Suspense fallback={null}>
          <AddressPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(a) => setSelectedAddr(a)}
            store={{
              lat: offer.lat ?? null,
              lng: offer.lng ?? null,
              radiusKm: offer.deliveryRadiusKm ?? null,
              name: storeName,
            }}
          />
        </Suspense>
      )}
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
