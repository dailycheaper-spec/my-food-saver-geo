import type { DeliveryProvider } from "../types";

// STUB. Fill in once Glovo Courier contract is signed.
// Required secrets: GLOVO_API_KEY, GLOVO_WEBHOOK_SECRET
export const glovoProvider: DeliveryProvider = {
  id: "glovo",
  label: "Glovo Courier",
  configured: Boolean(process.env.GLOVO_API_KEY),
  async createDelivery() {
    if (!process.env.GLOVO_API_KEY) throw new Error("Glovo Courier is not configured yet");
    throw new Error("Glovo adapter not implemented");
  },
  async getStatus() { throw new Error("Glovo adapter not implemented"); },
  async cancelDelivery() { throw new Error("Glovo adapter not implemented"); },
  async parseWebhook(payload) {
    const p = payload as { orderId?: string };
    if (!p?.orderId) return null;
    return { providerDeliveryId: p.orderId, update: { status: "pending" } };
  },
};
