import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Phone, User as UserIcon, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "შესვლა / რეგისტრაცია — გემო" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "phone";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigateToRedirect(navigate, redirect);
    });
  }, [navigate, redirect]);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message) });
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
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message) });
    setMsg({ type: "ok", text: "წარმატებით დარეგისტრირდი! გადაამოწმე ელფოსტა." });
  }

  async function handleOAuth(provider: "google" | "apple") {
    setLoading(true);
    setMsg(null);
    if (redirect) sessionStorage.setItem("auth_redirect", redirect);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      setMsg({ type: "err", text: `შესვლა ${provider}-ით ვერ მოხერხდა` });
      return;
    }
    if (result.redirected) return;
    navigateToRedirect(navigate, redirect);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message) });
    setOtpSent(true);
    setMsg({ type: "ok", text: "კოდი გამოგზავნილია SMS-ით" });
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return setMsg({ type: "err", text: translateAuthError(error.message) });
    navigateToRedirect(navigate, redirect);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> უკან
        </Link>

        <div className="flex justify-center mb-6"><Logo /></div>

        <div className="bg-card rounded-3xl border border-border shadow-elevated p-6">
          <h1 className="font-display text-2xl font-bold text-center">
            {mode === "signup" ? "რეგისტრაცია" : mode === "phone" ? "შესვლა ტელეფონით" : "შესვლა"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {mode === "signup" ? "შექმენი ანგარიში და დაიწყე დაზოგვა" : "მოგესალმებით უკან!"}
          </p>

          {/* Mode tabs */}
          <div className="mt-5 grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-xl text-xs font-semibold">
            <TabBtn active={mode === "signin"} onClick={() => { setMode("signin"); setMsg(null); }}>შესვლა</TabBtn>
            <TabBtn active={mode === "signup"} onClick={() => { setMode("signup"); setMsg(null); }}>რეგისტრაცია</TabBtn>
            <TabBtn active={mode === "phone"} onClick={() => { setMode("phone"); setMsg(null); }}>ტელეფონი</TabBtn>
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
                  <Field icon={<UserIcon className="w-4 h-4" />} placeholder="სახელი" value={firstName} onChange={setFirstName} required />
                  <Field icon={<UserIcon className="w-4 h-4" />} placeholder="გვარი" value={lastName} onChange={setLastName} required />
                </div>
              )}
              <Field icon={<Mail className="w-4 h-4" />} type="email" placeholder="ელფოსტა" value={email} onChange={setEmail} required />
              <Field icon={<Lock className="w-4 h-4" />} type="password" placeholder="პაროლი (მინ. 6 სიმბოლო)" value={password} onChange={setPassword} required minLength={6} />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signup" ? "რეგისტრაცია" : "შესვლა"}
              </button>
            </form>
          )}

          {/* Phone flow */}
          {mode === "phone" && !otpSent && (
            <form onSubmit={handleSendOtp} className="mt-5 space-y-3">
              <Field icon={<Phone className="w-4 h-4" />} type="tel" placeholder="+995 555 12 34 56" value={phone} onChange={setPhone} required />
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                კოდის მიღება SMS-ით
              </button>
            </form>
          )}
          {mode === "phone" && otpSent && (
            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-3">
              <Field icon={<Lock className="w-4 h-4" />} placeholder="6-ნიშნა კოდი" value={otp} onChange={setOtp} required maxLength={6} />
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-soft disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                კოდის დადასტურება
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-xs text-muted-foreground">
                სხვა ნომრით ცდა
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ან</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social */}
          <div className="space-y-2">
            <button
              onClick={() => handleOAuth("google")}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-card border-2 border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/30 disabled:opacity-60"
            >
              <GoogleIcon /> გაგრძელება Google-ით
            </button>
            <button
              onClick={() => handleOAuth("apple")}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <AppleIcon /> გაგრძელება Apple-ით
            </button>
          </div>

          <p className="mt-5 text-[10px] text-center text-muted-foreground">
            გაგრძელებით ეთანხმები გემოს წესებსა და კონფიდენციალურობის პოლიტიკას.
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
  navigate({ to: target });
}

function TabBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`py-2 rounded-lg transition-colors ${active ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>
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

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "არასწორი ელფოსტა ან პაროლი";
  if (m.includes("already registered") || m.includes("user already")) return "ეს ელფოსტა უკვე დარეგისტრირებულია";
  if (m.includes("password")) return "პაროლი უნდა იყოს მინ. 6 სიმბოლო";
  if (m.includes("email")) return "ელფოსტის ფორმატი არასწორია";
  if (m.includes("otp") || m.includes("token")) return "კოდი არასწორია ან ვადაგასულია";
  if (m.includes("phone")) return "ტელეფონის ფორმატი არასწორია (მაგ. +995...)";
  if (m.includes("rate")) return "ძალიან ბევრი მცდელობა. სცადე მოგვიანებით.";
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
