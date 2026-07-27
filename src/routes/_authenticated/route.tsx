import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: AuthGateLoading,
  beforeLoad: async ({ location }) => {
    const { data, error } = await waitForUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

async function waitForUser() {
  const sessionResult = await supabase.auth.getSession();
  if (!sessionResult.data.session?.user) {
    return { data: { user: null }, error: null };
  }

  let lastResult = await supabase.auth.getUser();

  for (let i = 0; i < 15; i += 1) {
    if (lastResult.data.user) return lastResult;

    const refreshedSession = await supabase.auth.getSession();
    if (refreshedSession.data.session?.user) {
      lastResult = await supabase.auth.getUser();
      if (lastResult.data.user || !isMissingSessionError(lastResult.error)) return lastResult;
    } else if (lastResult.error && !isMissingSessionError(lastResult.error)) {
      return lastResult;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    lastResult = await supabase.auth.getUser();
  }

  return lastResult;
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

function isMissingSessionError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  return String(error.message).toLowerCase().includes("session");
}
