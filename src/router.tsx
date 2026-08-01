import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // No defaultStaleTime was set, so it fell back to the router's own
    // default of 0 — every navigation (including navigating BACK to a route
    // you just left seconds ago, e.g. switching tabs and returning) re-runs
    // that route's beforeLoad/loader from scratch, which shows as a visible
    // "refresh" (loading states, auth re-checks) even though nothing
    // actually changed. Routes' own live data (offers, orders, etc.) already
    // stay fresh independently via Supabase realtime subscriptions in each
    // hook, so this only governs how eagerly the router re-runs loaders.
    defaultStaleTime: 30_000,
  });

  return router;
};
