import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Remembered across navigations so returning to an authenticated route
// (e.g. browser Back from an external payment page) resolves synchronously
// instead of awaiting getSession() and painting the full-screen loader.
let cachedUser: { user: unknown; expiresAt: number } | null = null;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Only show the loader if the gate is genuinely slow. The common case
  // (session already in localStorage) resolves in a few ms, and a loader
  // painted at 0ms reads as a full page reload.
  pendingMs: 1500,
  pendingMinMs: 0,
  pendingComponent: AuthGateLoading,
  beforeLoad: ({ location }) => {
    if (cachedUser && cachedUser.expiresAt > Date.now() / 1000 + 30) {
      return { user: cachedUser.user as NonNullable<unknown> };
    }
    return (async () => {
      const { data, error } = await waitForUser();
      if (error || !data.user) {
        cachedUser = null;
        throw redirect({
          to: "/auth",
          search: { redirect: location.href },
        });
      }
      return { user: data.user };
    })();
  },
  component: () => <Outlet />,
});


async function waitForUser() {
  // getSession() reads the persisted session from localStorage (refreshing it
  // first if it's expired) without a round-trip to validate it server-side.
  // That's fine here: this only gates which UI to show. Every actual data
  // request still goes through Supabase RLS, which independently verifies the
  // JWT on the server, so a tampered/forged local session can't read or write
  // anything regardless of what this check decides.
  //
  // The previous version additionally required auth.getUser() (a real network
  // round-trip) to succeed, and retried it up to 15 times / 200ms apart when
  // it didn't — adding up to 3s of blocking delay to every single navigation
  // into an authenticated route, most noticeably right after switching back
  // to the tab (when the token is most likely to need a refresh).
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    cachedUser = null;
    return { data: { user: null }, error };
  }
  cachedUser = {
    user: data.session.user,
    expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 300,
  };
  return { data: { user: data.session.user }, error: null };
}

// Keep the cached gate result honest when the session actually changes.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      cachedUser = null;
      return;
    }
    cachedUser = {
      user: session.user,
      expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 300,
    };
  });
}


function AuthGateLoading() {
  const lang = typeof window !== "undefined" ? window.localStorage.getItem("cheaper-language") : null;
  const text = lang === "en" ? "Loading…" : lang === "ru" ? "Загрузка…" : "იტვირთება…";
  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-3">🥗</div>
        <p className="font-display text-lg font-bold">{text}</p>
      </div>
    </div>
  );
}
