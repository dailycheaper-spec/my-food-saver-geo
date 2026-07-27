import { StoreLogo } from "@/components/StoreLogo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import {
  ArrowLeft, Star, MapPin, Clock, Heart, Share2, Phone, Shield, Bell, BellOff,
} from "lucide-react";
import {
  DISTRICT_COORDS,
  getStoreName, getCategoryLabel, getDistrictLabel,
} from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useFavorites, toggleFavorite, useReviews, useHydrated } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";
import { Skeleton } from "@/components/Skeleton";
import { useDbStore, useLiveDbCardOffers } from "@/lib/db-adapter";
import { useFollowedStoreIds, followStore, unfollowStore, useStoreFollowerCount } from "@/lib/follows";
import { useAuth } from "@/lib/auth";

// Reuse OSM embed logic — small enough to inline here to avoid coupling.
const LazyMap = lazy(async () => {
  const mod = await import("@/components/OfferMiniMap");
  return { default: mod.OfferMiniMap };
});

export const Route = createFileRoute("/store/$id")({
  head: () => ({
    meta: [
      { title: "მაღაზია — Cheaper" },
      { name: "description", content: "პარტნიორის აქტიური შემოთავაზებები Cheaper-ზე." },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-3 text-sm text-primary font-semibold">Retry</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center text-muted-foreground">Store not found.</div>,
  component: StorePage,
});

function StorePage() {
  const { id } = Route.useParams();
  const { language } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { store, raw, loading, notFound, error: storeError } = useDbStore(id);
  const { offers } = useLiveDbCardOffers();
  const hydrated = useHydrated();
  const favs = useFavorites();
  const allReviews = useReviews();
  const { ids: followedIds, refresh: refreshFollows } = useFollowedStoreIds();
  const followerCount = useStoreFollowerCount(store?.id);
  const [followBusy, setFollowBusy] = useState(false);
  const isFollowing = store ? followedIds.has(store.id) : false;

  async function handleFollowToggle() {
    if (!store) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setFollowBusy(true);
    if (isFollowing) await unfollowStore(store.id);
    else await followStore(store.id);
    await refreshFollows();
    setFollowBusy(false);
  }

  const storeOffers = useMemo(
    () => (store ? offers.filter((o) => o.storeId === store.id) : []),
    [offers, store],
  );

  const reviews = useMemo(
    () => (store ? allReviews.filter((r) => r.storeId === store.id).slice(0, 8) : []),
    [allReviews, store],
  );

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="p-8 text-center text-destructive text-sm">
        {language === "en" ? "Couldn't load data. Please try again." : language === "ru" ? "Не удалось загрузить данные. Попробуйте снова." : "მონაცემების ჩატვირთვა ვერ მოხერხდა. სცადეთ თავიდან."}
      </div>
    );
  }

  if (notFound || !store || !raw) {
    return <div className="p-8 text-center text-muted-foreground">Store not found.</div>;
  }

  const isFav = favs.includes(store.id);
  const storeName = getStoreName(store, language);

  const L = (ka: string, en: string, ru: string) =>
    language === "en" ? en : language === "ru" ? ru : ka;

  const description = raw.description ?? L(
    `${storeName} — სანდო პარტნიორი Cheaper-ზე.`,
    `${storeName} is a trusted partner on Cheaper.`,
    `${storeName} — надёжный партнёр на Cheaper.`,
  );

  const heroOffer = storeOffers[0];
  const cover = heroOffer?.image;
  const coord: [number, number] | undefined =
    raw.lat != null && raw.lng != null
      ? [raw.lat, raw.lng]
      : (store.district ? DISTRICT_COORDS[store.district] : undefined);

  const address = raw.address ?? "";
  const phone = raw.phone ?? "";

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

      <div className="mx-auto max-w-2xl px-4 -mt-10 relative space-y-3 sm:space-y-4">
        {/* Header card */}
        <div className="bg-card rounded-3xl shadow-elevated border border-border p-4 sm:p-5">

          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl gradient-warm grid place-items-center overflow-hidden text-3xl shrink-0 border-4 border-card -mt-10 shadow-card">
              <StoreLogo value={store.logo} emojiClassName="text-3xl" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1 className="font-display font-bold text-xl truncate">{storeName}</h1>
                <Shield className="w-4 h-4 text-primary shrink-0" aria-label="Trusted" />
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{getCategoryLabel(store.category, language)}</span>
                {store.district && (
                  <>
                    <span>·</span>
                    <span>{getDistrictLabel(store.district, language)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{description}</p>

          {/* Follow button — server-side, per-account (distinct from local favorites heart) */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleFollowToggle}
              disabled={followBusy}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                isFollowing
                  ? "bg-secondary text-secondary-foreground border border-border"
                  : "bg-primary text-primary-foreground"
              } disabled:opacity-60`}
              aria-pressed={isFollowing}
            >
              {isFollowing ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {isFollowing
                ? L("გამოწერილია", "Following", "Вы подписаны")
                : L("გამოწერა", "Follow", "Подписаться")}
            </button>
            {followerCount !== null && followerCount > 0 && (
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                <span className="font-bold text-foreground">{followerCount}</span>{" "}
                {L("გამომწერი", "followers", "подписч.")}
              </div>
            )}
          </div>

          {/* Info rows — only real fields */}
          {(address || store.district || phone) && (
            <div className="mt-4 space-y-2 text-sm">
              {(address || store.district) && (
                <InfoRow icon={<MapPin className="w-4 h-4 text-primary" />}>
                  {address && <span className="font-medium">{address}</span>}
                  {address && store.district && <span className="text-muted-foreground"> · </span>}
                  {store.district && (
                    <span className="text-muted-foreground">{getDistrictLabel(store.district, language)}</span>
                  )}
                </InfoRow>
              )}
              {phone && (
                <InfoRow icon={<Phone className="w-4 h-4 text-primary" />}>
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-medium">{phone}</a>
                </InfoRow>
              )}
            </div>
          )}
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
            <div className="text-center py-8 sm:py-10 bg-card rounded-2xl border border-border">
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
            <div className="text-center py-8 sm:py-10 bg-card rounded-2xl border border-border">

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
                <div key={r.id} className="bg-card rounded-2xl border border-border p-3 sm:p-4">
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
