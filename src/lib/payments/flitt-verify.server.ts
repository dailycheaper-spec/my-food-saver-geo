import { FLITT_API_BASE, buildFlittSignature, flittCredentials, verifyFlittSignature } from "./flitt.server";

// Server-to-server status lookup — the ONLY thing allowed to mark an order paid.
// POST https://pay.flitt.com/api/status/order_id
export async function verifyFlittPayment(orderId: string): Promise<{
  orderId: string | null;
  orderStatus: string | null;
  signatureValid: boolean;
  raw: unknown;
}> {
  const { merchantId, paymentKey } = flittCredentials();
  const params: Record<string, unknown> = {
    order_id: orderId,
    merchant_id: merchantId,
    version: "1.0.1",
  };
  const signature = buildFlittSignature(paymentKey, params);

  const res = await fetch(`${FLITT_API_BASE}/status/order_id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request: { ...params, signature } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Flitt status lookup failed [${res.status}]: ${body}`);
  }
  const json = (await res.json()) as { response?: Record<string, unknown> };
  const response = json.response ?? {};

  return {
    orderId: typeof response.order_id === "string" ? response.order_id : null,
    orderStatus: typeof response.order_status === "string" ? response.order_status : null,
    // Flitt signs its own responses; treat an unsigned/badly-signed response as untrusted.
    signatureValid: verifyFlittSignature(paymentKey, response),
    raw: json,
  };
}
