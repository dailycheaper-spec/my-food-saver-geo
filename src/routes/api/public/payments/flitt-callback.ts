import { createFileRoute } from "@tanstack/react-router";

// Flitt posts a signed JSON callback here after payment.
// Defense in depth: verify the callback signature AND independently re-query
// Flitt's status API before touching the order. Idempotent — only pending
// orders are ever updated.
export const Route = createFileRoute("/api/public/payments/flitt-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const { flittCredentials, verifyFlittSignature, FLITT_PAID_STATUS } = await import(
          "@/lib/payments/flitt.server"
        );
        const { verifyFlittPayment } = await import("@/lib/payments/flitt-verify.server");

        let paymentKey: string;
        try {
          ({ paymentKey } = flittCredentials());
        } catch (e) {
          console.error("[Flitt callback] credentials missing:", e);
          return new Response("Not configured", { status: 500 });
        }

        if (!verifyFlittSignature(paymentKey, payload)) {
          console.error("[Flitt callback] SIGNATURE MISMATCH — possible spoofed callback", {
            order_id: payload.order_id,
          });
          return new Response("Invalid signature", { status: 400 });
        }

        const orderId = typeof payload.order_id === "string" ? payload.order_id : null;
        if (!orderId) return new Response("Missing order_id", { status: 400 });

        // Source of truth — never trust the callback body, even when signed.
        let verified;
        try {
          verified = await verifyFlittPayment(orderId);
        } catch (e) {
          console.error("[Flitt callback] verification failed:", e);
          return new Response("Verification failed", { status: 500 }); // 500 → Flitt retries
        }
        if (!verified.signatureValid) {
          console.error("[Flitt callback] status response signature invalid for", orderId);
          return new Response("Invalid status signature", { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", orderId)
          .maybeSingle();

        if (!existing) {
          console.warn("[Flitt callback] unknown order", orderId);
          return new Response("ok"); // ack so Flitt stops retrying
        }
        if (existing.status !== "pending") return new Response("ok"); // idempotent no-op

        const newStatus: "paid" | "cancelled" =
          (verified.orderStatus ?? "").toLowerCase() === FLITT_PAID_STATUS ? "paid" : "cancelled";

        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({ status: newStatus })
          .eq("id", orderId)
          .eq("status", "pending");
        if (updateErr) {
          console.error("[Flitt callback] update failed:", updateErr);
          return new Response("Update failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
