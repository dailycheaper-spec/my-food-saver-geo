import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
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
  let lastResult = await supabase.auth.getUser();

  for (let i = 0; i < 15; i += 1) {
    if (lastResult.data.user) return lastResult;

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.data.session?.user) {
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

function isMissingSessionError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  return String(error.message).toLowerCase().includes("session");
}
