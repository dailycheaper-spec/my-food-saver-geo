import { createFileRoute } from "@tanstack/react-router";
import { getProvider } from "@/lib/delivery/registry";

export const Route = createFileRoute("/api/public/delivery/glovo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.GLOVO_WEBHOOK_SECRET;
        const body = await request.text();
        if (!secret) return new Response("Provider not configured", { status: 501 });

        const { createHmac, timingSafeEqual } = await import("crypto");
        const signature = request.headers.get("x-glovo-signature") ?? "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const a = Buffer.from(signature), b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b))
          return new Response("Invalid signature", { status: 401 });

        const provider = getProvider("glovo");
        const parsed = await provider.parseWebhook?.(JSON.parse(body), {});
        if (!parsed) return new Response("Ignored", { status: 200 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("deliveries")
          .update({ status: parsed.update.status } as never)
          .eq("provider", "glovo")
          .eq("provider_delivery_id", parsed.providerDeliveryId);
        return new Response("ok");
      },
    },
  },
});
