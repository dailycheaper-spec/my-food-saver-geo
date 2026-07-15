import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PlusCircle, PackageOpen, ShoppingBag, BarChart3, Zap, Sparkles, Coins, Store as StoreIcon } from "lucide-react";
import { useMyStores, useStoreOffers, useStoreOrders, formatGel } from "@/lib/db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/partner/")({
  head: () => ({ meta: [{ title: "პარტნიორის დაფა — Cheaper" }] }),
  component: PartnerHome,
});

function PartnerHome() {
  const { t } = useI18n();
  const { stores, loading } = useMyStores();
  const store = stores[0] ?? null;
  const { offers } = useStoreOffers(store?.id ?? null);
  const { orders } = useStoreOrders(store?.id ?? null);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todaysOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today && (o.status === "paid" || o.status === "ready" || o.status === "collected"));
    const revenue = todaysOrders.reduce((s, o) => s + Number(o.amount), 0);
    const active = offers.filter((o) => o.is_active && o.quantity_sold < o.quantity_available).length;
    const pending = orders.filter((o) => o.status === "paid" || o.status === "ready").length;
    return { revenue, active, pending, todayCount: todaysOrders.length };
  }, [orders, offers]);

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">იტვირთება…</div>;
  }

  if (!store) {
    return (
      <div className="bg-card rounded-3xl border border-border p-8 text-center max-w-md mx-auto mt-8">
        <div className="text-5xl mb-3">🏪</div>
          <h2 className="font-display text-xl font-bold">{t("noStore")}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t("noStoreText")}</p>
        <Link to="/partner-apply" className="inline-block mt-5 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold">{t("apply")}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("hello")}</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold truncate flex items-center gap-2">
            <span>{store.logo ?? "🏪"}</span> {store.name}
          </h1>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">{t("today")}</div>
          <div className="font-bold text-primary text-lg">{formatGel(stats.revenue)}</div>
        </div>
      </div>

      {/* 4 huge action tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <BigTile
          to="/partner/new"
          icon={<PlusCircle className="w-9 h-9" />}
          title={t("newOffer")}
          subtitle={t("fullForm")}
          gradient="from-primary via-primary to-primary/70"
        />
        <BigTile
          to="/partner/offers"
          icon={<PackageOpen className="w-9 h-9" />}
          title={t("active")}
          subtitle={`${stats.active} ${t("offers")}`}
          gradient="from-blue-500 via-blue-500 to-blue-400"
        />
        <BigTile
          to="/partner/orders"
          icon={<ShoppingBag className="w-9 h-9" />}
          title={t("navOrders")}
          subtitle={`${stats.pending}`}
          gradient="from-orange-500 via-orange-500 to-amber-400"
          badge={stats.pending}
        />
        <BigTile
          to="/partner/stats"
          icon={<BarChart3 className="w-9 h-9" />}
          title={t("stats")}
          subtitle={t("daily")}
          gradient="from-purple-500 via-purple-500 to-fuchsia-400"
        />
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Shortcut to="/partner/quick" icon={<Zap className="w-4 h-4" />} label={t("quickOffer")} />
        <Shortcut to="/partner/ai" icon={<Sparkles className="w-4 h-4" />} label={t("aiMode")} />
        <Shortcut to="/partner/balance" icon={<Coins className="w-4 h-4" />} label={t("balance")} />
        <Shortcut to="/partner/profile" icon={<StoreIcon className="w-4 h-4" />} label={t("profile")} />
      </div>

      {/* Recent orders */}
      <div className="bg-card/70 backdrop-blur rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{t("recentOrders")}</h3>
          <Link to="/partner/orders" className="text-xs text-primary font-medium">{t("all")} →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("noPartnerOrders")}</p>
        ) : (
          <div className="space-y-1">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm py-2.5 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <div className="font-mono font-semibold">#{o.code}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.offer?.title}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">{formatGel(Number(o.amount))}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{o.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BigTile({ to, icon, title, subtitle, gradient, badge }: {
  to: string; icon: React.ReactNode; title: string; subtitle: string; gradient: string; badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`relative overflow-hidden aspect-[5/4] sm:aspect-[3/2] rounded-3xl p-5 sm:p-6 text-white bg-gradient-to-br ${gradient} shadow-lg active:scale-[0.98] transition-transform`}
    >
      <div className="absolute inset-0 bg-white/5" />
      <div className="relative flex flex-col justify-between h-full">
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">{icon}</div>
          {badge && badge > 0 ? (
            <span className="min-w-[24px] h-6 px-2 rounded-full bg-white text-foreground text-xs font-bold grid place-items-center">{badge}</span>
          ) : null}
        </div>
        <div>
          <div className="font-display font-bold text-lg sm:text-xl leading-tight">{title}</div>
          <div className="text-xs sm:text-sm opacity-90">{subtitle}</div>
        </div>
      </div>
    </Link>
  );
}

function Shortcut({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 text-sm font-medium">
      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center">{icon}</span>
      {label}
    </Link>
  );
}
