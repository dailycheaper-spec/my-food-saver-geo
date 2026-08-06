import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlusCircle, PackageOpen, ShoppingBag, BarChart3, Sparkles, Coins, Store as StoreIcon, Copy, TrendingUp, Check, UtensilsCrossed, FileSignature } from "lucide-react";
import { useMyStores, useStoreOffers, useStoreOrders, formatGel } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { StoreLogo } from "@/components/StoreLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute('/_authenticated/partner/')({
  head: () => ({ meta: [{ title: "პარტნიორის დაფა — Cheaper" }] }),
  component: PartnerHome,
});

function PartnerHome() {
  const { t } = useI18n();
  const { stores, loading } = useMyStores();
  const store = stores.find((s) => s.status === "active") ?? null;
  const { offers, error: offersError } = useStoreOffers(store?.id ?? null);
  const { orders, error: ordersError } = useStoreOrders(store?.id ?? null);
  const dataError = offersError || ordersError;
  const [dupMsg, setDupMsg] = useState<string | null>(null);
  const [dupBusy, setDupBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});

  const yesterdayOffers = useMemo(() => {
    const today = new Date().toDateString();
    return offers
      .filter((o) => new Date(o.created_at).toDateString() !== today && (!o.is_active || o.quantity_sold >= o.quantity_available))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
  }, [offers]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todaysOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today && (o.status === "paid" || o.status === "ready" || o.status === "collected"));
    const soldToday = todaysOrders.reduce((s, o) => s + Number((o as { quantity?: number }).quantity ?? 1), 0);
    const revenue = todaysOrders.reduce((s, o) => s + Number(o.amount), 0);
    const active = offers.filter((o) => o.is_active && o.quantity_sold < o.quantity_available).length;
    const pending = orders.filter((o) => o.status === "paid" || o.status === "ready").length;
    const totalOrders = orders.filter((o) => o.status !== "cancelled").length;
    return { revenue, active, pending, totalOrders, todayCount: todaysOrders.length, soldToday };
  }, [orders, offers]);

  function openPicker() {
    if (yesterdayOffers.length === 0) {
      setDupMsg(t("noYesterdayOffer"));
      setTimeout(() => setDupMsg(null), 2500);
      return;
    }
    setSelected(new Set(yesterdayOffers.map((o) => o.id)));
    setQtyOverrides(Object.fromEntries(yesterdayOffers.map((o) => [o.id, o.quantity_available])));
    setPickerOpen(true);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function duplicateSelected() {
    if (!store || selected.size === 0) return;
    setDupBusy(true);
    setDupMsg(null);
    const chosen = yesterdayOffers.filter((o) => selected.has(o.id));
    const payload = chosen.map((o) => ({
      store_id: store.id,
      title: o.title,
      description: o.description,
      category: o.category,
      original_price: o.original_price,
      discounted_price: o.discounted_price,
      quantity_available: qtyOverrides[o.id] > 0 ? qtyOverrides[o.id] : o.quantity_available,
      pickup_from: o.pickup_from,
      pickup_to: o.pickup_to,
      delivery_available: o.delivery_available,
      image_url: o.image_url,
      image_path: (o as any).image_path ?? null,
      image_signed_url_expires_at: (o as any).image_signed_url_expires_at ?? null,
      is_active: true,
    }));
    const { error } = await supabase.from("offers").insert(payload);
    setDupBusy(false);
    setPickerOpen(false);
    setDupMsg(error ? error.message : t("duplicated"));
    setTimeout(() => setDupMsg(null), 2500);
  }


  if (loading) {
    return <div className="text-center py-16 text-muted-foreground">{t("loading")}</div>;
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
      {dataError && (
        <div className="bg-destructive/10 rounded-2xl border border-destructive/30 p-4 text-center">
          <p className="text-sm text-destructive">{t("loadErrorGeneric")}</p>
        </div>
      )}
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("hello")}</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold truncate flex items-center gap-2">
            <span className="w-8 h-8 inline-grid place-items-center overflow-hidden rounded-lg"><StoreLogo value={store.logo_url || store.logo} emojiClassName="text-2xl" /></span> {store.name}
          </h1>
        </div>
        <div className="shrink-0 text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">{t("today")}</div>
          <div className="font-bold text-primary text-lg">{formatGel(stats.revenue)}</div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-transparent border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> {t("todaySummary")}
          </h3>
          <button
            onClick={openPicker}
            disabled={dupBusy}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1 shadow-soft disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Copy className="w-3.5 h-3.5" /> {t("duplicateYesterday")}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SumCell label={t("productsSold")} value={String(stats.soldToday)} />
          <SumCell label={t("revenue")} value={formatGel(stats.revenue)} />
          <SumCell label={t("ordersLbl")} value={String(stats.todayCount)} />
        </div>
        {dupMsg && <div className="mt-3 text-xs text-center text-primary font-medium">{dupMsg}</div>}
      </div>

      {/* 4 huge action tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <BigTile
          to="/partner/new"
          icon={<PlusCircle className="w-9 h-9" />}
          title={t("newShort")}
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
          subtitle={`${stats.totalOrders}`}
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
        <Shortcut to="/partner/menu" icon={<UtensilsCrossed className="w-4 h-4" />} label={t("partner.menu.shortcut")} />
        <Shortcut to="/partner/ai" icon={<Sparkles className="w-4 h-4" />} label={t("aiMode")} />
        <Shortcut to="/partner/insights" icon={<BarChart3 className="w-4 h-4" />} label={t("insights")} />
        <Shortcut to="/partner/balance" icon={<Coins className="w-4 h-4" />} label={t("balance")} />
        <Shortcut to="/partner/profile" icon={<StoreIcon className="w-4 h-4" />} label={t("profile")} />
        <Shortcut to="/partner/contract" icon={<FileSignature className="w-4 h-4" />} label={t("partner.contract.navLabel")} />
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("duplicateYesterdayPickTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {yesterdayOffers.map((o) => {
              const checked = selected.has(o.id);
              return (
                <label
                  key={o.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <span className={`grid place-items-center w-5 h-5 rounded-md border shrink-0 ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                    {checked && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <input type="checkbox" checked={checked} onChange={() => toggleSelected(o.id)} className="sr-only" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{o.title}</span>
                    <span className="block text-xs text-muted-foreground">{formatGel(o.discounted_price)}</span>
                  </span>
                  {checked && (
                    <input
                      type="number"
                      min={1}
                      value={qtyOverrides[o.id] ?? o.quantity_available}
                      onClick={(e) => e.preventDefault()}
                      onChange={(e) => setQtyOverrides((prev) => ({ ...prev, [o.id]: Number(e.target.value) }))}
                      className="w-16 shrink-0 px-2 py-1.5 rounded-lg bg-background border border-border text-sm text-center"
                      aria-label={t("qtyLbl")}
                    />
                  )}
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <button
              onClick={duplicateSelected}
              disabled={dupBusy || selected.size === 0}
              className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {t("duplicateYesterdayConfirm", { count: selected.size })}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function SumCell({ label, value }: { label: string; value: string }) {
  const sizeClass = value.length > 10 ? "text-sm" : value.length > 7 ? "text-base" : "text-lg";
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-3 text-center overflow-hidden">
      <div className={`${sizeClass} font-bold text-primary leading-tight break-words`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
