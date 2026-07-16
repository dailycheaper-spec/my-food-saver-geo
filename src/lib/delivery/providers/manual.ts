import type { DeliveryProvider } from "../types";

// The store arranges a courier by phone. Cheaper only records the fact.
export const manualProvider: DeliveryProvider = {
  id: "manual",
  label: "Manual (store arranges courier)",
  configured: true,
  async createDelivery() {
    return { providerDeliveryId: null, fee: 0, payload: { source: "manual" } };
  },
  async getStatus() {
    return { status: "pending" };
  },
  async cancelDelivery() {},
};
