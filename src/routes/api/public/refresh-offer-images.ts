import { createFileRoute } from "@tanstack/react-router";
import { OFFER_IMAGE_SIGN_TTL_SECONDS, OFFER_IMAGE_REFRESH_LEAD_SECONDS } from "@/lib/offer-image";

// Refreshes cached signed URLs for offers whose image_signed_url_expires_at
// is null OR within OFFER_IMAGE_REFRESH_LEAD_SECONDS of expiring.
// Trigger daily via pg_cron. Idempotent.
export const Route = createFileRoute("/api/public/refresh-offer-images")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-refresh-token");
        const expected = process.env.MIGRATE_OFFER_IMAGES_TOKEN;
        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const threshold = new Date(Date.now() + OFFER_IMAGE_REFRESH_LEAD_SECONDS * 1000).toISOString();

        const { data: rows, error } = await supabaseAdmin
          .from("offers")
          .select("id, image_path, image_signed_url_expires_at")
          .not("image_path", "is", null)
          .or(`image_signed_url_expires_at.is.null,image_signed_url_expires_at.lt.${threshold}`);
        if (error) return new Response(error.message, { status: 500 });

        let refreshed = 0;
        const failed: { id: string; error: string }[] = [];
        for (const r of rows ?? []) {
          const path = r.image_path as string;
          const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from("offer-images")
            .createSignedUrl(path, OFFER_IMAGE_SIGN_TTL_SECONDS);
          if (signErr || !signed) {
            failed.push({ id: r.id, error: signErr?.message ?? "no data" });
            continue;
          }
          const expiresAt = new Date(Date.now() + OFFER_IMAGE_SIGN_TTL_SECONDS * 1000).toISOString();
          const { error: upErr } = await supabaseAdmin
            .from("offers")
            .update({ image_url: signed.signedUrl, image_signed_url_expires_at: expiresAt })
            .eq("id", r.id);
          if (upErr) {
            failed.push({ id: r.id, error: upErr.message });
            continue;
          }
          refreshed++;
        }

        return new Response(
          JSON.stringify({ scanned: rows?.length ?? 0, refreshed, failed }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
