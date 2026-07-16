import type { DeliveryProvider } from "../types";

// STUB. Fill in once Wolt Drive contract is signed.
// Required secrets when going live: WOLT_API_KEY, WOLT_MERCHANT_ID, WOLT_WEBHOOK_SECRET
export const woltProvider: DeliveryProvider = {
  id: "wolt",
  label: "Wolt Drive",
  configured: Boolean(process.env.WOLT_API_KEY),
  async createDelivery(_input) {
    if (!process.env.WOLT_API_KEY) throw new Error("Wolt Drive is not configured yet");
    // TODO: POST https://daas-public-api.wolt.com/v2/venues/{merchantId}/deliveries
    // with pickup/dropoff/customer, using Bearer WOLT_API_KEY.
    throw new Error("Wolt adapter not implemented");
  },
  async getStatus(_id) {
    throw new Error("Wolt adapter not implemented");
  },
  async cancelDelivery(_id) {
    throw new Error("Wolt adapter not implemented");
  },
  async parseWebhook(payload) {
    // TODO: verify HMAC in the route handler, then map payload → status.
    const p = payload as { id?: string; status?: string };
    if (!p?.id) return null;
    return { providerDeliveryId: p.id, update: { status: "pending" } };
  },
};
