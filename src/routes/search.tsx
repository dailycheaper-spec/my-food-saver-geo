import { StoreLogo } from "@/components/StoreLogo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Search as SearchIcon, X, SlidersHorizontal, MapPin, Store as StoreIcon,
  Utensils, Tag, Star, Clock, Percent, Navigation, RotateCcw,
} from "lucide-react";
import {
  CATEGORIES, DISTRICTS,
  getCategoryLabel, getDistrictLabel, getStoreName, getOfferText,
  offerMatchesQuery, formatPrice,
  type Category, type Offer,
} from "@/lib/mock-data";
import { OfferCard } from "@/components/OfferCard";
import { useI18n } from "@/lib/i18n";
import { useLiveDbData } from "@/lib/db-adapter";
import { OfferCardSkeleton } from "@/components/Skeleton";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";


export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "ძებნა — Cheaper" },
      { name: "description", content: "იპოვე ფასდაკლებული საკვები შენს გარშემო." },
    ],
  }),
  component: SearchPage,
});

const RECENT_KEY = "cheaper:recent-searches";

type Diet = "vegetarian" | "vegan" | "glutenFree" | "halal";

const DIET_KEYWORDS: Record<Diet, string[]> = {
  vegetarian: ["ვეგეტარიან", "vegetarian", "вегетариан", "ბოსტნეული", "ხილი", "produce", "salad", "სალათი"],
  vegan: ["ვეგან", "vegan", "веган", "ხილი", "produce", "fruit"],
  glutenFree: ["გლუტენის გარეშე", "gluten free", "gluten-free", "без глютена", "ბრინჯი", "rice"],
  halal: ["ჰალალ", "halal", "халяль"],
};

function offerMatchesDiet(o: Offer, diet: Diet): boolean {
  const hay = `${o.title} ${o.description} ${o.category}`.toLowerCase();
  return DIET_KEYWORDS[diet].some((kw) => hay.includes(kw.toLowerCase()));
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function isOpenNow(o: Offer): boolean {
  const from = timeToMinutes(o.pickupFrom);
  const to = timeToMinutes(o.pickupTo);
  const n = nowMinutes();
  return n >= from && n <= to;
}

const SORTS = ["distance", "price", "discount", "rating"] as const;
type Sort = typeof SORTS[number];

function SearchPage() {
  const { t, language } = useI18n();
  const { offers: OFFERS, stores: STORES, loading: offersLoading, error: offersError } = useLiveDbData();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "ყველა">("ყველა");
  const [district, setDistrict] = useState("ყველა უბანი");
  const [showFilters, setShowFilters] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // filters
  const [maxDistance, setMaxDistance] = useState(10); // km
  const [maxPrice, setMaxPrice] = useState(50); // GEL
  const [minDiscount, setMinDiscount] = useState(0); // %
  const [minRating, setMinRating] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [pickupBefore, setPickupBefore] = useState<string>(""); // HH:MM
  const [diets, setDiets] = useState<Set<Diet>>(new Set());
  const [sort, setSort] = useState<Sort>("distance");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
    inputRef.current?.focus();
  }, []);

  const saveRecent = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };

  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  };

  const resetFilters = () => {
    setCat("ყველა"); setDistrict("ყველა უბანი");
    setMaxDistance(10); setMaxPrice(50); setMinDiscount(0);
    setMinRating(0); setOpenNow(false); setPickupBefore("");
    setDiets(new Set()); setSort("distance");
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (cat !== "ყველა") n++;
    if (district !== "ყველა უბანი") n++;
    if (maxDistance < 10) n++;
    if (maxPrice < 50) n++;
    if (minDiscount > 0) n++;
    if (minRating > 0) n++;
    if (openNow) n++;
    if (pickupBefore) n++;
    n += diets.size;
    return n;
  }, [cat, district, maxDistance, maxPrice, minDiscount, minRating, openNow, pickupBefore, diets]);

  const filtered = useMemo(() => {
    const result = OFFERS.filter((o) => {
      if (cat !== "ყველა" && o.category !== cat) return false;
      if (district !== "ყველა უბანი" && o.district !== district) return false;
      if (q && !offerMatchesQuery(o, q)) return false;
      // distanceKm is 0 for real data (not yet computed) — only apply this filter when user tightens it.
      if (maxDistance < 10 && o.distanceKm > maxDistance) return false;
      if (o.price > maxPrice) return false;
      const discount = o.originalPrice > 0 ? Math.round((1 - o.price / o.originalPrice) * 100) : 0;
      if (discount < minDiscount) return false;
      // rating is 0 for real data — only apply this filter when the user sets a minimum.
      if (minRating > 0 && o.rating < minRating) return false;
      if (openNow && !isOpenNow(o)) return false;
      if (pickupBefore && timeToMinutes(o.pickupFrom) > timeToMinutes(pickupBefore)) return false;
      for (const d of diets) if (!offerMatchesDiet(o, d)) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "price": return a.price - b.price;
        case "rating": return b.rating - a.rating;
        case "discount": {
          const da = a.originalPrice > 0 ? 1 - a.price / a.originalPrice : 0;
          const db = b.originalPrice > 0 ? 1 - b.price / b.originalPrice : 0;
          return db - da;
        }
        default: return a.distanceKm - b.distanceKm;
      }
    });
    return result;
  }, [OFFERS, cat, district, q, maxDistance, maxPrice, minDiscount, minRating, openNow, pickupBefore, diets, sort]);

  // Instant suggestions
  const suggestions = useMemo(() => {
    if (!q || q.length < 1) return null;
    const query = q.toLowerCase();
    const partners = STORES.filter((s) =>
      getStoreName(s, language).toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
    ).slice(0, 3);
    const foods = OFFERS.filter((o) => {
      const { title } = getOfferText(o, language);
      return title.toLowerCase().includes(query) || o.title.toLowerCase().includes(query);
    }).slice(0, 4);
    const cats = CATEGORIES.filter((c) =>
      c.id !== "ყველა" && getCategoryLabel(c.id, language).toLowerCase().includes(query)
    ).slice(0, 3);
    const districts = DISTRICTS.filter((d) =>
      d !== "ყველა უბანი" && getDistrictLabel(d, language).toLowerCase().includes(query)
    ).slice(0, 3);
    if (!partners.length && !foods.length && !cats.length && !districts.length) return null;
    return { partners, foods, cats, districts };
  }, [q, language, OFFERS, STORES]);

  const trendingTerms = language === "en"
    ? ["Khachapuri", "Sushi", "Bakery", "Coffee", "Fruits"]
    : language === "ru"
      ? ["Хачапури", "Суши", "Пекарня", "Кофе", "Фрукты"]
      : language === "tr"
        ? ["Khachapuri", "Suşi", "Fırın", "Kahve", "Meyve"]
        : language === "fa"
          ? ["خاچاپوری", "سوشی", "نانوایی", "قهوه", "میوه"]
          : ["ხაჭაპური", "სუში", "საცხობი", "ყავა", "ხილი"];

  const L = (ka: string, en: string, ru: string, tr?: string, fa?: string) =>
    language === "en" ? en : language === "ru" ? ru : language === "tr" ? (tr ?? en) : language === "fa" ? (fa ?? en) : ka;

  const recentLabel = L("ბოლო ძებნები", "Recent", "Недавние", "Son aramalar", "جستجوهای اخیر");
  const trendingLabel = L("პოპულარული", "Popular", "Популярное", "Popüler", "محبوب");
  const resultsLabel = L("შედეგი", "results", "результатов", "sonuç", "نتیجه");
  const clearLabel = L("გასუფთავება", "Clear", "Очистить", "Temizle", "پاک کردن");
  const filtersLabel = L("ფილტრები", "Filters", "Фильтры", "Filtreler", "فیلترها");
  const partnersLabel = L("პარტნიორები", "Partners", "Партнёры", "Ortaklar", "همکاران");
  const foodsLabel = L("კერძები", "Dishes", "Блюда", "Yemekler", "غذاها");
  const catsLabel = L("კატეგორიები", "Categories", "Категории", "Kategoriler", "دسته‌بندی‌ها");
  const locLabel = L("მდებარეობა", "Location", "Локация", "Konum", "موقعیت");
  const distanceLabel = L("მანძილი", "Distance", "Расстояние", "Mesafe", "فاصله");
  const priceLabel = L("ფასი", "Price", "Цена", "Fiyat", "قیمت");
  const discountLabel = L("ფასდაკლება", "Discount", "Скидка", "İndirim", "تخفیف");
  const ratingLabel = L("რეიტინგი", "Rating", "Рейтинг", "Puan", "امتیاز");
  const openNowLabel = L("ღიაა ახლა", "Open now", "Открыто сейчас", "Şu an açık", "اکنون باز است");
  const pickupLabel = L("აღება მდე", "Pickup by", "Забрать до", "Teslim alma saati", "زمان تحویل تا");
  const dietLabel = L("დიეტა", "Dietary", "Диета", "Beslenme", "رژیم غذایی");
  const sortLabel = L("დალაგება", "Sort", "Сорт.", "Sırala", "مرتب‌سازی");
  const resetLabel = L("გადატვირთვა", "Reset", "Сброс", "Sıfırla", "بازنشانی");

  const sortNames: Record<Sort, string> = {
    distance: L("ახლოს", "Nearest", "Ближе", "En yakın", "نزدیک‌ترین"),
    price: L("ფასი", "Price", "Цена", "Fiyat", "قیمت"),
    discount: L("ფასდაკლება", "Discount", "Скидка", "İndirim", "تخفیف"),
    rating: L("რეიტინგი", "Rating", "Рейтинг", "Puan", "امتیاز"),
  };

  const dietNames: Record<Diet, string> = {
    vegetarian: L("ვეგეტარიანული", "Vegetarian", "Вегетарианское", "Vejetaryen", "گیاهی"),
    vegan: L("ვეგანური", "Vegan", "Веган", "Vegan", "وگان"),
    glutenFree: L("გლუტენის გარეშე", "Gluten-free", "Без глютена", "Glütensiz", "بدون گلوتن"),
    halal: L("ჰალალი", "Halal", "Халяль", "Helal", "حلال"),
  };

  const toggleDiet = (d: Diet) => {
    const next = new Set(diets);
    next.has(d) ? next.delete(d) : next.add(d);
    setDiets(next);
  };

  const showSuggestions = q.length > 0 && suggestions;

  return (
    <div className="min-h-screen">
      {/* Sticky search header */}
      <div className="app-header">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => q && saveRecent(q)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-[15px]"
              />
              {q && (
                <button
                  onClick={() => { setQ(""); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted grid place-items-center"
                  aria-label="clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative h-12 w-12 shrink-0 grid place-items-center rounded-2xl border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border"
              }`}
              aria-label={filtersLabel}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* District dropdown - always visible */}
          <div className="mt-2 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-secondary text-foreground text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{getDistrictLabel(d, language)}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
          </div>

          {/* Sort chips (when there's a query or filters) */}
          {(q || activeFilterCount > 0) && !showFilters && (
            <div className="mt-3 flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
              {SORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    sort === s ? "bg-foreground text-background" : "bg-secondary text-foreground"
                  }`}
                >
                  {sortNames[s]}
                </button>
              ))}
            </div>
          )}

          {showFilters && (
            <div className="mt-3 space-y-4 animate-fade-in">
              {/* Categories */}
              <div>
                <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1.5">{catsLabel}</div>
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCat(c.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                        cat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                    >
                      <span>{c.icon}</span> {getCategoryLabel(c.id, language)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Districts */}
              <div>
                <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1.5">{locLabel}</div>
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
                  {DISTRICTS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDistrict(d)}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                        district === d ? "bg-foreground text-background" : "bg-card border border-border text-foreground"
                      }`}
                    >
                      <MapPin className="w-3 h-3" /> {getDistrictLabel(d, language)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 gap-3 bg-card rounded-2xl border border-border p-3">
                <SliderRow
                  icon={<Navigation className="w-3.5 h-3.5" />}
                  label={distanceLabel}
                  value={`${maxDistance} km`}
                  min={1} max={10} step={0.5}
                  v={maxDistance} onChange={setMaxDistance}
                />
                <SliderRow
                  icon={<Tag className="w-3.5 h-3.5" />}
                  label={priceLabel}
                  value={`≤ ${formatPrice(maxPrice)}`}
                  min={5} max={50} step={1}
                  v={maxPrice} onChange={setMaxPrice}
                />
                <SliderRow
                  icon={<Percent className="w-3.5 h-3.5" />}
                  label={discountLabel}
                  value={`≥ ${minDiscount}%`}
                  min={0} max={80} step={5}
                  v={minDiscount} onChange={setMinDiscount}
                />
                <SliderRow
                  icon={<Star className="w-3.5 h-3.5" />}
                  label={ratingLabel}
                  value={`≥ ${minRating.toFixed(1)}★`}
                  min={0} max={5} step={0.5}
                  v={minRating} onChange={setMinRating}
                />
              </div>

              {/* Open now + pickup */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setOpenNow((v) => !v)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                    openNow ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> {openNowLabel}
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold">
                  <Clock className="w-3 h-3" /> {pickupLabel}
                  <input
                    type="time"
                    value={pickupBefore}
                    onChange={(e) => setPickupBefore(e.target.value)}
                    className="bg-transparent outline-none text-foreground w-[70px]"
                  />
                  {pickupBefore && (
                    <button onClick={() => setPickupBefore("")} aria-label="clear time">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </label>
              </div>

              {/* Diet */}
              <div>
                <div className="text-[11px] font-bold uppercase text-muted-foreground mb-1.5">{dietLabel}</div>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(dietNames) as Diet[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDiet(d)}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                        diets.has(d) ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                    >
                      {dietNames[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> {resetLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="page-shell">
        {/* Instant suggestions */}
        {showSuggestions && (
          <div className="mb-4 bg-card border border-border rounded-2xl overflow-hidden animate-fade-in">
            {suggestions.partners.length > 0 && (
              <SuggestGroup label={partnersLabel} icon={<StoreIcon className="w-3.5 h-3.5" />}>
                {suggestions.partners.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setQ(getStoreName(s, language)); saveRecent(getStoreName(s, language)); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left"
                  >
                    <span className="w-6 h-6 grid place-items-center overflow-hidden text-xl"><StoreLogo value={s.logo} emojiClassName="text-xl" /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{getStoreName(s, language)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {getCategoryLabel(s.category, language)}
                        {s.district ? ` · ${getDistrictLabel(s.district, language)}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </SuggestGroup>
            )}
            {suggestions.foods.length > 0 && (
              <SuggestGroup label={foodsLabel} icon={<Utensils className="w-3.5 h-3.5" />}>
                {suggestions.foods.map((o) => {
                  const { title } = getOfferText(o, language);
                  return (
                    <Link
                      key={o.id}
                      to="/offer/$id"
                      params={{ id: o.id }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left"
                    >
                      <ImageWithSkeleton src={o.image} alt="" aspect="w-10 h-10 shrink-0" className="rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {getStoreName(o, language)}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatPrice(o.price)}</span>
                    </Link>
                  );
                })}
              </SuggestGroup>
            )}
            {suggestions.cats.length > 0 && (
              <SuggestGroup label={catsLabel} icon={<Tag className="w-3.5 h-3.5" />}>
                {suggestions.cats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCat(c.id); setQ(""); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left"
                  >
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-sm font-semibold">{getCategoryLabel(c.id, language)}</span>
                  </button>
                ))}
              </SuggestGroup>
            )}
            {suggestions.districts.length > 0 && (
              <SuggestGroup label={locLabel} icon={<MapPin className="w-3.5 h-3.5" />}>
                {suggestions.districts.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDistrict(d); setQ(""); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-left"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{getDistrictLabel(d, language)}</span>
                  </button>
                ))}
              </SuggestGroup>
            )}
          </div>
        )}

        {!q && (
          <>
            {recent.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold">{recentLabel}</h2>
                  <button onClick={clearRecent} className="text-xs text-muted-foreground font-medium">
                    {clearLabel}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => (
                    <button
                      key={r}
                      onClick={() => setQ(r)}
                      className="px-3 min-h-11 sm:min-h-0 py-1.5 inline-flex items-center rounded-full bg-secondary text-xs font-medium hover:bg-muted"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-6">
              <h2 className="text-sm font-bold mb-3">🔥 {trendingLabel}</h2>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => { setQ(term); saveRecent(term); }}
                    className="px-4 min-h-11 sm:min-h-0 py-2 inline-flex items-center rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 active:scale-95 transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>

            {STORES.length > 0 && (
              <section>
                <h2 className="text-sm font-bold mb-3">{partnersLabel}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {STORES.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setQ(getStoreName(s, language)); saveRecent(getStoreName(s, language)); }}
                      className="flex items-center gap-2 p-3 bg-card border border-border rounded-2xl text-left hover:bg-secondary transition-colors"
                    >
                      <span className="w-7 h-7 grid place-items-center overflow-hidden text-2xl"><StoreLogo value={s.logo} emojiClassName="text-2xl" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{getStoreName(s, language)}</div>
                        {s.district && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {getDistrictLabel(s.district, language)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {(q || activeFilterCount > 0) && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{filtered.length}</span> {resultsLabel}
              </p>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-xs font-semibold text-primary flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> {resetLabel}
                </button>
              )}
            </div>
            {offersError ? (
              <div className="text-center py-16 bg-card rounded-3xl border border-destructive/30">
                <div className="text-5xl mb-3">⚠️</div>
                <p className="text-sm text-destructive">{t("loadErrorGeneric")}</p>
              </div>
            ) : offersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <OfferCardSkeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-3xl border border-border">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-sm text-muted-foreground">{t("noResults")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}

function SuggestGroup({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b last:border-b-0 border-border">
      <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase text-muted-foreground">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function SliderRow({
  icon, label, value, min, max, step, v, onChange,
}: {
  icon: React.ReactNode; label: string; value: string;
  min: number; max: number; step: number; v: number; onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold">{icon} {label}</div>
        <span className="text-xs font-bold text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
