import { Link, useNavigate } from "@tanstack/react-router";
import { User as UserIcon, LogOut, Heart, ShoppingBag, UserCircle2 } from "lucide-react";
import { useAuth, signOut } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (!user) return null;

  const initial =
    (profile?.first_name?.[0] || user.email?.[0] || "U").toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("profile")}
          className="tap-target h-10 w-10 rounded-full bg-card border border-border grid place-items-center press focus-visible:outline-none overflow-hidden"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold">{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="truncate">
          {profile?.first_name || user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <UserCircle2 className="w-4 h-4 mr-2" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/orders" className="cursor-pointer">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {t("orderHistory")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/favorites" className="cursor-pointer">
            <Heart className="w-4 h-4 mr-2" />
            {t("favorites")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void handleSignOut();
          }}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
