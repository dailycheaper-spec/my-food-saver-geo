import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, PackageOpen, ShoppingBag, BarChart3, LogOut, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useMyRole, useMyStores, useStoreOrders } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/partner")({
  component: PartnerLayout,
});

function PartnerLayout() {
  const { stores, loading } = useMyStores();
  const store = stores[0] ?? null;
  const { role, loading: roleLoading, isAdmin, isPartner } = useMyRole();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { newCount, resetNewCount } = useStoreOrders(store?.id ?? null);
  const [notifOpen, setNotifOpen] = useState(false);
  const hasPartnerAccess = isAdmin || isPartner || stores.length > 0;

  useEffect(() => {
    if (!roleLoading && !loading && !hasPartnerAccess) {
      navigate({ to: "/partner-apply", replace: true });
    }
  }, [hasPartnerAccess, loading, navigate, roleLoading]);

  // Global realtime notification for new orders on this store
  useEffect(() => {
    if (newCount > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("ახალი შეკვეთა 🛒", { body: "შემოვიდა ახალი შეკვეთა SaveBite-ზე" });
      }
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.08;
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }
  }, [newCount]);

  const nav = [
    { to: "/partner", label: "მთავარი", icon: Home, exact: true },
    { to: "/partner/offers", label: "შეთავაზებები", icon: PackageOpen },
    { to: "/partner/orders", label: "შეკვეთები", icon: ShoppingBag, badge: newCount },
    { to: "/partner/stats", label: "სტატისტიკა", icon: BarChart3 },
  ];

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 grid place-items-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🥗</div>
          <div className="font-display text-xl font-bold">პარტნიორის პანელი იტვირთება…</div>
          <p className="text-sm text-muted-foreground mt-1">ვამოწმებთ თქვენს ანგარიშს.</p>
        </div>
      </div>
    );
  }

  if (!hasPartnerAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 grid place-items-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🏪</div>
          <div className="font-display text-xl font-bold">გადაგიყვანთ განაცხადზე…</div>
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
            <span className="font-display font-bold text-lg">SaveBite</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">
              {role === "admin" ? "ადმინი" : "პარტნიორი"}
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
            <Link to="/partner/profile" className="p-2 rounded-full hover:bg-muted/50 text-xs font-medium hidden sm:block">
              {!loading && store ? `${store.logo ?? "🏪"} ${store.name}` : "პროფილი"}
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
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/40 pb-safe">
        <div className="grid grid-cols-4">
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
            <h3 className="font-display text-lg font-bold mb-3">შეტყობინებები</h3>
            <p className="text-sm text-muted-foreground">
              რეალურ დროში მიიღებ ცნობებს ახალ შეკვეთებზე, გადახდებზე და შეთავაზების ვადის გასვლაზე.
            </p>
            <button onClick={() => setNotifOpen(false)} className="mt-4 w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold">დახურვა</button>
          </div>
        </div>
      )}
    </div>
  );
}
