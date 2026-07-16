import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { getProvider } from "@/lib/delivery/registry";

export const Route = createFileRoute("/api/public/delivery/bolt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.BOLT_WEBHOOK_SECRET;
        const body = await request.text();
        if (!secret) return new Response("Provider not configured", { status: 501 });

        const signature = request.headers.get("x-bolt-signature") ?? "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const a = Buffer.from(signature), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b))
          return new Response("Invalid signature", { status: 401 });

        const provider = getProvider("bolt");
        const parsed = await provider.parseWebhook?.(JSON.parse(body), {});
        if (!parsed) return new Response("Ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("deliveries")
          .update({ status: parsed.update.status } as never)
          .eq("provider", "bolt")
          .eq("provider_delivery_id", parsed.providerDeliveryId);
        return new Response("ok");
      },
    },
  },
});
