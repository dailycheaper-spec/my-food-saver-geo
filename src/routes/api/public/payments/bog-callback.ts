import { createFileRoute } from "@tanstack/react-router";
import { verifyBogPayment } from "@/lib/payments/bog.functions";

// BOG posts a JSON callback here after payment. We DO NOT trust the payload:
// we take the order id from it, then call back to BOG's API to fetch the
// authoritative payment status before updating our database.
//
// A successful "completed" status flips the pending order to "paid".
// Anything else marks it "cancelled". Idempotent — re-delivered webhooks
// are safe.
export const Route = createFileRoute("/api/public/payments/bog-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // BOG's callback shape: { event, zoned_request_time, body: { order_id, external_order_id, ... } }
        const body =
          (payload as { body?: { order_id?: string; external_order_id?: string } })?.body ?? {};
        const bogOrderId = body.order_id;
        if (!bogOrderId) {
          return new Response("Missing order_id", { status: 400 });
        }

        // Independent server-to-server verification — this is the source of truth.
        let verified;
        try {
          verified = await verifyBogPayment(bogOrderId);
        } catch (e) {
          console.error("[BOG callback] verification failed:", e);
          // 500 so BOG retries.
          return new Response("Verification failed", { status: 500 });
        }

        const ourOrderId = verified.externalOrderId ?? body.external_order_id;
        if (!ourOrderId) {
          console.error("[BOG callback] no external_order_id in verified response");
          return new Response("Missing external_order_id", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Only touch orders that are still pending — never override a finalized order.
        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", ourOrderId)
          .maybeSingle();

        if (!existing) {
          console.warn("[BOG callback] unknown order", ourOrderId);
          return new Response("ok"); // ack anyway so BOG stops retrying
        }
        if (existing.status !== "pending") {
          return new Response("ok"); // already finalized — idempotent no-op
        }

        const key = verified.statusKey?.toLowerCase() ?? "";
        const newStatus: "paid" | "cancelled" =
          key === "completed" || key === "success" ? "paid" : "cancelled";

        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({ status: newStatus })
          .eq("id", ourOrderId)
          .eq("status", "pending"); // guard against races
        if (updateErr) {
          console.error("[BOG callback] update failed:", updateErr);
          return new Response("Update failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
