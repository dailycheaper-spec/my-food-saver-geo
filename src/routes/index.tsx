import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Search, Sparkles, Leaf, Gift, Map as MapIcon, Shield, Store } from "lucide-react";
import { CATEGORIES, DISTRICTS, OFFERS, type Category } from "@/lib/mock-data";
import { OfferCard } from "@/components/OfferCard";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useMyRole } from "@/lib/db";
import heroImage from "@/assets/hero-bakery.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "გემო — გადაარჩინე საკვები ფასდაკლებით ახლომდებარე მაღაზიებში" },
      { name: "description", content: "აღმოაჩინე დღის დარჩენილი გემრიელი პაკეტები ვაკეში, საბურთალოზე, ვერაზე და მთელ თბილისში. მიტანა ან ადგილზე აღება." },
    ],
  }),
  component: Home,
});

function Home() {
  const [cat, setCat] = useState<Category | "ყველა">("ყველა");
  const [district, setDistrict] = useState("ყველა უბანი");
  const [q, setQ] = useState("");
  const [onlyDelivery, setOnlyDelivery] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isPartner, loading: rolesLoading } = useMyRole();

  const filtered = useMemo(() => {
    return OFFERS.filter((o) => {
      if (cat !== "ყველა" && o.category !== cat) return false;
      if (district !== "ყველა უბანი" && o.district !== district) return false;
      if (onlyDelivery && !o.delivery) return false;
      if (q && !`${o.title} ${o.storeName} ${o.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [cat, district, q, onlyDelivery]);

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
                  <Shield className="w-3.5 h-3.5" /> ადმინი
                </Link>
              )}
              {user && !rolesLoading && !isAdmin && isPartner && (
                <Link to="/partner" className="text-sm bg-accent text-accent-foreground font-semibold px-3 py-1.5 rounded-full shadow-soft inline-flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> პარტნიორი
                </Link>
              )}
              <Link to={user ? "/profile" : "/auth"} className="text-sm bg-accent text-accent-foreground font-semibold px-3 py-1.5 rounded-full shadow-soft">
                {user ? "პროფილი" : "შესვლა"}
              </Link>
              <button className="flex items-center gap-1.5 text-sm bg-card/20 backdrop-blur px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4" />
                თბილისი
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/20 backdrop-blur text-xs font-medium mb-3">
              <Leaf className="w-3.5 h-3.5" /> გადაარჩინე საკვები, დაზოგე ფული
            </div>
            <h1 className="text-3xl font-display font-bold leading-tight">
              დღის საუკეთესო შემოთავაზებები<br/>
              <span className="text-accent">-70%-მდე ფასდაკლებით</span>
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/90 max-w-md">
              ხაჭაპური, პური, სუში, ხილი — ყოველდღიური სიურპრიზ პაკეტები ახლომდებარე მაღაზიებიდან.
            </p>
          </div>

          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ეძებე მაღაზია, კერძი ან უბანი..."
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card text-foreground placeholder:text-muted-foreground shadow-elevated focus:outline-none focus:ring-2 focus:ring-primary-glow text-sm"
            />
          </div>
        </div>
      </header>

      {/* Feature strip */}
      <section className="mx-auto max-w-2xl px-4 -mt-4 relative z-10">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Sparkles, label: "სიურპრიზ პაკეტი" },
            { icon: Gift, label: "„გააჩუქე“ ფუნქცია" },
            { icon: Leaf, label: "ეკო-მიდგომა" },
          ].map(({ icon: I, label }) => (
            <div key={label} className="bg-card rounded-xl p-3 shadow-soft text-center">
              <I className="w-5 h-5 mx-auto text-primary" />
              <div className="text-[11px] font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

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
              <span>{c.icon}</span> {c.label}
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
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button
            onClick={() => setOnlyDelivery((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
              onlyDelivery ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            🚚 მხოლოდ მიტანით
          </button>
        </div>
      </section>

      {/* Offers grid */}
      <section className="mx-auto max-w-2xl px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-bold">ახლომდებარე შემოთავაზებები</h2>
          <Link to="/map" className="text-xs font-semibold text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
            <MapIcon className="w-3.5 h-3.5" /> რუკაზე ({filtered.length})
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-14 bg-card rounded-2xl border border-border">
            <div className="text-4xl mb-2">🥲</div>
            <p className="text-sm text-muted-foreground">არაფერი მოიძებნა. სცადეთ სხვა ფილტრი.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((o) => <OfferCard key={o.id} offer={o} />)}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-warm text-warm-foreground p-5 flex items-center gap-4">
          <div className="text-3xl">🎁</div>
          <div className="flex-1">
            <div className="font-semibold">ვერ მიხვალ აღებაზე?</div>
            <p className="text-xs opacity-80">გააჩუქე შენი შეკვეთა მეგობარს ან ქველმოქმედებას პირდაპირ აპლიკაციიდან.</p>
          </div>
          <Link to="/orders" className="text-xs font-semibold underline">იხილე</Link>
        </div>
      </section>
    </div>
  );
}
