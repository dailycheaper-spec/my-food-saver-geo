import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Store, ShoppingBag, Users, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw redirect({ to: "/auth" });

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = [
    { to: "/admin", label: "მიმოხილვა", icon: LayoutDashboard, exact: true },
    { to: "/admin/partners", label: "პარტნიორები", icon: Store },
    { to: "/admin/orders", label: "შეკვეთები", icon: ShoppingBag },
    { to: "/admin/users", label: "მომხმარებლები", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-30 bg-foreground text-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display font-bold text-lg">გემო</Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-semibold uppercase">ადმინი</span>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100">
            <LogOut className="w-3.5 h-3.5" /> გასვლა
          </button>
        </div>
        <nav className="mx-auto max-w-6xl px-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 ${
                  active ? "border-background text-background" : "border-transparent text-background/60 hover:text-background"
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
