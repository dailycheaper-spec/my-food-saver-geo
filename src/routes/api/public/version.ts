import { createFileRoute } from "@tanstack/react-router";
import { APP_BUILD_ID } from "@/lib/build-id";

/**
 * Tiny public endpoint the running app polls to notice a newer web build.
 * Public on purpose (no data, no auth) — it only returns the build id that
 * was baked in at build time.
 */
export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ buildId: APP_BUILD_ID }), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store, no-cache, must-revalidate",
          },
        }),
    },
  },
});
