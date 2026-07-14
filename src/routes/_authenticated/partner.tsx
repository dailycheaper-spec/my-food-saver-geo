import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PackageOpen, ShoppingBag, ScanLine, Store, LogOut } from "lucide-react";
import { useMyRole, useMyStores } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/partner")({
  beforeLoad: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw redirect({ to: "/auth" });

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const roles = (data ?? []).map((r) => r.role);
    if (!roles.includes("partner") && !roles.includes("admin")) {
      throw redirect({ to: "/partner-apply" });
    }
  },
  component: PartnerLayout,
});

function PartnerLayout() {
  const { stores, loading } = useMyStores();
  const { role } = useMyRole();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/partner", label: "დაფა", icon: LayoutDashboard, exact: true },
    { to: "/partner/offers", label: "შეთავაზებები", icon: PackageOpen },
    { to: "/partner/orders", label: "შეკვეთები", icon: ShoppingBag },
    { to: "/partner/scan", label: "QR სკანერი", icon: ScanLine },
    { to: "/partner/store", label: "მაღაზია", icon: Store },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display font-bold text-lg text-primary">გემო</Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {role === "admin" ? "ადმინი" : "პარტნიორი"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!loading && stores[0] && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                {stores[0].logo} {stores[0].name}
              </span>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-3.5 h-3.5" /> გასვლა
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 ${
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <n.icon className="w-4 h-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
