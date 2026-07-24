import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Item = {
  to: "/" | "/search" | "/orders" | "/favorites" | "/profile";
  key: "home" | "search" | "orders" | "favs" | "profile";
  icon: typeof Home;
};

const items: Item[] = [
  { to: "/", key: "home", icon: Home },
  { to: "/search", key: "search", icon: Search },
  { to: "/orders", key: "orders", icon: ShoppingBag },
  { to: "/favorites", key: "favs", icon: Heart },
  { to: "/profile", key: "profile", icon: User },
];

export function BottomNav() {
  const { t, language } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/partner") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/offer/") ||
    pathname.startsWith("/orders/")
  ) {
    return null;
  }

  const label = (k: Item["key"]) => {
    if (k === "home") return t("navHome");
    if (k === "orders") return t("navOrders");
    if (k === "favs") return t("navFavorites");
    if (k === "profile") return t("navProfile");
    return language === "en" ? "Search" : language === "ru" ? "Поиск" : "ძებნა";
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      aria-label={language === "en" ? "Primary navigation" : language === "ru" ? "Основная навигация" : "მთავარი ნავიგაცია"}
    >
      <div className="mx-auto max-w-6xl px-2 pb-1.5 sm:px-3 sm:pb-2">
        <ul className="grid grid-cols-5 rounded-3xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated overflow-hidden">
          {items.map(({ to, key, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            const l = label(key);
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-label={l}
                  aria-current={active ? "page" : undefined}
                  className="relative flex flex-col items-center justify-center gap-0.5 py-2 sm:py-2.5 min-h-11 tap-target press focus-visible:outline-none rounded-2xl"
                >
                  <span
                    className={`grid place-items-center h-9 w-9 rounded-2xl transition-all duration-200 ${
                      active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.6 : 2} />
                  </span>
                  <span
                    className={`text-[10px] font-semibold tracking-tight ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {l}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
