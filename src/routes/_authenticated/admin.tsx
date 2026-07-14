import { createFileRoute, Outlet, Link, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Store, ShoppingBag, Users, LogOut, Package,
  Wallet, BarChart3, Settings, Moon, Sun, Menu, X, Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadTheme, saveTheme } from "@/lib/admin-settings";

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

const NAV = [
  { to: "/admin", label: "მთავარი", icon: LayoutDashboard, exact: true },
  { to: "/admin/partners", label: "პარტნიორები", icon: Store },
  { to: "/admin/offers", label: "შემოთავაზებები", icon: Package },
  { to: "/admin/orders", label: "შეკვეთები", icon: ShoppingBag },
  { to: "/admin/payments", label: "გადახდები", icon: Wallet },
  { to: "/admin/users", label: "მომხმარებლები", icon: Users },
  { to: "/admin/stats", label: "სტატისტიკა", icon: BarChart3 },
  { to: "/admin/settings", label: "პარამეტრები", icon: Settings },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = loadTheme();
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  useEffect(() => { setMobileOpen(false); }, [path]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    saveTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-card border-r border-border z-30">
        <div className="px-6 py-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-primary text-primary-foreground grid place-items-center font-display font-bold">გ</div>
            <div>
              <div className="font-display font-bold text-lg leading-none">გემო</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5 flex items-center gap-1"><Shield className="w-3 h-3" /> ადმინი</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:bg-muted"
                }`}>
                <n.icon className="w-4.5 h-4.5" strokeWidth={2} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-foreground/70 hover:bg-muted">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "ღია რეჟიმი" : "მუქი რეჟიმი"}
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4" /> გასვლა
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="font-display font-bold">გემო · ადმინი</div>
          <button onClick={toggleTheme} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold">მენიუ</div>
              <button onClick={() => setMobileOpen(false)} className="w-9 h-9 grid place-items-center rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <nav className="space-y-1">
              {NAV.map((n) => {
                const active = n.exact ? path === n.to : path.startsWith(n.to);
                return (
                  <Link key={n.to} to={n.to}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    <n.icon className="w-4 h-4" /> {n.label}
                  </Link>
                );
              })}
              <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
                className="w-full mt-4 flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4" /> გასვლა
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
