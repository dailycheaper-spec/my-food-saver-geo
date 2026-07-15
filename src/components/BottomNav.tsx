import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Heart, ShoppingBag, User, Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  { to: "/", label: "მთავარი", icon: Home },
  { to: "/favorites", label: "ფავორიტები", icon: Heart },
  { to: "/orders", label: "შეკვეთები", icon: ShoppingBag },
  { to: "/notifications", label: "შეტყობინებები", icon: Bell },
  { to: "/profile", label: "პროფილი", icon: User },
] as const;

export function BottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/auth") || pathname.startsWith("/partner") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto max-w-2xl grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          const translated = {
            მთავარი: t("navHome"),
            ფავორიტები: t("navFavorites"),
            შეკვეთები: t("navOrders"),
            შეტყობინებები: t("navNotifications"),
            პროფილი: t("navProfile"),
          }[label];
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "fill-primary/10" : ""}`} strokeWidth={active ? 2.4 : 1.8} />
                <span>{translated}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
