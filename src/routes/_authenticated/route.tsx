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
    return { data: { user: null }, error };
  }
  return { data: { user: data.session.user }, error: null };
}

function AuthGateLoading() {
  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-3">🥗</div>
        <p className="font-display text-lg font-bold">იტვირთება…</p>
      </div>
    </div>
  );
}
