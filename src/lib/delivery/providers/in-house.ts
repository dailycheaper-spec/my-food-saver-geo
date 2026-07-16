import type { DeliveryProvider } from "../types";

// Store's own courier. Status is driven manually by the partner from their dashboard.
export const inHouseProvider: DeliveryProvider = {
  id: "in_house",
  label: "In-house courier",
  configured: true,
  async createDelivery({ pickup, dropoff }) {
    // Compute a basic fee later; for now the caller passes the computed fee in.
    // No external ID needed — status is updated manually.
    return {
      providerDeliveryId: null,
      fee: 0,
      courierName: undefined,
      payload: { pickup, dropoff, source: "in_house" },
    };
  },
  async getStatus() {
    // In-house status is authoritative in DB, not an external system.
    return { status: "pending" };
  },
  async cancelDelivery() {
    // No-op — DB update handles it.
  },
};
