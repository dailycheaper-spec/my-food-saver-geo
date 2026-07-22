import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Heart, Settings, HelpCircle, LogOut, Gift, BarChart3, LogIn, Store, Shield, Sparkles, PiggyBank, Star as StarIcon, X } from "lucide-react";
import { useOrders, useFavorites } from "@/lib/storage";
import { findOffer, formatPrice } from "@/lib/mock-data";
import { useAuth, signOut } from "@/lib/auth";
import { useMyRole } from "@/lib/db";
import { useFollowedStores, unfollowStore, useFollowedStoreIds } from "@/lib/follows";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "პროფილი — Cheaper" }, { name: "description", content: "შენი ანგარიში და გავლენა." }] }),
  component: Profile,
});

function Profile() {
  const { t, language } = useI18n();
  const orders = useOrders();
  const favs = useFavorites();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isPartner, loading: rolesLoading } = useMyRole();
  const { stores: followedStores } = useFollowedStores();
  const { refresh: refreshFollows } = useFollowedStoreIds();
  async function handleUnfollow(storeId: string) {
    await unfollowStore(storeId);
    await refreshFollows();
  }
  const completed = orders.filter((o) => o.status !== "გაუქმებული").length;
  const moneySaved = orders.reduce((s, o) => {
    if (o.status === "გაუქმებული") return s;
    const off = findOffer(o.offerId);
    const diff = off ? Math.max(0, off.originalPrice - o.price) : 0;
    return s + diff * (o.quantity || 1);
  }, 0);

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name ?? ""}`.trim()
    : user?.email?.split("@")[0] ?? t("guest");
  const initial = (profile?.first_name?.[0] ?? user?.email?.[0] ?? t("guest")[0]).toUpperCase();
  const emailOrPhone = user?.email ?? user?.phone ?? "";

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6">
      <div className="mb-3 flex justify-end"><LanguageSwitcher /></div>
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full gradient-hero grid place-items-center text-primary-foreground text-2xl font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="flex-1">
            <div className="font-display text-xl font-bold">{displayName}</div>
            <div className="text-xs text-muted-foreground">{emailOrPhone || t("notSignedIn")}</div>
            {user && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-success/10 text-success rounded-full px-2 py-0.5 font-semibold">
                <Sparkles className="w-3 h-3" /> {t("smartSaver")}
              </div>
            )}
          </div>
        </div>

        {!user && !loading && (
          <Link to="/auth" className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> {t("signInRegister")}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat icon={<PiggyBank className="w-4 h-4" />} label={t("moneySaved")} value={formatPrice(moneySaved)} />
        <Stat icon={<ShoppingBag className="w-4 h-4" />} label={t("ordersCompleted")} value={String(completed)} />
        <Stat icon={<Heart className="w-4 h-4" />} label={t("favoriteStoresLbl")} value={String(favs.length)} />
      </div>

      <div className="mt-4 rounded-2xl bg-warm text-warm-foreground p-5">
        <div className="font-semibold">{t("yourImpact")}</div>
        <p className="text-xs opacity-80 mt-1">
          {t("impactText")}
        </p>
      </div>

      {user && followedStores.length > 0 && (
        <div className="mt-4 bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <StarIcon className="w-4 h-4 fill-amber-500 text-amber-500" />
            <div className="text-sm font-semibold flex-1">
              {language === "en" ? "My Following" : language === "ru" ? "Мои подписки" : "ჩემი გამოწერები"}
            </div>
            <div className="text-xs text-muted-foreground">{followedStores.length}</div>
          </div>
          <ul className="divide-y divide-border">
            {followedStores.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <Link to="/store/$id" params={{ id: s.id }} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-secondary grid place-items-center text-xl shrink-0">{s.logo ?? "🏪"}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    {s.district && <div className="text-xs text-muted-foreground truncate">{s.district}</div>}
                  </div>
                </Link>
                <button
                  onClick={() => handleUnfollow(s.id)}
                  aria-label="Unfollow"
                  className="w-8 h-8 rounded-full grid place-items-center text-muted-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 bg-card rounded-2xl border border-border shadow-card divide-y divide-border overflow-hidden">
        <Link to="/analytics" className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors">
          <span className="text-muted-foreground"><BarChart3 className="w-4 h-4" /></span>
          <span className="flex-1">{t("analyticsStats")}</span>
          <span className="text-muted-foreground">›</span>
        </Link>
        {user && rolesLoading && (
          <div className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium text-muted-foreground">
            <span className="flex-1">{t("permissionsLoading")}</span>
          </div>
        )}
        {user && !rolesLoading && (isPartner || isAdmin) && (
          <Link to="/partner" className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors">
            <span className="text-primary"><Store className="w-4 h-4" /></span>
            <span className="flex-1">{t("partnerPanel")}</span>
            <span className="text-muted-foreground">›</span>
          </Link>
        )}
        {user && !rolesLoading && !isPartner && !isAdmin && (
          <Link to="/partner-apply" className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors">
            <span className="text-primary"><Store className="w-4 h-4" /></span>
            <span className="flex-1">{t("becomePartnerShort")}</span>
            <span className="text-muted-foreground">›</span>
          </Link>
        )}
        {user && !rolesLoading && isAdmin && (
          <Link to="/admin" className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors">
            <span className="text-destructive"><Shield className="w-4 h-4" /></span>
            <span className="flex-1">{t("adminPanel")}</span>
            <span className="text-muted-foreground">›</span>
          </Link>
        )}
        <Row icon={<Heart className="w-4 h-4" />} label={`${t("favorites")} (${favs.length})`} />
        <Row icon={<ShoppingBag className="w-4 h-4" />} label={`${t("orderHistory")} (${orders.length})`} />
        <Row icon={<Settings className="w-4 h-4" />} label={t("settings")} />
        <Row icon={<HelpCircle className="w-4 h-4" />} label={t("help")} />
        {user && (
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium text-destructive hover:bg-muted/30 transition-colors">
            <span className="text-destructive"><LogOut className="w-4 h-4" /></span>
            <span className="flex-1">{t("signOut")}</span>
            <span className="text-muted-foreground">›</span>
          </button>
        )}
      </div>

      <p className="mt-6 mb-4 text-center text-[11px] text-muted-foreground">
        {t("madeInGeorgia")}
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl p-3 border border-border shadow-soft text-center">
      <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 grid place-items-center text-primary">{icon}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center gap-3 p-4 text-left text-sm font-medium hover:bg-muted/30 transition-colors">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-muted-foreground">›</span>
    </button>
  );
}
