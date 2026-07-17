import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  MapPin, Search, Bell, Map as MapIcon, Shield, Store, Zap, Sparkles,
  ChevronRight, Clock, Utensils,
} from "lucide-react";
import { CATEGORIES, DISTRICTS, OFFERS, STORES, getCategoryLabel, getDistrictLabel, offerMatchesQuery, getStoreName, type Category } from "@/lib/mock-data";
import { useFavorites, isTrustedPartner, useHydrated } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useMyRole } from "@/lib/db";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import heroImage from "@/assets/hero-bakery-clean.jpg";

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

function Home() {
  const { t, language } = useI18n();
  const [cat, setCat] = useState<Category | "ყველა">("ყველა");
  const [district, setDistrict] = useState("ყველა უბანი");
  const [q, setQ] = useState("");
  const { user } = useAuth();
  const { isAdmin, isPartner, loading: rolesLoading } = useMyRole();
  const favs = useFavorites();
  const hydrated = useHydrated();

  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_VIEW_KEY);
      if (raw) setRecentIds(JSON.parse(raw));
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    return OFFERS.filter((o) => {
      if (cat !== "ყველა" && o.category !== cat) return false;
      if (district !== "ყველა უბანი" && o.district !== district) return false;
      if (q && !offerMatchesQuery(o, q)) return false;
      return true;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [cat, district, q, language]);

  const nearby = useMemo(() => filtered.slice(0, 6), [filtered]);

  const flashDeals = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return OFFERS
      .map((o) => {
        const [h, m] = o.pickupTo.split(":").map(Number);
        const endMin = h * 60 + m;
        return { o, mins: endMin - nowMin };
      })
      .filter((x) => x.mins > 0 && x.mins <= 180)
      .sort((a, b) => a.mins - b.mins)
      .slice(0, 6)
      .map((x) => x.o);
  }, []);

  const featured = useMemo(
    () => OFFERS.filter((o) => isTrustedPartner(o.storeId)).slice(0, 6),
    [],
  );

  const newOffers = useMemo(() => {
    return [...OFFERS]
      .filter((o) => o.createdAt)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6);
  }, []);

  const recommended = useMemo(() => {
    if (!hydrated) return OFFERS.slice(0, 4);
    if (favs.length === 0) return OFFERS.slice().sort((a, b) => b.rating - a.rating).slice(0, 6);
    return OFFERS.filter((o) => favs.includes(o.storeId)).slice(0, 6);
  }, [favs, hydrated]);

  const recentlyViewed = useMemo(() => {
    if (recentIds.length === 0) return [];
    return recentIds
      .map((id) => OFFERS.find((o) => o.id === id))
      .filter(Boolean) as typeof OFFERS;
  }, [recentIds]);

  const nearbyPartners = useMemo(() => STORES.slice(0, 8), []);

  // ---------- Localized labels ----------
  const L = {
    hi: language === "en" ? "Hi" : language === "ru" ? "Привет" : "გამარჯობა",
    deliverTo: language === "en" ? "Deliver to" : language === "ru" ? "Доставка в" : "მიტანა",
    categoriesTitle: language === "en" ? "Categories" : language === "ru" ? "Категории" : "კატეგორიები",
    featured: language === "en" ? "Featured" : language === "ru" ? "Рекомендуемые" : "რჩეული",
    flash: language === "en" ? "Flash deals" : language === "ru" ? "Горячие скидки" : "ცხელი ფასდაკლებები",
    endingSoon: language === "en" ? "Ending soon — grab it now" : language === "ru" ? "Скоро закончатся" : "ვადა ეწურება",
    nearbyPartners: language === "en" ? "Nearby partners" : language === "ru" ? "Партнёры рядом" : "ახლომდებარე პარტნიორები",
    newSection: language === "en" ? "New on Cheaper" : language === "ru" ? "Новое на Cheaper" : "ახალი Cheaper-ზე",
    recommended: language === "en" ? "For you" : language === "ru" ? "Для вас" : "შენთვის",
    recentlyViewed: language === "en" ? "Recently viewed" : language === "ru" ? "Недавно просмотренные" : "ბოლოს ნანახი",
    allNearby: language === "en" ? "All nearby offers" : language === "ru" ? "Все предложения рядом" : "ყველა შემოთავაზება",
    seeAll: language === "en" ? "See all" : language === "ru" ? "Все" : "ყველა",
    searchOnPage: language === "en" ? "Search" : language === "ru" ? "Поиск" : "ძებნა",
    promoTitle: language === "en" ? "Save up to 70%" : language === "ru" ? "Скидки до 70%" : "70%-მდე ფასდაკლება",
    promoText: language === "en" ? "Fresh food from your favorite spots" : language === "ru" ? "Свежая еда из любимых мест" : "სუფთა საკვები საყვარელი ადგილებიდან",
    orderNow: language === "en" ? "Order now" : language === "ru" ? "Заказать" : "შეუკვეთე",
  };

  const firstName = user?.user_metadata?.first_name || user?.email?.split("@")[0] || "";

  return (
    <div className="pb-4">
      {/* -------- Top bar (sticky, mobile-first) -------- */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/60 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-2xl px-4 py-2.5 flex items-center gap-2">
          <Link to="/" aria-label={t("brand")} className="shrink-0 press rounded-2xl focus-visible:outline-none">
            <Logo />
          </Link>

          <div className="mx-2 h-8 w-px bg-border/70 shrink-0" aria-hidden="true" />

          <CitySelector variant="compact" />

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <LanguageSwitcher compact />
            <Link
              to="/notifications"
              aria-label={t("navNotifications")}
              className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center press focus-visible:outline-none"
            >
              <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
            </Link>
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
          </div>
        </div>
      </div>

      {/* -------- Greeting + Search -------- */}
      <section className="mx-auto max-w-2xl px-4 pt-4">
        <h1 className="font-display text-[26px] leading-[1.15] font-bold tracking-tight">
          {L.hi}{firstName ? `, ${firstName}` : ""} 👋
          <br />
          <span className="text-muted-foreground text-[20px]">{t("heroTitle")}</span>
        </h1>

        <Link
          to="/search"
          className="mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-secondary hover:bg-muted transition-colors active:scale-[0.99]"
        >
          <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground flex-1 truncate">{t("searchPlaceholder")}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold">
            {L.searchOnPage}
          </span>
        </Link>
      </section>

      {/* -------- Categories (large, native-feel tiles) -------- */}
      <section className="mx-auto max-w-2xl mt-5">
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide snap-x snap-mandatory">
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
        </div>
      </section>

      {/* -------- Promo banner -------- */}
      <section className="mx-auto max-w-2xl px-4 mt-5">
        <div className="relative overflow-hidden rounded-3xl shadow-elevated">
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" />
          <div className="relative p-5 text-primary-foreground">
            <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> {t("heroBadge")}
            </div>
            <h2 className="font-display text-2xl font-bold mt-2 leading-tight">
              {L.promoTitle}
            </h2>
            <p className="text-sm text-primary-foreground/90 mt-1 max-w-[80%]">
              {L.promoText}
            </p>
            <Link
              to="/search"
              className="mt-3 inline-flex items-center gap-1.5 bg-card text-foreground text-sm font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              {L.orderNow} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
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
              <div className="w-14 h-14 rounded-2xl bg-secondary grid place-items-center text-3xl">
                {s.logo}
              </div>
              <div className="text-center w-full">
                <div className="text-xs font-bold truncate">{getStoreName(s, language)}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  ⭐ {s.rating} · {getDistrictLabel(s.district, language)}
                </div>
              </div>
            </Link>
          ))}
        </HScroll>
      </SectionHeader>

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

      {/* -------- All nearby (full grid) + district filter -------- */}
      <section className="mx-auto max-w-2xl px-4 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <MapPin className="w-[18px] h-[18px] text-primary" /> {L.allNearby}
          </h2>
          <Link to="/map" className="text-xs font-semibold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
            <MapIcon className="w-3.5 h-3.5" /> {t("onMap")}
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-3 scrollbar-hide">
          {DISTRICTS.map((d) => (
            <button
              key={d}
              onClick={() => setDistrict(d)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                district === d
                  ? "bg-foreground text-background"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {getDistrictLabel(d, language)}
            </button>
          ))}
        </div>

        {nearby.length === 0 ? (
          <div className="text-center py-14 bg-card rounded-3xl border border-border">
            <div className="text-4xl mb-2">🥲</div>
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nearby.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        )}
      </section>

      {/* -------- Footer -------- */}
      <footer className="mx-auto max-w-2xl px-4 pt-10 pb-4 text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/about" className="text-xs text-muted-foreground underline underline-offset-4">
            {language === "en" ? "About" : language === "ru" ? "О нас" : "ჩვენს შესახებ"}
          </Link>
          <Link to="/privacy" className="text-xs text-muted-foreground underline underline-offset-4">
            {language === "en" ? "Privacy Policy" : language === "ru" ? "Конфиденциальность" : "კონფიდენციალურობა"}
          </Link>
          <Link to="/terms" className="text-xs text-muted-foreground underline underline-offset-4">
            {language === "en" ? "Terms" : language === "ru" ? "Условия" : "წესები და პირობები"}
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          {language === "en" ? "Address" : language === "ru" ? "Адрес" : "მისამართი"}: {language === "en" ? "71 Vasil Barnovi Str., Tbilisi, Georgia, 0179" : language === "ru" ? "ул. Василия Барнови 71, Тбилиси, Грузия, 0179" : "ვასილ ბარნოვის 71, თბილისი, საქართველო, 0179"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {language === "en" ? "Phone" : language === "ru" ? "Тел" : "ტელ"}: <a href="tel:+995599161187" className="underline underline-offset-4">+995 599 161 187</a> · {language === "en" ? "Email" : language === "ru" ? "Эл. почта" : "ელ. ფოსტა"}: <a href="mailto:dailycheaper@gmail.com" className="underline underline-offset-4">dailycheaper@gmail.com</a>
        </p>
      </footer>
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
    <section className="mx-auto max-w-2xl mt-7">
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
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide snap-x snap-mandatory">
      {children}
    </div>
  );
}
