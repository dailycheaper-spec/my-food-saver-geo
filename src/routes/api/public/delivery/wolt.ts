import { createFileRoute } from "@tanstack/react-router";
import { getProvider } from "@/lib/delivery/registry";
import type { DeliveryProviderId } from "@/lib/delivery/types";

async function handleProviderWebhook(
  request: Request,
  providerId: DeliveryProviderId,
  secretEnv: string,
  sigHeader: string,
) {
  const secret = process.env[secretEnv];
  const body = await request.text();

  if (secret) {
    const { createHmac, timingSafeEqual } = await import("crypto");
    const signature = request.headers.get(sigHeader) ?? "";
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    const sig = Buffer.from(signature);
    const exp = Buffer.from(expected);
    if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
      return new Response("Invalid signature", { status: 401 });
    }
  } else {
    // Provider not configured yet — accept but do nothing (so URL is reachable for setup tests).
    return new Response("Provider not configured", { status: 501 });
  }

  const provider = getProvider(providerId);
  if (!provider.parseWebhook) return new Response("Not supported", { status: 400 });

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });
  const parsed = await provider.parseWebhook(JSON.parse(body), headers);
  if (!parsed) return new Response("Ignored", { status: 200 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch: Record<string, unknown> = { status: parsed.update.status };
  if (parsed.update.courierName) patch.courier_name = parsed.update.courierName;
  if (parsed.update.courierPhone) patch.courier_phone = parsed.update.courierPhone;
  if (parsed.update.courierLat != null) patch.courier_lat = parsed.update.courierLat;
  if (parsed.update.courierLng != null) patch.courier_lng = parsed.update.courierLng;
  if (parsed.update.estimatedDeliveryAt) patch.estimated_delivery_at = parsed.update.estimatedDeliveryAt;
  if (parsed.update.pickedUpAt) patch.picked_up_at = parsed.update.pickedUpAt;
  if (parsed.update.deliveredAt) patch.delivered_at = parsed.update.deliveredAt;
  if (parsed.update.payload) patch.provider_payload = parsed.update.payload;

  await supabaseAdmin
    .from("deliveries")
    .update(patch as never)
    .eq("provider", providerId)
    .eq("provider_delivery_id", parsed.providerDeliveryId);

  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/delivery/wolt")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleProviderWebhook(request, "wolt", "WOLT_WEBHOOK_SECRET", "x-wolt-signature"),
    },
  },
});
