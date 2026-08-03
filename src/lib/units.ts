import type { Offer } from "@/lib/mock-data";

/**
 * Short suffix shown next to a quantity, e.g. "× 500 გრ" for weight-sold
 * products or "ულუფა" for portions. Empty for plain piece-based offers.
 */
export function unitSuffix(
  offer: Pick<Offer, "unitType" | "unitWeightGrams">,
  t: (key: string) => string,
): string {
  if (offer.unitType === "weight" && offer.unitWeightGrams) {
    return `× ${offer.unitWeightGrams}${t("offer.unitGram")}`;
  }
  if (offer.unitType === "portion") return t("offer.unitPortion");
  return "";
}
