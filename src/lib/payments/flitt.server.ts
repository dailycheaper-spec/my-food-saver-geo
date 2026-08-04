import { createHash } from "crypto";

// ────────────────────────────────────────────────────────────
// Flitt (pay.flitt.com) — SHA1 signature helpers.
// Docs: https://docs.flitt.com/api/building-signature
//
// signature = sha1( secret_key | v1 | v2 | ... ) where values are taken
// from the non-empty params sorted alphabetically by key, excluding
// `signature` and `response_signature_string`.
// ────────────────────────────────────────────────────────────

export const FLITT_API_BASE = "https://pay.flitt.com/api";

const EXCLUDED_KEYS = new Set(["signature", "response_signature_string"]);

export function buildFlittSignature(secretKey: string, params: Record<string, unknown>): string {
  const values = Object.keys(params)
    .filter((k) => !EXCLUDED_KEYS.has(k))
    .filter((k) => {
      const v = params[k];
      return v !== "" && v !== null && v !== undefined;
    })
    .sort()
    .map((k) => String(params[k]));

  return createHash("sha1").update([secretKey, ...values].join("|"), "utf8").digest("hex");
}

export function flittCredentials(): { merchantId: string; paymentKey: string } {
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const paymentKey = process.env.FLITT_PAYMENT_KEY;
  if (!merchantId || !paymentKey) {
    throw new Error("Flitt credentials are not configured on the server.");
  }
  return { merchantId, paymentKey };
}

/** Recomputes the signature over a Flitt payload and compares it constant-ish time. */
export function verifyFlittSignature(secretKey: string, payload: Record<string, unknown>): boolean {
  const provided = typeof payload.signature === "string" ? payload.signature.toLowerCase() : "";
  if (!provided) return false;
  const expected = buildFlittSignature(secretKey, payload);
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** Flitt terminal status meaning the money was actually captured. */
export const FLITT_PAID_STATUS = "approved";
