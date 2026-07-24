import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, PackageOpen, ShoppingBag, BarChart3, LogOut, Bell, Truck, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePartnerAccount, useStoreOrders } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { useNewOrderSound, useSoundPref } from "@/lib/partner-sound";


export const Route = createFileRoute("/_authenticated/partner")({
  component: PartnerLayout,
  errorComponent: PartnerRouteError,
});

function PartnerRouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="max-w-md text-center bg-card rounded-3xl border border-border p-6 shadow-card">
        <div className="text-4xl mb-3">🏪</div>
        <h1 className="font-display text-xl font-bold">პარტნიორის პანელი ვერ ჩაიტვირთა</h1>
        <p className="text-sm text-muted-foreground mt-2 break-words">
          {error?.message || "სცადეთ თავიდან."}
        </p>
        <button
          onClick={reset}
          className="mt-5 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          თავიდან ცდა
        </button>
      </div>
    </div>
  );
}

function PartnerLayout() {
  const { t } = useI18n();
  const { stores, role, loading, error, isAdmin, isPartner } = usePartnerAccount();
  const store = stores.find((s) => s.status === "active") ?? null;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { newCount, resetNewCount } = useStoreOrders(store?.id ?? null);
  const [notifOpen, setNotifOpen] = useState(false);
  const hasPartnerAccess = isAdmin || isPartner || stores.length > 0;

  const sound = useSoundPref();
  const [showSoundBanner, setShowSoundBanner] = useState(false);
  useEffect(() => {
    if (!hasPartnerAccess) return;
    if (sound.pref === null) setShowSoundBanner(true);
    else setShowSoundBanner(false);
  }, [hasPartnerAccess, sound.pref]);

  useNewOrderSound(stores.map((s) => s.id), sound.enabled);

  useEffect(() => {
    if (!loading && !hasPartnerAccess) {
      navigate({ to: "/partner-apply", replace: true });
    }
  }, [hasPartnerAccess, loading, navigate]);

  // Desktop OS notification on new orders for the currently-viewed store
  useEffect(() => {
    if (newCount > 0 && "Notification" in window && Notification.permission === "granted") {
      new Notification(t("newOrder"), { body: t("newOrderBody") });
    }
  }, [newCount, t]);


  const nav = [
    { to: "/partner", label: t("navHome"), icon: Home, exact: true },
    { to: "/partner/offers", label: t("offers"), icon: PackageOpen },
    { to: "/partner/orders", label: t("navOrders"), icon: ShoppingBag, badge: newCount },
    { to: "/partner/delivery", label: t("navDelivery"), icon: Truck },
    { to: "/partner/stats", label: t("stats"), icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 grid place-items-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-3">🥗</div>
          <div className="font-display text-xl font-bold">{t("loadingPartner")}</div>
          <p className="text-sm text-muted-foreground mt-1">{t("checkingAccount")}</p>
          {error && (
            <p className="text-xs text-destructive mt-3 break-words">{error}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-xs px-4 py-2 rounded-full border border-border text-muted-foreground hover:bg-muted/50"
          >
            {t("tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  const blockingAccessError = error && !hasPartnerAccess;

  if (blockingAccessError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 grid place-items-center px-4">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-display text-xl font-bold">{t("partnerError")}</div>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
            {t("tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (!hasPartnerAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 grid place-items-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🏪</div>
          <div className="font-display text-xl font-bold">{t("redirectingApply")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/partner" className="flex items-center gap-2">
            <span className="text-xl">🥗</span>
            <span className="font-display font-bold text-lg">{t("brand")}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">
              {role === "admin" ? t("admin") : t("partner")}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setNotifOpen(true); resetNewCount(); if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }}
              className="relative p-2 rounded-full hover:bg-muted/50"
              aria-label="შეტყობინებები"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {newCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">{newCount}</span>
              )}
            </button>
            <button
              onClick={() => (sound.enabled ? sound.disable() : sound.enable())}
              className="p-2 rounded-full hover:bg-muted/50"
              aria-label={sound.enabled ? "ხმის გამორთვა" : "ხმის ჩართვა"}
              title={sound.enabled ? "ხმა ჩართულია" : "ხმა გამორთულია"}
            >
              {sound.enabled
                ? <Volume2 className="w-5 h-5 text-primary" />
                : <VolumeX className="w-5 h-5 text-muted-foreground" />}
            </button>
            <LanguageSwitcher compact />
            <Link to="/partner/profile" className="p-2 rounded-full hover:bg-muted/50 text-xs font-medium hidden sm:block">
              {!loading && store ? `${store.logo ?? "🏪"} ${store.name}` : t("profile")}
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="p-2 rounded-full hover:bg-muted/50"
              aria-label="გასვლა"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Desktop side nav strip */}
        <nav className="hidden md:flex mx-auto max-w-6xl px-4 gap-1 pb-1">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition ${
                  active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <n.icon className="w-4 h-4" /> {n.label}
                {n.badge ? <span className="ml-1 min-w-[18px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">{n.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-4 md:py-6">
        {showSoundBanner && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-lg">🔔</span>
            <p className="flex-1 text-sm">ჩართეთ ხმოვანი შეტყობინება ახალი შეკვეთისთვის</p>
            <button
              onClick={() => { sound.enable(); setShowSoundBanner(false); }}
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            >ჩართვა</button>
            <button
              onClick={() => { sound.disable(); setShowSoundBanner(false); }}
              className="p-1 rounded-full hover:bg-muted/50"
              aria-label="დახურვა"
            ><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/40 pb-safe">
        <div className="grid grid-cols-5">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium relative ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <n.icon className={`w-6 h-6 ${active ? "scale-110" : ""} transition-transform`} />
                {n.label}
                {n.badge ? <span className="absolute top-1 right-6 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">{n.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {notifOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={() => setNotifOpen(false)}>
          <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold mb-3">{t("notificationsTitle")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("realtimeNotifsBody")}
            </p>
            <button onClick={() => setNotifOpen(false)} className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold">{t("close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
