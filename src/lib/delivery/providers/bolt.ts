import type { DeliveryProvider } from "../types";

// STUB. Fill in once Bolt Food / Bolt Business Delivery contract is signed.
// Required secrets: BOLT_API_KEY, BOLT_WEBHOOK_SECRET
export const boltProvider: DeliveryProvider = {
  id: "bolt",
  label: "Bolt Delivery",
  configured: Boolean(process.env.BOLT_API_KEY),
  async createDelivery() {
    if (!process.env.BOLT_API_KEY) throw new Error("Bolt Delivery is not configured yet");
    throw new Error("Bolt adapter not implemented");
  },
  async getStatus() { throw new Error("Bolt adapter not implemented"); },
  async cancelDelivery() { throw new Error("Bolt adapter not implemented"); },
  async parseWebhook(payload) {
    const p = payload as { delivery_id?: string };
    if (!p?.delivery_id) return null;
    return { providerDeliveryId: p.delivery_id, update: { status: "pending" } };
  },
};
