import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Phone, User as UserIcon, ArrowLeft, Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { isNative, openExternal } from "@/lib/native";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "შესვლა / რეგისტრაცია — Cheaper" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (search: { redirect?: unknown }): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  component: AuthPage,
});

type Mode = "signin" | "signup" | "phone";

function AuthPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const isPartnerFlow = typeof redirect === "string" && redirect.startsWith("/partner-apply");
  const [mode, setMode] = useState<Mode>(isPartnerFlow ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) navigateToRedirect(navigate, redirect);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        waitForUser().then((user) => {
          if (!cancelled && user) navigateToRedirect(navigate, redirect);
        });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  const redirectTarget = getSafeRedirect(redirect);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    sessionStorage.setItem("auth_redirect", redirectTarget);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message, t) });
    await waitForUser();
    navigateToRedirect(navigate, redirect);
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message, t) });
    setMsg({ type: "ok", text: t("signupSuccess") });
  }

  async function handleOAuth(provider: "google" | "apple") {
    setLoading(true);
    setMsg(null);
    sessionStorage.setItem("auth_redirect", redirectTarget);

    // Native (Capacitor): the auth backend only accepts HTTPS URLs from its
    // redirect allow-list. Return through our public bounce page, which then
    // opens the app's registered ge.cheaper.app:// scheme with the tokens/code.
    if (isNative()) {
      try {
        const nativePlatform = (await import("@capacitor/core")).Capacitor.getPlatform();
        const nativeReturnUrl = new URL("/auth/native-return", window.location.origin);
        nativeReturnUrl.searchParams.set("platform", nativePlatform);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: nativeReturnUrl.toString(),
            skipBrowserRedirect: true,
          },
        });
        if (error || !data.url) throw error ?? new Error("Missing OAuth URL");

        // Recover the screen if the user dismisses the system browser (or it
        // closes) without the deep-link handoff having signed us in.
        const { onBrowserFinished, isNativeOAuthCallbackPending } = await import("@/lib/native");
        const off = await onBrowserFinished(() => {
          off();
          window.setTimeout(() => {
            if (isNativeOAuthCallbackPending()) return;
            void supabase.auth.getSession().then(({ data }) => {
              if (data.session || isNativeOAuthCallbackPending()) return;
              setLoading(false);
              setMsg({ type: "err", text: t("auth.native.retry") });
            });
          }, 700);
        });
        await openExternal(data.url);
      } catch {
        setLoading(false);
        setMsg({ type: "err", text: `${t("oauthFailed")} (${provider})` });
      }
      // Loading spinner clears when the deep-link listener finishes sign-in.
      return;
    }

    // Web: go through Supabase directly so Google receives the Supabase
    // callback as redirect_uri (required for our BYOC Google OAuth client).
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (inIframe) {
      // Editor preview runs in an iframe; Google refuses to load in iframes
      // (X-Frame-Options: DENY). Open preview URL in a top-level tab so OAuth
      // full-page redirect works.
      try {
        window.open(window.location.href, "_blank", "noopener,noreferrer");
      } catch {
        // The message below still tells the user how to continue manually.
      }
      setLoading(false);
      setMsg({ type: "ok", text: t("openInNewTab") });
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      setLoading(false);
      setMsg({ type: "err", text: `${t("oauthFailed")} (${provider})` });
      return;
    }
    // Supabase performs a full-page redirect to Google; code below only
    // runs if that didn't happen for some reason.

    const user = await waitForUser();
    setLoading(false);
    if (user) {
      navigateToRedirect(navigate, redirect);
    } else {
      setMsg({ type: "ok", text: t("signInComplete") });
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message, t) });
    setOtpSent(true);
    setMsg({ type: "ok", text: t("smsSent") });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message, t) });
    navigateToRedirect(navigate, redirect);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> {t("back")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex justify-center mb-6"><Logo /></div>

        {isPartnerFlow && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-600 via-primary to-emerald-500 text-white p-4 shadow-card">
            <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{t("becomePartner")}</div>
              <div className="text-xs text-white/85 mt-0.5">{t("partnerApplyText")}</div>
            </div>
          </div>
        )}

        <div className="bg-card rounded-3xl border border-border shadow-elevated p-6">
          <h1 className="font-display text-2xl font-bold text-center">
            {mode === "signup" ? t("signup") : mode === "phone" ? t("signInPhone") : t("signIn")}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {mode === "signup" ? t("signupText") : t("welcomeBack")}
          </p>

          {/* Mode tabs */}
          <div className="mt-5 grid grid-cols-3 gap-1.5 bg-muted/40 p-1 rounded-xl font-semibold">
            <TabBtn active={mode === "signin"} onClick={() => { setMode("signin"); setMsg(null); }}>{t("signIn")}</TabBtn>
            <TabBtn active={mode === "signup"} onClick={() => { setMode("signup"); setMsg(null); }}>{t("signup")}</TabBtn>
            <TabBtn active={mode === "phone"} onClick={() => { setMode("phone"); setMsg(null); }}>{t("phoneTab")}</TabBtn>
          </div>

          {msg && (
            <div className={`mt-4 rounded-xl px-3 py-2 text-xs ${msg.type === "err" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              {msg.text}
            </div>
          )}

          {/* Email/password forms */}
          {mode !== "phone" && (
            <form onSubmit={mode === "signup" ? handleEmailSignUp : handleEmailSignIn} className="mt-5 space-y-3">
              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-2">
                  <Field icon={<UserIcon className="w-4 h-4" />} placeholder={t("firstName")} value={firstName} onChange={setFirstName} required />
                  <Field icon={<UserIcon className="w-4 h-4" />} placeholder={t("lastName")} value={lastName} onChange={setLastName} required />
                </div>
              )}
              <Field icon={<Mail className="w-4 h-4" />} type="email" placeholder={t("email")} value={email} onChange={setEmail} required />
              <Field icon={<Lock className="w-4 h-4" />} type="password" placeholder={t("password")} value={password} onChange={setPassword} required minLength={6} />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signup" ? t("signup") : t("signIn")}
              </button>
            </form>
          )}

          {/* Phone flow */}
          {mode === "phone" && !otpSent && (
            <form onSubmit={handleSendOtp} className="mt-5 space-y-3">
              <Field icon={<Phone className="w-4 h-4" />} type="tel" placeholder="+995 555 12 34 56" value={phone} onChange={setPhone} required />
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("auth.smsOtpButton")}
              </button>
            </form>
          )}
          {mode === "phone" && otpSent && (
            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-3">
              <Field icon={<Lock className="w-4 h-4" />} placeholder={t("auth.otpPlaceholder")} value={otp} onChange={setOtp} required maxLength={6} />
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("auth.verifyOtpButton")}
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-xs text-muted-foreground">
                {t("auth.tryOtherNumber")}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social */}
          <div className="space-y-2">
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-card border-2 border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/30 disabled:opacity-60"
            >
              <GoogleIcon /> {t("continueGoogle")}
            </button>
            <button
              onClick={() => handleOAuth("apple")}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <AppleIcon /> {t("continueApple")}
            </button>
          </div>

          <p className="mt-5 text-[10px] text-center text-muted-foreground">
            {language === "en" ? (
              <>By continuing you agree to Cheaper's <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</>
            ) : language === "ru" ? (
              <>Продолжая, вы соглашаетесь с <Link to="/terms" className="underline">условиями</Link> и <Link to="/privacy" className="underline">политикой конфиденциальности</Link> Cheaper.</>
            ) : (
              <>გაგრძელებით ეთანხმები Cheaperს <Link to="/terms" className="underline">წესებსა</Link> და <Link to="/privacy" className="underline">კონფიდენციალურობის პოლიტიკას</Link>.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function getSafeRedirect(redirect?: string): string {
  const stored = typeof window !== "undefined" ? sessionStorage.getItem("auth_redirect") : null;
  const target = redirect || stored || "/";
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return "/";
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return target.startsWith("/") && !target.startsWith("//") ? target : "/";
  }
}

function navigateToRedirect(navigate: ReturnType<typeof useNavigate>, redirect?: string) {
  const target = getSafeRedirect(redirect);
  if (typeof window !== "undefined") sessionStorage.removeItem("auth_redirect");
  navigate({ to: target, replace: true });
}

async function waitForUser() {
  for (let i = 0; i < 12; i += 1) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const { data } = await supabase.auth.getUser();
      if (data.user) return data.user;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 px-1 rounded-lg text-[11px] sm:text-xs leading-tight text-center break-words transition-colors ${active ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

type FieldProps = { icon: React.ReactNode; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;
function Field({ icon, value, onChange, ...rest }: FieldProps) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-3 py-3 rounded-xl bg-muted/40 border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
      />
    </div>
  );
}

function translateAuthError(msg: string, t: (key: string) => string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return t("auth.err.invalidLogin");
  if (m.includes("already registered") || m.includes("user already")) return t("auth.err.alreadyRegistered");
  if (m.includes("password")) return t("auth.err.password");
  if (m.includes("email")) return t("auth.err.email");
  if (m.includes("otp") || m.includes("token")) return t("auth.err.otp");
  if (m.includes("phone")) return t("auth.err.phone");
  if (m.includes("rate")) return t("auth.err.rate");
  return msg;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.3 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.1-.4-4.6H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-9.9 6.9-17.4z"/><path fill="#FBBC05" d="M10.4 28.8c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.4 0-11.7-3.5-13.6-8.7l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
  );
}
function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
  );
}
