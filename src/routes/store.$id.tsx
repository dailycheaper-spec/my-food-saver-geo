import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import {
  ArrowLeft, Star, MapPin, Clock, Heart, Share2, Phone, Shield,
} from "lucide-react";
import {
  STORES, OFFERS, DISTRICT_COORDS,
  getStoreName, getCategoryLabel, getDistrictLabel,
  type Store,
} from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useFavorites, toggleFavorite, useReviews, useHydrated } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";
import { Skeleton } from "@/components/Skeleton";

// Reuse OSM embed logic — small enough to inline here to avoid coupling.
const LazyMap = lazy(async () => {
  const mod = await import("@/components/OfferMiniMap");
  return { default: mod.OfferMiniMap };
});

export const Route = createFileRoute("/store/$id")({
  loader: ({ params }) => {
    const store = STORES.find((s) => s.id === params.id);
    if (!store) throw notFound();
    return { store };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "მაღაზია — Cheaper" }, { name: "robots", content: "noindex" }] };
    const s = loaderData.store;
    return {
      meta: [
        { title: `${s.name} — Cheaper` },
        { name: "description", content: `${s.name} — ფასდაკლებული შეთავაზებები, ${s.district}. რეიტინგი ${s.rating}★.` },
        { property: "og:title", content: `${s.name} — Cheaper` },
      ],
    };
  },
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-3 text-sm text-primary font-semibold">Retry</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center text-muted-foreground">Store not found.</div>,
  component: StorePage,
});

// deterministic pseudo-random from string
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function StorePage() {
  const { store } = Route.useLoaderData();
  const { language } = useI18n();
  const hydrated = useHydrated();
  const favs = useFavorites();
  const isFav = favs.includes(store.id);
  const allReviews = useReviews();
  const reviews = useMemo(
    () => allReviews.filter((r) => r.storeId === store.id).slice(0, 8),
    [allReviews, store.id],
  );
  const storeName = getStoreName(store, language);

  const L = (ka: string, en: string, ru: string) =>
    language === "en" ? en : language === "ru" ? ru : ka;

  const storeOffers = useMemo(() => OFFERS.filter((o) => o.storeId === store.id), [store.id]);

  // Deterministic hours & description
  const seed = hash(store.id);
  const openH = 8 + (seed % 3); // 8-10
  const closeH = 20 + (seed % 3); // 20-22
  const address = storeOffers[0]?.address
    ?? `${getDistrictLabel(store.district, language)}, ${(seed % 90) + 10}`;
  const phone = `+995 5${String(90 + (seed % 10))} ${String(100 + (seed % 900))}-${String(100 + ((seed >> 3) % 900))}`;

  const description = L(
    `${storeName} — სანდო პარტნიორი ${getDistrictLabel(store.district, language)}-ში. ყოველდღიური ფასდაკლებული პაკეტები დღის ბოლოს, სუფთა კერძები და საუკეთესო ფასი.`,
    `${storeName} is a trusted partner in ${getDistrictLabel(store.district, language)}. End-of-day discounted packs, fresh items, and the best prices around.`,
    `${storeName} — надёжный партнёр в ${getDistrictLabel(store.district, language)}. Уценённые наборы в конце дня, свежие блюда и лучшая цена.`,
  );

  const heroOffer = storeOffers[0];
  const cover = heroOffer?.image;
  const coord = DISTRICT_COORDS[store.district];

  return (
    <div className="min-h-screen pb-8">
      {/* Cover */}
      <div className="relative h-52 sm:h-64 w-full bg-muted overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="w-full h-full gradient-warm" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <button
            onClick={() => history.back()}
            className="w-10 h-10 rounded-full bg-background/90 backdrop-blur grid place-items-center shadow-soft"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (navigator.share) navigator.share({ title: storeName, url: window.location.href }).catch(() => {});
                else navigator.clipboard?.writeText(window.location.href);
              }}
              className="w-10 h-10 rounded-full bg-background/90 backdrop-blur grid place-items-center shadow-soft"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => toggleFavorite(store.id)}
              className="w-10 h-10 rounded-full bg-background/90 backdrop-blur grid place-items-center shadow-soft"
              aria-label="Favorite"
            >
              <Heart className={`w-5 h-5 ${isFav ? "fill-destructive text-destructive" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 -mt-10 relative space-y-4">
        {/* Header card */}
        <div className="bg-card rounded-3xl shadow-elevated border border-border p-5">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl gradient-warm grid place-items-center text-3xl shrink-0 border-4 border-card -mt-10 shadow-card">
              {store.logo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-display font-bold text-xl truncate">{storeName}</h1>
                <Shield className="w-4 h-4 text-primary shrink-0" aria-label="Trusted" />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {store.rating}
                </span>
                <span>·</span>
                <span>{store.followers.toLocaleString()} {L("გამომწერი", "followers", "подписчиков")}</span>
                <span>·</span>
                <span>{getCategoryLabel(store.category, language)}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{description}</p>

          {/* Info rows */}
          <div className="mt-4 space-y-2 text-sm">
            <InfoRow icon={<MapPin className="w-4 h-4 text-primary" />}>
              <span className="font-medium">{address}</span>
              <span className="text-muted-foreground"> · {getDistrictLabel(store.district, language)}</span>
            </InfoRow>
            <InfoRow icon={<Clock className="w-4 h-4 text-primary" />}>
              <span className="font-medium">
                {openH.toString().padStart(2, "0")}:00 – {closeH.toString().padStart(2, "0")}:00
              </span>
              <span className="text-muted-foreground"> · {L("ყოველდღე", "Every day", "Ежедневно")}</span>
            </InfoRow>
            <InfoRow icon={<Phone className="w-4 h-4 text-primary" />}>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-medium">{phone}</a>
            </InfoRow>
          </div>
        </div>

        {/* Active offers */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display font-bold text-lg">
              {L("აქტიური შეთავაზებები", "Active offers", "Активные предложения")}
            </h2>
            <span className="text-xs text-muted-foreground font-semibold">{storeOffers.length}</span>
          </div>
          {storeOffers.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-2xl border border-border">
              <div className="text-4xl mb-2">🕒</div>
              <p className="text-sm text-muted-foreground">
                {L("ამჟამად აქტიური შეთავაზება არ არის.", "No active offers right now.", "Нет активных предложений.")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {storeOffers.map((o) => <OfferCard key={o.id} offer={o} />)}
            </div>
          )}
        </section>

        {/* Map */}
        {heroOffer ? (
          <section>
            <div className="mb-3 px-1">
              <h2 className="font-display font-bold text-lg">
                {L("მდებარეობა", "Location", "Локация")}
              </h2>
            </div>
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-3xl" />}>
              <LazyMap offer={heroOffer} />
            </Suspense>
          </section>
        ) : coord && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${coord[0]}&mlon=${coord[1]}#map=15/${coord[0]}/${coord[1]}`}
            target="_blank" rel="noreferrer"
            className="block bg-card rounded-2xl border border-border p-4 text-sm font-semibold text-primary"
          >
            {L("რუკაზე ნახვა", "View on map", "Открыть на карте")}
          </a>
        )}

        {/* Reviews */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display font-bold text-lg">
              {L("შეფასებები", "Reviews", "Отзывы")}
            </h2>
            <span className="text-xs text-muted-foreground font-semibold">
              {hydrated ? reviews.length : "—"}
            </span>
          </div>
          {!hydrated ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-2xl border border-border">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm text-muted-foreground">
                {L("ჯერ არაფერი დაწერილა.", "No reviews yet.", "Пока нет отзывов.")}
              </p>
              {heroOffer && (
                <Link
                  to="/offer/$id"
                  params={{ id: heroOffer.id }}
                  className="inline-block mt-3 text-sm text-primary font-semibold"
                >
                  {L("დაწერე პირველი შეფასება", "Write the first review", "Оставить первый отзыв")}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{r.author}</div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < r.rating ? "fill-amber-500 text-amber-500" : "text-muted"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-secondary grid place-items-center shrink-0">{icon}</div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

// Suppress unused import lint (Store type only for reference)
export type _StoreRef = Store;
