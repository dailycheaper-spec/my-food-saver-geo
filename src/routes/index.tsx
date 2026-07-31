import { StoreLogo } from "@/components/StoreLogo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  MapPin, Search, Bell, Map as MapIcon, Shield, Store, Zap, Sparkles,
  ChevronRight, Clock, Utensils, Gift, LogIn, User,

} from "lucide-react";
import { CATEGORIES, DISTRICTS, getCategoryLabel, getDistrictLabel, offerMatchesQuery, type Category, type Offer } from "@/lib/mock-data";
import { useFavorites, isTrustedPartner, useHydrated } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";
import { Logo } from "@/components/Logo";
import { LocationChip } from "@/components/location/LocationChip";
import { UserMenu } from "@/components/UserMenu";
import { ScrollableRow } from "@/components/ScrollableRow";
import { useAuth } from "@/lib/auth";
import { useMyRole } from "@/lib/db";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { NearbyOffersSection } from "@/components/NearbyOffersSection";
import { SavingsTracker } from "@/components/SavingsTracker";
import { useFollowedStoreIds } from "@/lib/follows";
import { Star as StarIcon } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { useCity, cityLabel } from "@/lib/city";
import { PromoCarousel } from "@/components/PromoCarousel";
import { useActiveBanners } from "@/lib/banners";
import { PageFade } from "@/components/PageFade";
import { HomeSkeleton } from "@/components/Skeleton";
import { usePageReady } from "@/hooks/use-page-ready";


/** Homepage carousel: DB-managed banners with a bundled fallback. */
function HomePromoCarousel() {
  const { banners } = useActiveBanners();
  return <PromoCarousel banners={banners} />;
}


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cheaper — იაფად, 50%+ ფასდაკლებით" },
      { name: "description", content: "იყიდე ხაჭაპური, სუში, ხილი, ცომეული და მარკეტის კალათები 50%-ზე მეტი ფასდაკლებით — ვაკე, საბურთალო, ვერა და მთელი თბილისი." },
    ],
  }),
  component: Home,
});

const RECENT_VIEW_KEY = "cheaper:recent-views";
const NEARBY_RADIUS_KM = 3;

function Home() {
  const { t, language } = useI18n();
  const [cat, setCat] = useState<Category | "ყველა">("ყველა");
  const [district, setDistrict] = useState("ყველა უბანი");
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const { isAdmin, isPartner, loading: rolesLoading } = useMyRole();
  const favs = useFavorites();
  const hydrated = useHydrated();
  const { offers: dbOffers, error: offersError } = useLiveDbCardOffers();
  const { city } = useCity();

  // Real offers only — filtered to the currently selected city.
  const ALL_OFFERS = useMemo<Offer[]>(() => {
    const map = new Map<string, Offer>();
    dbOffers.forEach((o) => {
      // If offer has no city info, keep it in Tbilisi (legacy default) only.
      const offerCity = o.city ?? "თბილისი";
      if (offerCity !== city) return;
      map.set(o.id, o);
    });
    return Array.from(map.values());
  }, [dbOffers, city]);

  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_VIEW_KEY);
      if (raw) setRecentIds(JSON.parse(raw));
    } catch {}
  }, []);

  const inCat = (o: Offer) => cat === "ყველა" || o.category === cat;

  const filtered = useMemo(() => {
    return ALL_OFFERS.filter((o) => {
      if (!inCat(o)) return false;
      if (district !== "ყველა უბანი" && o.district !== district) return false;
      if (q && !offerMatchesQuery(o, q)) return false;
      return true;
    });
  }, [ALL_OFFERS, cat, district, q, language]);

  const nearby = useMemo(() => filtered.slice(0, 6), [filtered]);

  // "Near you" is distance-driven: keep the category filter, but ignore the
  // district/search filters so branch proximity decides what shows up.
  const nearbySource = useMemo(() => ALL_OFFERS.filter(inCat), [ALL_OFFERS, cat]);

  // Live "best discount of the day" — highest real discount % across active,
  // in-stock offers whose pickup window is still open. City-scoped so it
  // matches the surrounding list. Recomputes automatically as ALL_OFFERS
  // (the live hook) changes.
  const bestDeal = useMemo<Offer | null>(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let best: Offer | null = null;
    let bestPct = -1;
    for (const o of ALL_OFFERS) {
      if (o.itemsLeft <= 0) continue;
      if (!o.originalPrice || o.originalPrice <= 0) continue;
      const [h, m] = o.pickupTo.split(":").map(Number);
      if ((h * 60 + m) <= nowMin) continue;
      const pct = 1 - o.price / o.originalPrice;
      if (pct > bestPct) { bestPct = pct; best = o; }
    }
    return best;
  }, [ALL_OFFERS]);

  const flashDeals = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return ALL_OFFERS
      .filter(inCat)
      .map((o) => {
        const [h, m] = o.pickupTo.split(":").map(Number);
        const endMin = h * 60 + m;
        return { o, mins: endMin - nowMin };
      })
      .filter((x) => x.mins > 0 && x.mins <= 180)
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 6)
      .map((x) => x.o);
  }, [ALL_OFFERS, cat]);

  const featured = useMemo(
    () => hydrated ? ALL_OFFERS.filter((o) => inCat(o) && isTrustedPartner(o.storeId)).slice(0, 6) : [],
    [ALL_OFFERS, hydrated, cat],
  );

  const newOffers = useMemo(() => {
    const withTime = ALL_OFFERS.filter((o) => o.createdAt && inCat(o));
    return withTime.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 6);
  }, [ALL_OFFERS, cat]);

  const surpriseBoxes = useMemo(
    () => ALL_OFFERS.filter((o) => o.isSurprise && inCat(o)).slice(0, 8),
    [ALL_OFFERS, cat],
  );

  const { ids: followedIds } = useFollowedStoreIds();
  const followedOffers = useMemo(() => {
    if (!user || followedIds.size === 0) return [];
    return ALL_OFFERS
      .filter((o) => followedIds.has(o.storeId) && inCat(o))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 12);
  }, [ALL_OFFERS, followedIds, user, cat]);

  const recommended = useMemo(() => {
    const pool = ALL_OFFERS.filter(inCat);
    if (!hydrated) return pool.slice(0, 4);
    // Prioritize offers from stores whose products the user has liked before.
    const favStoreIds = new Set(ALL_OFFERS.filter((o) => favs.includes(o.id)).map((o) => o.storeId));
    const favMatches = pool.filter((o) => favStoreIds.has(o.storeId));
    if (favMatches.length > 0) return favMatches.slice(0, 6);
    return pool
      .slice()
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6);
  }, [ALL_OFFERS, favs, hydrated, cat]);

  const recentlyViewed = useMemo(() => {
    if (recentIds.length === 0) return [];
    return recentIds
      .map((id) => ALL_OFFERS.find((o) => o.id === id))
      .filter((o): o is Offer => Boolean(o) && inCat(o as Offer));
  }, [ALL_OFFERS, recentIds, cat]);

  const nearbyPartners = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; logo: string; district: string }>();
    for (const o of ALL_OFFERS) {
      if (!inCat(o)) continue;
      if (seen.has(o.storeId)) continue;
      seen.set(o.storeId, { id: o.storeId, name: o.storeName, logo: o.storeLogo || "🏪", district: o.district ?? "" });
      if (seen.size >= 8) break;
    }
    return Array.from(seen.values());
  }, [ALL_OFFERS, cat]);



  // ---------- Localized labels ----------
  const L = {
    hi: language === "en" ? "Hi" : language === "ru" ? "Привет" : language === "tr" ? "Merhaba" : language === "fa" ? "سلام" : "გამარჯობა",
    deliverTo: language === "en" ? "Deliver to" : language === "ru" ? "Доставка в" : language === "tr" ? "Teslimat adresi" : language === "fa" ? "تحویل به" : "მიტანა",
    categoriesTitle: language === "en" ? "Categories" : language === "ru" ? "Категории" : language === "tr" ? "Kategoriler" : language === "fa" ? "دسته‌بندی‌ها" : "კატეგორიები",
    featured: language === "en" ? "Featured" : language === "ru" ? "Рекомендуемые" : language === "tr" ? "Öne çıkanlar" : language === "fa" ? "ویژه" : "რჩეული",
    flash: language === "en" ? "Flash deals" : language === "ru" ? "Горячие скидки" : language === "tr" ? "Fırsat teklifleri" : language === "fa" ? "پیشنهادهای لحظه‌ای" : "ცხელი ფასდაკლებები",
    endingSoon: language === "en" ? "Ending soon — grab it now" : language === "ru" ? "Скоро закончатся" : language === "tr" ? "Yakında bitiyor — hemen al" : language === "fa" ? "به‌زودی تمام می‌شود — همین حالا بگیرید" : "ვადა ეწურება",
    nearbyPartners: language === "en" ? "Nearby partners" : language === "ru" ? "Партнёры рядом" : language === "tr" ? "Yakındaki ortaklar" : language === "fa" ? "شرکای نزدیک" : "ახლომდებარე პარტნიორები",
    newSection: language === "en" ? "New on Cheaper" : language === "ru" ? "Новое на Cheaper" : language === "tr" ? "Cheaper'da yeni" : language === "fa" ? "جدید در Cheaper" : "ახალი Cheaper-ზე",
    recommended: language === "en" ? "For you" : language === "ru" ? "Для вас" : language === "tr" ? "Senin için" : language === "fa" ? "برای شما" : "შენთვის",
    recentlyViewed: language === "en" ? "Recently viewed" : language === "ru" ? "Недавно просмотренные" : language === "tr" ? "Son görüntülenenler" : language === "fa" ? "بازدیدهای اخیر" : "ბოლოს ნანახი",
    allNearby: language === "en" ? "All nearby offers" : language === "ru" ? "Все предложения рядом" : language === "tr" ? "Yakındaki tüm teklifler" : language === "fa" ? "همه پیشنهادهای اطراف" : "ყველა შემოთავაზება",
    seeAll: language === "en" ? "See all" : language === "ru" ? "Все" : language === "tr" ? "Tümünü gör" : language === "fa" ? "همه را ببینید" : "ყველა",
    searchOnPage: language === "en" ? "Search" : language === "ru" ? "Поиск" : language === "tr" ? "Ara" : language === "fa" ? "جستجو" : "ძებნა",
    promoTitle: language === "en" ? "Quality price, better food" : language === "ru" ? "Качественная цена, лучшая еда" : language === "tr" ? "Kaliteli fiyat, daha iyi yemek" : language === "fa" ? "قیمت باکیفیت، غذای بهتر" : "ხარისხიანი ფასი, უკეთესი საკვები",
    promoText: language === "en" ? "Tasty food from your favorite spots!" : language === "ru" ? "Вкусная еда из любимых мест!" : language === "tr" ? "Sevdiğiniz mekanlardan lezzetli yemekler!" : language === "fa" ? "غذای خوشمزه از مکان‌های موردعلاقه‌تان!" : "გემრიელი საკვები საყვარელი ადგილებიდან!",
    dailyDiscount: language === "en" ? "Every day 50%+ off" : language === "ru" ? "Каждый день скидка 50%+" : language === "tr" ? "Her gün %50+ indirim" : language === "fa" ? "هر روز بیش از ۵۰٪ تخفیف" : "ყოველდღე 50%+ ფასდაკლებით",

    orderNow: language === "en" ? "Order now" : language === "ru" ? "Заказать" : language === "tr" ? "Şimdi sipariş ver" : language === "fa" ? "اکنون سفارش دهید" : "შეუკვეთე",
  };

  const firstName = user?.user_metadata?.first_name || user?.email?.split("@")[0] || "";

  return (
    <div className="pb-28">
      {/* -------- Top bar (sticky, mobile-first) -------- */}
      <div className="app-header">


        <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center gap-2">
          <Link to="/" aria-label={t("brand")} className="shrink-0 press rounded-2xl focus-visible:outline-none">
            <Logo compact />
          </Link>

          <div className="mx-1 h-8 w-px bg-border/70 shrink-0 hidden sm:block" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <LocationChip variant="compact" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LanguageSwitcher compact />
            <Link
              to="/notifications"
              aria-label={t("navNotifications")}
              className="tap-target w-11 h-11 rounded-full bg-card border border-border grid place-items-center press focus-visible:outline-none"
            >
              <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            </Link>
            {!user && !rolesLoading && (
              <Link
                to="/auth"
                aria-label={t("signIn")}
                className="h-11 min-w-11 px-2.5 sm:px-4 rounded-full bg-primary text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-1.5 press shadow-sm"
              >
                <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{t("signIn")}</span>
              </Link>
            )}

            {user && !rolesLoading && isAdmin && (
              <Link to="/admin" className="h-10 px-3 rounded-full bg-destructive text-destructive-foreground font-semibold text-xs inline-flex items-center gap-1 press">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" /> {t("admin")}
              </Link>
            )}
            {user && !rolesLoading && !isAdmin && isPartner && (
              <Link to="/partner" className="h-10 px-3 rounded-full bg-accent text-accent-foreground font-semibold text-xs inline-flex items-center gap-1 press">
                <Store className="w-3.5 h-3.5" aria-hidden="true" /> {t("partner")}
              </Link>
            )}
            {user && !rolesLoading && !isAdmin && !isPartner && (
              <UserMenu />
            )}
          </div>
        </div>
      </div>

      {/* -------- Greeting + Search -------- */}
      <section className="mx-auto max-w-6xl px-4 pt-3 sm:pt-4">

        <Link
          to="/search"
          className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary hover:bg-muted transition-colors active:scale-[0.99] sm:mt-4 sm:py-3.5"

        >
          <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1 truncate">{t("searchPlaceholder")}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
            {L.searchOnPage}
          </span>
        </Link>

      </section>

      {/* -------- Categories (large, native-feel tiles) -------- */}
      <section className="mx-auto max-w-6xl mt-4 sm:mt-5">
        <ScrollableRow className="pb-2 px-4 snap-x snap-proximity">
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`snap-start shrink-0 flex flex-col items-center justify-center gap-1.5 w-[76px] h-[86px] rounded-2xl transition-all active:scale-95 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card border border-border text-foreground"
                }`}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="text-[11px] font-bold tracking-tight">
                  {getCategoryLabel(c.id, language)}
                </span>
              </button>
            );
          })}
        </ScrollableRow>
      </section>

      <PageFade ready={pageReady} skeleton={<HomeSkeleton />}>
      {/* -------- Promo carousel (managed in Admin → Banners) -------- */}
      <HomePromoCarousel />


      {/* -------- Savings tracker (signed-in only) -------- */}
      {user && <SavingsTracker />}

      {/* -------- Nearby (location-aware) -------- */}
      <NearbyOffersSection offers={nearbySource} />

      {/* -------- Stores You Follow (signed-in only, server-side follows) -------- */}
      {followedOffers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-5 sm:mt-6">

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <StarIcon className="w-[18px] h-[18px] fill-amber-500 text-amber-500" />
              {language === "en" ? "Stores you follow" : language === "ru" ? "Магазины, на которые вы подписаны" : language === "tr" ? "Takip ettiğiniz mağazalar" : language === "fa" ? "فروشگاه‌هایی که دنبال می‌کنید" : "გამოწერილი მაღაზიები"}
            </h2>
          </div>
          <ScrollableRow className="pt-1 pb-2 snap-x snap-proximity -mx-4 px-4">
            {followedOffers.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </ScrollableRow>
        </section>
      )}

      {/* -------- All nearby (full grid) + district filter -------- */}

      <section className="mx-auto max-w-6xl px-4 mt-5 sm:mt-6">

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <MapPin className="w-[18px] h-[18px] text-primary" /> {L.allNearby}
          </h2>
          <Link to="/map" className="text-xs font-semibold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
            <MapIcon className="w-3.5 h-3.5" /> {t("onMap")}
          </Link>
        </div>

        <div className="relative mb-3">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            aria-label={language === "en" ? "Choose district" : language === "ru" ? "Выбрать район" : language === "tr" ? "Bölge seç" : language === "fa" ? "انتخاب منطقه" : "უბნის არჩევა"}
            className="w-full h-11 pl-9 pr-9 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{getDistrictLabel(d, language)}</option>
            ))}
          </select>
          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90 pointer-events-none" />
        </div>

        {bestDeal && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                <Zap className="w-3 h-3" />
                {language === "en" ? "Best discount today" : language === "ru" ? "Лучшая скидка дня" : language === "tr" ? "Bugünün en iyi indirimi" : language === "fa" ? "بهترین تخفیف امروز" : "დღის საუკეთესო ფასდაკლება"}
              </span>
            </div>
            <OfferCard offer={bestDeal} featured />
          </div>
        )}

        {offersError ? (
          <div className="text-center py-10 sm:py-14 bg-card rounded-3xl border border-destructive/30">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-sm text-destructive">{t("loadErrorGeneric")}</p>
          </div>
        ) : nearby.length === 0 ? (
          <div className="text-center py-10 sm:py-14 bg-card rounded-3xl border border-border">
            <div className="text-4xl mb-2">🥲</div>
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {nearby.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>

        )}
      </section>

      {/* -------- Flash deals -------- */}
      {flashDeals.length > 0 && (
        <SectionHeader
          title={L.flash}
          subtitle={L.endingSoon}
          icon={<Zap className="w-[18px] h-[18px] text-amber-500" />}
          seeAllTo="/search"
          seeAllLabel={L.seeAll}
        >
          <HScroll>
            {flashDeals.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </HScroll>
        </SectionHeader>
      )}


      {/* -------- Surprise Boxes -------- */}
      {surpriseBoxes.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-5 sm:mt-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 p-4 sm:p-5 shadow-elevated">

            <div className="absolute -top-6 -right-6 text-[140px] opacity-20 select-none pointer-events-none">🎁</div>
            <div className="relative flex items-center gap-2 text-white">
              <Gift className="w-5 h-5" />
              <h2 className="font-display text-lg font-bold">{t("surpriseTitle")}</h2>
            </div>
            <p className="relative text-white/90 text-xs mt-1">{t("surpriseSubtitle")}</p>
          </div>
          <ScrollableRow className="pt-3 pb-2 snap-x snap-proximity -mx-4 px-4">
            {surpriseBoxes.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </ScrollableRow>
        </section>
      )}

      {/* -------- Featured (trusted) -------- */}
      {featured.length > 0 && (
        <SectionHeader
          title={L.featured}
          icon={<Shield className="w-[18px] h-[18px] text-primary" />}
          seeAllTo="/search"
          seeAllLabel={L.seeAll}
        >
          <HScroll>
            {featured.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </HScroll>
        </SectionHeader>
      )}

      {/* -------- Nearby partners (stores) -------- */}
      {nearbyPartners.length > 0 && (
        <SectionHeader
          title={L.nearbyPartners}
          icon={<Store className="w-[18px] h-[18px] text-primary" />}
        >
          <HScroll>
            {nearbyPartners.map((s) => (
              <Link
                key={s.id}
                to="/search"
                className="snap-start shrink-0 w-[120px] flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border hover:shadow-card transition-all active:scale-95"
              >
                <div className="w-14 h-14 rounded-2xl bg-secondary grid place-items-center overflow-hidden text-3xl">
                  <StoreLogo value={s.logo} emojiClassName="text-3xl" />
                </div>
                <div className="text-center w-full">
                  <div className="text-xs font-bold truncate">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {s.district ? getDistrictLabel(s.district, language) : ""}
                  </div>
                </div>
              </Link>
            ))}
          </HScroll>
        </SectionHeader>
      )}

      {/* -------- New offers -------- */}
      {newOffers.length > 0 && (
        <SectionHeader
          title={L.newSection}
          icon={<Sparkles className="w-[18px] h-[18px] text-emerald-500" />}
          seeAllTo="/search"
          seeAllLabel={L.seeAll}
        >
          <HScroll>
            {newOffers.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </HScroll>
        </SectionHeader>
      )}

      {/* -------- Recommended -------- */}
      {recommended.length > 0 && (
        <SectionHeader
          title={L.recommended}
          icon={<Utensils className="w-[18px] h-[18px] text-accent-foreground" />}
        >
          <HScroll>
            {recommended.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </HScroll>
        </SectionHeader>
      )}

      {/* -------- Recently viewed -------- */}
      {recentlyViewed.length > 0 && (
        <SectionHeader
          title={L.recentlyViewed}
          icon={<Clock className="w-[18px] h-[18px] text-muted-foreground" />}
        >
          <HScroll>
            {recentlyViewed.map((o) => (
              <div key={o.id} className="snap-start shrink-0 w-[260px]">
                <OfferCard offer={o} />
              </div>
            ))}
          </HScroll>
        </SectionHeader>
      )}



      {/* -------- Empty-state filler (always fill the mobile home) -------- */}
      {ALL_OFFERS.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 mt-5 sm:mt-6">
          <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">

            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-[18px] h-[18px] text-primary" />
              {language === "en" ? "Fresh deals landing soon" : language === "ru" ? "Свежие предложения скоро появятся" : language === "tr" ? "Yeni fırsatlar yakında" : language === "fa" ? "پیشنهادهای تازه به‌زودی" : "ახალი შემოთავაზებები მალე გამოჩნდება"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "en"
                ? "Our partners are preparing today's discounted boxes. In the meantime, explore Cheaper."
                : language === "ru"
                ? "Наши партнёры готовят коробки со скидками. А пока — исследуйте Cheaper."
                : language === "tr"
                ? "Ortaklarımız bugünün indirimli kutularını hazırlıyor. Bu arada Cheaper'ı keşfedin."
                : language === "fa"
                ? "شرکای ما جعبه‌های تخفیف‌دار امروز را آماده می‌کنند. در این حین، Cheaper را کاوش کنید."
                : "პარტნიორები ამზადებენ დღევანდელ ფასდაკლებულ პაკეტებს. სანამ, გაეცანი Cheaper-ს."}
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: "🥐", key: "bakery" },
                { icon: "🍣", key: "sushi" },
                { icon: "🍕", key: "pizza" },
                { icon: "🥗", key: "healthy" },
              ].map((p) => (
                <div key={p.key} className="rounded-2xl bg-secondary/60 border border-border/50 p-3 flex flex-col items-center gap-1">
                  <span className="text-3xl">{p.icon}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {language === "en" ? "Coming soon" : language === "ru" ? "Скоро" : language === "tr" ? "Yakında" : language === "fa" ? "به‌زودی" : "მალე"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/map" className="flex-1 text-center py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                {t("onMap")}
              </Link>
              <Link to="/search" className="flex-1 text-center py-2.5 rounded-xl bg-card border border-border text-sm font-semibold">
                {L.searchOnPage}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* -------- Gift a friend (always visible CTA) -------- */}
      <section className="mx-auto max-w-6xl px-4 mt-5 sm:mt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-4 sm:p-5 shadow-elevated">

          <div className="absolute -bottom-8 -right-6 text-[140px] opacity-20 select-none pointer-events-none">🎁</div>
          <div className="relative text-white">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              <h2 className="font-display text-lg font-bold">{t("giftOrder")}</h2>
            </div>
            <p className="text-white/90 text-xs mt-1 max-w-[85%]">{t("giftOrderHelp")}</p>
            <Link
              to="/orders"
              className="mt-3 inline-flex items-center gap-1.5 bg-white text-foreground text-sm font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              {t("giftOrder")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* -------- Footer -------- */}
      <footer className="mx-auto max-w-6xl px-4 pt-8 pb-4 text-center sm:pt-10">
        <div className="flex justify-center mb-4">
          <Logo showTagline />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/about" className="text-xs text-muted-foreground underline underline-offset-4">
            {language === "en" ? "About" : language === "ru" ? "О нас" : language === "tr" ? "Hakkımızda" : language === "fa" ? "درباره ما" : "ჩვენს შესახებ"}
          </Link>
          <Link to="/privacy" className="text-xs text-muted-foreground underline underline-offset-4">
            {language === "en" ? "Privacy Policy" : language === "ru" ? "Конфиденциальность" : language === "tr" ? "Gizlilik Politikası" : language === "fa" ? "حریم خصوصی" : "კონფიდენციალურობა"}
          </Link>
          <Link to="/terms" className="text-xs text-muted-foreground underline underline-offset-4">
            {language === "en" ? "Terms" : language === "ru" ? "Условия" : language === "tr" ? "Koşullar" : language === "fa" ? "قوانین" : "წესები და პირობები"}
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          {language === "en" ? "Address" : language === "ru" ? "Адрес" : language === "tr" ? "Adres" : language === "fa" ? "آدرس" : "მისამართი"}: {language === "en" ? "71 Vasil Barnovi Str., Tbilisi, Georgia, 0179" : language === "ru" ? "ул. Василия Барнови 71, Тбилиси, Грузия, 0179" : language === "tr" ? "Vasil Barnovi Cad. 71, Tiflis, Gürcistan, 0179" : language === "fa" ? "خیابان واسیل بارنووی ۷۱، تفلیس، گرجستان، ۰۱۷۹" : "ვასილ ბარნოვის 71, თბილისი, საქართველო, 0179"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {language === "en" ? "Phone" : language === "ru" ? "Тел" : language === "tr" ? "Tel" : language === "fa" ? "تلفن" : "ტელ"}: <a href="tel:+995599161187" className="underline underline-offset-4">+995 599 161 187</a> · {language === "en" ? "Email" : language === "ru" ? "Эл. почта" : language === "tr" ? "E-posta" : language === "fa" ? "ایمیل" : "ელ. ფოსტა"}: <a href="mailto:dailycheaper@gmail.com" className="underline underline-offset-4">dailycheaper@gmail.com</a>
        </p>
      </footer>
      </PageFade>

    </div>
  );
}

function SectionHeader({
  title, subtitle, icon, seeAllTo, seeAllLabel, children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  seeAllTo?: "/search" | "/map";
  seeAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl mt-5 sm:mt-7">
      <div className="flex items-end justify-between px-4 mb-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            {icon} {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {seeAllTo && (
          <Link
            to={seeAllTo}
            className="shrink-0 text-xs font-semibold text-primary flex items-center gap-0.5 active:scale-95 transition-transform"
          >
            {seeAllLabel} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return <ScrollableRow className="pb-2 px-4 snap-x snap-proximity">{children}</ScrollableRow>;
}
