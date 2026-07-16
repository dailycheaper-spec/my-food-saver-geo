import type { DeliveryProvider, DeliveryProviderId } from "./types";
import { inHouseProvider } from "./providers/in-house";
import { manualProvider } from "./providers/manual";
import { cheaperFleetProvider } from "./providers/cheaper-fleet";
import { woltProvider } from "./providers/wolt";
import { boltProvider } from "./providers/bolt";
import { glovoProvider } from "./providers/glovo";

// Registry order = fallback priority (first configured provider wins).
const registry: Record<DeliveryProviderId, DeliveryProvider> = {
  in_house: inHouseProvider,
  cheaper_fleet: cheaperFleetProvider,
  wolt: woltProvider,
  bolt: boltProvider,
  glovo: glovoProvider,
  manual: manualProvider,
  external_generic: manualProvider, // future: user-defined webhook adapter
};

export function getProvider(id: DeliveryProviderId): DeliveryProvider {
  return registry[id] ?? manualProvider;
}

export function listProviders(): DeliveryProvider[] {
  return Object.values(registry);
}

// UI-visible provider list (dedup external_generic)
export const AVAILABLE_PROVIDERS: DeliveryProviderId[] = [
  "in_house",
  "cheaper_fleet",
  "wolt",
  "bolt",
  "glovo",
  "manual",
];

export function providerBadge(id: DeliveryProviderId): { icon: string; label: string } {
  switch (id) {
    case "in_house": return { icon: "🏠", label: "In-house" };
    case "cheaper_fleet": return { icon: "🛵", label: "Cheaper Fleet" };
    case "wolt": return { icon: "🟦", label: "Wolt" };
    case "bolt": return { icon: "⚡", label: "Bolt" };
    case "glovo": return { icon: "🟡", label: "Glovo" };
    case "manual": return { icon: "📞", label: "Manual" };
    default: return { icon: "🚚", label: "Delivery" };
  }
}
