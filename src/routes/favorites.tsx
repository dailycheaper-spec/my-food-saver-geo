import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { STORES, OFFERS } from "@/lib/mock-data";
import { toggleFavorite, useFavorites } from "@/lib/storage";
import { OfferCard } from "@/components/OfferCard";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "ფავორიტები — გემო" }, { name: "description", content: "შენი ფავორიტი მაღაზიები და საცხობები." }] }),
  component: Favorites,
});

function Favorites() {
  const favs = useFavorites();
  const favStores = STORES.filter((s) => favs.includes(s.id));
  const favOffers = OFFERS.filter((o) => favs.includes(o.storeId));

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="font-display text-2xl font-bold">ფავორიტები</h1>
      <p className="text-sm text-muted-foreground mt-1">
        გამოიწერე ფავორიტი მაღაზიები — მიიღე პირველი შეტყობინება ახალ პაკეტზე.
      </p>

      {favStores.length === 0 ? (
        <div className="mt-8 text-center py-14 bg-card rounded-2xl border border-border">
          <Heart className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">ჯერ არავინ გამოგიწერია.</p>
          <p className="text-xs text-muted-foreground mt-1">დააჭირე ♡ შემოთავაზების ბარათზე მაღაზიის გამოსაწერად.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary font-medium">მაღაზიების ნახვა</Link>
        </div>
      ) : (
        <>
          <section className="mt-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">გამოწერილი მაღაზიები</h2>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {favStores.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 border border-border shadow-soft">
                  <div className="w-12 h-12 rounded-xl gradient-warm grid place-items-center text-2xl">{s.logo}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.category} • {s.district} • ⭐ {s.rating}</div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(s.id)}
                    className="w-9 h-9 rounded-full bg-muted grid place-items-center"
                    aria-label="ამოღება"
                  >
                    <Heart className="w-4 h-4 fill-destructive text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {favOffers.length > 0 && (
            <section className="mt-8">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">მათი აქტიური შემოთავაზებები</h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favOffers.map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
