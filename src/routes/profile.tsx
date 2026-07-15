import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Percent, ShoppingBag, Heart, Settings, HelpCircle, LogOut, Gift, BarChart3, LogIn, Store, Shield, Sparkles } from "lucide-react";
import { useOrders, useFavorites } from "@/lib/storage";
import { useAuth, signOut } from "@/lib/auth";
import { useMyRole } from "@/lib/db";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "პროფილი — Cheaper" }, { name: "description", content: "შენი ანგარიში და გავლენა." }] }),
  component: Profile,
});

function Profile() {
  const { t } = useI18n();
  const orders = useOrders();
  const favs = useFavorites();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isPartner, loading: rolesLoading } = useMyRole();
  const saved = orders.reduce((s, o) => s + (o.status !== "გაუქმებული" ? 1 : 0), 0);
  const savedPct = "50%+";
  const gel = orders.reduce((s, o) => s + (o.status !== "გაუქმებული" ? o.price : 0), 0);

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
        <Stat icon={<ShoppingBag className="w-4 h-4" />} label={t("packages")} value={String(saved)} />
        <Stat icon={<Percent className="w-4 h-4" />} label={t("saved")} value={savedPct} />
        <Stat icon={<Gift className="w-4 h-4" />} label={t("saved")} value={`${gel.toFixed(0)} ${t("currency")}`} />
      </div>

      <div className="mt-4 rounded-2xl bg-warm text-warm-foreground p-5">
        <div className="font-semibold">{t("yourImpact")}</div>
        <p className="text-xs opacity-80 mt-1">
          {t("impactText")}
        </p>
      </div>

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
