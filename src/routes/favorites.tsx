import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "ფავორიტები — Cheaper" }, { name: "description", content: "პროდუქტები, რომლებიც მოგწონს." }, { name: "robots", content: "noindex" }] }),
  component: Favorites,
});

function Favorites() {
  const { t } = useI18n();
  const favs = useFavorites();
  const { offers, error: offersError } = useLiveDbCardOffers();
  const favOffers = offers.filter((o) => favs.includes(o.id));

  return (
    <div className="page-shell">
      <h1 className="font-display text-2xl font-bold">{t("favorites.favorites")}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {t("favorites.productsYouVeLiked")}
      </p>

      {offersError ? (
        <div className="mt-8 text-center py-14 bg-card rounded-2xl border border-destructive/30">
          <p className="text-sm text-destructive">{t("favorites.couldnTLoadData")}</p>
        </div>
      ) : favOffers.length === 0 ? (
        <div className="mt-8 text-center py-14 bg-card rounded-2xl border border-border">
          <Heart className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">
            {t("favorites.nothingLikedYet")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("favorites.tapOnAnOffer")}
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary font-medium">
            {t("favorites.browseOffers")}
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {favOffers.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}
    </div>
  );
}
