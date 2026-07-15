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
  let lastError: unknown = null;
  for (let i = 0; i < 10; i += 1) {
    const result = await supabase.auth.getUser();
    if (result.data.user || result.error) return result;
    lastError = result.error;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  const result = await supabase.auth.getUser();
  if (result.error) return result;
  return lastError instanceof Error ? { ...result, error: lastError } : result;
}
