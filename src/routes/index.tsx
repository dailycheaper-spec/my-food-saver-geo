import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Search, Leaf, Map as MapIcon, Shield, Store, Compass, Utensils, Shuffle } from "lucide-react";
import { CATEGORIES, DISTRICTS, OFFERS, getCategoryLabel, getDistrictLabel, getOfferText, getStoreName, type Category } from "@/lib/mock-data";
import { useFavorites, isTrustedPartner } from "@/lib/storage";
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

function Home() {
  const { t, language } = useI18n();
  const [cat, setCat] = useState<Category | "ყველა">("ყველა");
  const [district, setDistrict] = useState("ყველა უბანი");
  const [q, setQ] = useState("");
  const [onlyDelivery, setOnlyDelivery] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isPartner, loading: rolesLoading } = useMyRole();
  const favs = useFavorites();
  const [surpriseSeed, setSurpriseSeed] = useState(0);

  const filtered = useMemo(() => {
    return OFFERS.filter((o) => {
      if (cat !== "ყველა" && o.category !== cat) return false;
      if (district !== "ყველა უბანი" && o.district !== district) return false;
      if (onlyDelivery && !o.delivery) return false;
      const offerText = getOfferText(o, language);
      const storeName = getStoreName(o, language);
      if (q && !`${offerText.title} ${storeName} ${offerText.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [cat, district, q, onlyDelivery, language]);

  const nearby = useMemo(() => filtered.slice(0, 6), [filtered]);
  const dailyDiscovery = useMemo(() => {
    if (filtered.length === 0) return null;
    const day = new Date().toISOString().slice(0, 10);
    let hash = 0;
    for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) >>> 0;
    return filtered[hash % filtered.length];
  }, [filtered]);

  // Dinner Tonight: nearby offers with pickup window still active tonight,
  // preferring trusted partners + favorite stores + meal categories.
  const dinnerPicks = useMemo(() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const scored = OFFERS.map((o) => {
      const [h, m] = o.pickupTo.split(":").map(Number);
      const endMin = h * 60 + m;
      if (endMin < nowMin) return null; // already ended
      let score = 100 - o.distanceKm * 10;
      if (isTrustedPartner(o.storeId)) score += 25;
      if (favs.includes(o.storeId)) score += 20;
      if (o.category === "რესტორანი" || o.category === "სუში" || o.category === "საცხობი") score += 10;
      score += Math.random() * 8; // small jitter
      return { o, score };
    }).filter(Boolean) as { o: typeof OFFERS[number]; score: number }[];
    scored.sort((a, b) => b.score - a.score);
    void surpriseSeed; // re-shuffle when user clicks Surprise Me
    return scored.slice(0, 3).map((s) => s.o);
  }, [favs, surpriseSeed]);


  return (
    <div>
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" width={1600} height={1000} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/70 to-background" />
        </div>
        <div className="relative mx-auto max-w-2xl px-4 pt-6 pb-8 text-primary-foreground">
          <div className="flex items-center justify-between gap-2">
            <Logo />
            <div className="flex items-center gap-2">
              {user && !rolesLoading && isAdmin && (
                <Link to="/admin" className="text-sm bg-destructive text-destructive-foreground font-semibold px-3 py-1.5 rounded-full shadow-soft inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> {t("admin")}
                </Link>
              )}
              {user && !rolesLoading && !isAdmin && isPartner && (
                <Link to="/partner" className="text-sm bg-accent text-accent-foreground font-semibold px-3 py-1.5 rounded-full shadow-soft inline-flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> {t("partner")}
                </Link>
              )}
              <Link to={user ? "/profile" : "/auth"} className="text-sm bg-accent text-accent-foreground font-semibold px-3 py-1.5 rounded-full shadow-soft">
                {user ? t("profile") : t("signIn")}
              </Link>
              <LanguageSwitcher compact />
              <button className="flex items-center gap-1.5 text-sm bg-card/20 backdrop-blur px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4" />
                {t("location")}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/20 backdrop-blur text-xs font-medium mb-3">
              <Leaf className="w-3.5 h-3.5" /> {t("heroBadge")}
            </div>
            <h1 className="text-3xl font-display font-bold leading-tight">
              {t("heroTitle")}<br/>
              <span className="text-accent">{t("heroDiscount")}</span>
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/90 max-w-md">
              {t("heroText")}
            </p>
          </div>

          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card text-foreground placeholder:text-muted-foreground shadow-elevated focus:outline-none focus:ring-2 focus:ring-primary-glow text-sm"
            />
          </div>
        </div>
      </header>


      {/* Categories */}
      <section className="mx-auto max-w-2xl px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                cat === c.id
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-card text-foreground border border-border hover:border-primary/40"
              }`}
            >
              <span>{c.icon}</span> {getCategoryLabel(c.id, language)}
            </button>
          ))}
        </div>

        {/* filter row */}
        <div className="mt-3 flex items-center gap-2">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="text-xs bg-card border border-border rounded-full px-3 py-1.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {DISTRICTS.map((d) => <option key={d} value={d}>{getDistrictLabel(d, language)}</option>)}
          </select>
          <button
            onClick={() => setOnlyDelivery((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              onlyDelivery ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            🚚 {t("deliveryOnly")}
          </button>
        </div>
      </section>

      {/* Deals Near You */}
      <section className="mx-auto max-w-2xl px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> {t("sectionDealsNear")}
          </h2>
          <Link to="/map" className="text-xs font-semibold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
            <MapIcon className="w-3.5 h-3.5" /> {t("onMap")} ({filtered.length})
          </Link>
        </div>

        {nearby.length === 0 ? (
          <div className="text-center py-14 bg-card rounded-2xl border border-border">
            <div className="text-4xl mb-2">🥲</div>
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {nearby.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        )}
      </section>

      {/* Dinner Tonight */}
      {dinnerPicks.length > 0 && (
        <section className="mx-auto max-w-2xl px-4 mt-8">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-transparent border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" /> {t("dinnerTonight")}
              </h2>
              <button
                onClick={() => setSurpriseSeed((n) => n + 1)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1 shadow-soft active:scale-95 transition-transform"
              >
                <Shuffle className="w-3.5 h-3.5" /> ✨ {t("surpriseMe")}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dinnerPicks.map((o) => <OfferCard key={o.id} offer={o} />)}
            </div>
          </div>
        </section>
      )}

      {/* Today's Discovery */}
      {dailyDiscovery && (
        <section className="mx-auto max-w-2xl px-4 mt-8 mb-8">
          <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-3">
            <Compass className="w-5 h-5 text-accent-foreground" /> {t("sectionDaily")}
          </h2>
          <div className="grid grid-cols-1">
            <OfferCard offer={dailyDiscovery} />
          </div>
        </section>
      )}

      <footer className="mx-auto max-w-2xl px-4 pb-24 pt-4 text-center">
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
          {language === "en" ? "Phone" : language === "ru" ? "Тел" : "ტელ"}: <a href="tel:+995599161187" className="underline underline-offset-4">+995 599 161 187</a> · {language === "en" ? "Email" : language === "ru" ? "Эл. почта" : "ელ. ფოსტა"}: <a href="mailto:geoinstrumenti@gmail.com" className="underline underline-offset-4">geoinstrumenti@gmail.com</a>
        </p>
      </footer>
    </div>
  );
}

