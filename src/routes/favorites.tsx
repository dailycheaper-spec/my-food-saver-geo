import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";
import { useLiveDbCardOffers } from "@/lib/db-adapter";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "ფავორიტები — Cheaper" }, { name: "description", content: "პროდუქტები, რომლებიც მოგწონს." }] }),
  component: Favorites,
});

function Favorites() {
  const { language } = useI18n();
  const L = (ka: string, en: string, ru: string) => (language === "en" ? en : language === "ru" ? ru : ka);
  const favs = useFavorites();
  const { offers, error: offersError } = useLiveDbCardOffers();
  const favOffers = offers.filter((o) => favs.includes(o.id));

  return (
    <div className="page-shell">
      <h1 className="font-display text-2xl font-bold">{L("ფავორიტები", "Favorites", "Избранное")}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {L(
          "პროდუქტები, რომლებიც მოგწონს — ყველა ერთ ადგილას.",
          "Products you've liked — all in one place.",
          "Товары, которые тебе понравились — все в одном месте.",
        )}
      </p>

      {offersError ? (
        <div className="mt-8 text-center py-14 bg-card rounded-2xl border border-destructive/30">
          <p className="text-sm text-destructive">{L("მონაცემების ჩატვირთვა ვერ მოხერხდა. სცადეთ თავიდან.", "Couldn't load data. Please try again.", "Не удалось загрузить данные. Попробуйте снова.")}</p>
        </div>
      ) : favOffers.length === 0 ? (
        <div className="mt-8 text-center py-14 bg-card rounded-2xl border border-border">
          <Heart className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">
            {L("ჯერ არაფერი მოგწონს.", "Nothing liked yet.", "Пока ничего не понравилось.")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {L(
              "დააჭირე ♡ შემოთავაზების ბარათზე მოწონებისთვის.",
              "Tap ♡ on an offer card to like it.",
              "Нажми ♡ на карточке предложения, чтобы добавить его.",
            )}
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary font-medium">
            {L("შემოთავაზებების ნახვა", "Browse offers", "Смотреть предложения")}
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
