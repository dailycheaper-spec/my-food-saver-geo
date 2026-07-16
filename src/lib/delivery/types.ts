// Delivery Provider Adapter Interface
// One shape for every courier: in-house, Cheaper fleet, Wolt, Bolt, Glovo, manual, custom.
// Adding a new provider = 1 new file in ./providers/ + register it in ./registry.ts

export type DeliveryProviderId =
  | "in_house"
  | "cheaper_fleet"
  | "wolt"
  | "bolt"
  | "glovo"
  | "manual"
  | "external_generic";

export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "failed"
  | "cancelled";

export interface DeliveryCreateInput {
  orderId: string;
  storeId: string;
  pickup: { address: string; lat?: number; lng?: number };
  dropoff: { address: string; lat?: number; lng?: number };
  customer: { name?: string; phone?: string };
  amount: number;   // order total (for insured value / COD if needed)
  notes?: string;
}

export interface DeliveryCreateResult {
  providerDeliveryId: string | null;   // external tracking ID (null for in_house / manual)
  fee: number;                          // delivery fee in GEL
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
  courierName?: string;
  courierPhone?: string;
  payload?: unknown;                    // raw provider response, stored as jsonb
}

export interface DeliveryStatusUpdate {
  status: DeliveryStatus;
  courierName?: string;
  courierPhone?: string;
  courierLat?: number;
  courierLng?: number;
  estimatedDeliveryAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  payload?: unknown;
}

export interface DeliveryProvider {
  id: DeliveryProviderId;
  label: string;                        // human-readable
  configured: boolean;                  // does env / secrets allow real use?
  createDelivery(input: DeliveryCreateInput): Promise<DeliveryCreateResult>;
  getStatus(providerDeliveryId: string): Promise<DeliveryStatusUpdate>;
  cancelDelivery(providerDeliveryId: string): Promise<void>;
  /** Called by webhook route after signature check. Returns the internal deliveries.id to update. */
  parseWebhook?(payload: unknown, headers: Record<string, string>): Promise<{
    providerDeliveryId: string;
    update: DeliveryStatusUpdate;
  } | null>;
}
