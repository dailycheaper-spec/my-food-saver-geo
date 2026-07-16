import type { DeliveryProvider } from "../types";

// Cheaper's own courier fleet — separate mobile app (roadmap).
// Currently: creates a pending delivery that any Cheaper courier can claim from their app.
export const cheaperFleetProvider: DeliveryProvider = {
  id: "cheaper_fleet",
  label: "Cheaper Fleet",
  configured: false, // will flip to true once fleet app is live
  async createDelivery() {
    // Skeleton — real dispatch will insert into a fleet queue table.
    return { providerDeliveryId: null, fee: 0, payload: { source: "cheaper_fleet", queued: true } };
  },
  async getStatus() {
    return { status: "pending" };
  },
  async cancelDelivery() {},
};
