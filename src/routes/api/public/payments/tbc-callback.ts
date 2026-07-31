import { createFileRoute } from "@tanstack/react-router";
import { TBC_SUCCESS_STATUSES, verifyTbcPayment } from "@/lib/payments/tbc.functions";

// TBC posts a callback here after payment. We DO NOT trust the payload:
// we take the payment id from it, then call back to TBC's API to fetch the
// authoritative status before updating our database.
//
// Idempotent — only orders still `pending` are ever touched, so re-delivered
// or forged webhooks cannot change a finalized order.
export const Route = createFileRoute("/api/public/payments/tbc-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // TBC may post JSON or form-encoded data depending on configuration.
        let payload: Record<string, unknown> = {};
        const raw = await request.text();
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          payload = Object.fromEntries(new URLSearchParams(raw));
        }

        const pick = (...keys: string[]) => {
          for (const k of keys) {
            const v = payload[k];
            if (typeof v === "string" && v) return v;
          }
          return undefined;
        };

        const payId = pick("payId", "PayId", "payid", "paymentId");
        if (!payId) {
          console.error("[TBC callback] missing payId in payload");
          return new Response("Missing payId", { status: 400 });
        }

        // Independent server-to-server verification — the source of truth.
        let verified;
        try {
          verified = await verifyTbcPayment(payId);
        } catch (e) {
          console.error("[TBC callback] verification failed:", e);
          return new Response("Verification failed", { status: 500 }); // 500 → TBC retries
        }

        const ourOrderId =
          verified.merchantPaymentId ?? pick("merchantPaymentId", "MerchantPaymentId");
        if (!ourOrderId) {
          console.error("[TBC callback] no merchantPaymentId in verified response");
          return new Response("Missing merchantPaymentId", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", ourOrderId)
          .maybeSingle();

        if (!existing) {
          console.warn("[TBC callback] unknown order", ourOrderId);
          return new Response("ok"); // ack so TBC stops retrying
        }
        if (existing.status !== "pending") {
          return new Response("ok"); // already finalized — idempotent no-op
        }

        const status = (verified.status ?? "").toLowerCase();
        const newStatus: "paid" | "cancelled" = TBC_SUCCESS_STATUSES.includes(status)
          ? "paid"
          : "cancelled";

        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({ status: newStatus })
          .eq("id", ourOrderId)
          .eq("status", "pending"); // guard against races
        if (updateErr) {
          console.error("[TBC callback] update failed:", updateErr);
          return new Response("Update failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
