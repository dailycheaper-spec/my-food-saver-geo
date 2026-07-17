import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Search as SearchIcon, X, SlidersHorizontal, MapPin } from "lucide-react";
import {
  CATEGORIES, DISTRICTS, OFFERS,
  getCategoryLabel, getDistrictLabel, offerMatchesQuery,
  type Category,
} from "@/lib/mock-data";
import { OfferCard } from "@/components/OfferCard";
import { useI18n } from "@/lib/i18n";

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

function SearchPage() {
  const { t, language } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "ყველა">("ყველა");
  const [district, setDistrict] = useState("ყველა უბანი");
  const [showFilters, setShowFilters] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const filtered = useMemo(() => {
    return OFFERS.filter((o) => {
      if (cat !== "ყველა" && o.category !== cat) return false;
      if (district !== "ყველა უბანი" && o.district !== district) return false;
      if (q && !offerMatchesQuery(o, q)) return false;
      return true;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [cat, district, q]);

  const trendingTerms = language === "en"
    ? ["Khachapuri", "Sushi", "Bakery", "Coffee", "Fruits"]
    : language === "ru"
      ? ["Хачапури", "Суши", "Пекарня", "Кофе", "Фрукты"]
      : ["ხაჭაპური", "სუში", "საცხობი", "ყავა", "ხილი"];

  const searchLabel = language === "en" ? "Search" : language === "ru" ? "Поиск" : "ძებნა";
  const recentLabel = language === "en" ? "Recent" : language === "ru" ? "Недавние" : "ბოლო ძებნები";
  const trendingLabel = language === "en" ? "Popular" : language === "ru" ? "Популярное" : "პოპულარული";
  const resultsLabel = language === "en" ? "results" : language === "ru" ? "результатов" : "შედეგი";
  const clearLabel = language === "en" ? "Clear" : language === "ru" ? "Очистить" : "გასუფთავება";
  const filtersLabel = language === "en" ? "Filters" : language === "ru" ? "Фильтры" : "ფილტრები";

  return (
    <div className="min-h-screen">
      {/* Sticky search header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onBlur={() => saveRecent(q)}
                enterKeyHint="search"
                inputMode="search"
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
              className={`h-12 w-12 shrink-0 grid place-items-center rounded-2xl border transition-colors ${
                showFilters || cat !== "ყველა" || district !== "ყველა უბანი"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border"
              }`}
              aria-label={filtersLabel}
            >
              <SlidersHorizontal className="w-[18px] h-[18px]" />
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                      cat === c.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    <span>{c.icon}</span> {getCategoryLabel(c.id, language)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
                {DISTRICTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDistrict(d)}
                    className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                      district === d
                        ? "bg-foreground text-background"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    <MapPin className="w-3 h-3" /> {getDistrictLabel(d, language)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
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
                      className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium hover:bg-muted"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-bold mb-3">🔥 {trendingLabel}</h2>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setQ(t); saveRecent(t); }}
                    className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 active:scale-95 transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {q && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{filtered.length}</span> {resultsLabel}
              </p>
            </div>
            {filtered.length === 0 ? (
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

/* hide scrollbars for horizontal chips */
declare global {
  interface CSSStyleDeclaration { scrollbarWidth?: string; }
}
