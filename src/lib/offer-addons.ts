import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** One add-on as shown to the customer on the offer page. */
export type OfferAddon = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  maxQuantity: number;
  /** null = unlimited */
  remaining: number | null;
};

type Row = {
  saved_product_id: string;
  sort_order: number;
  saved_products: {
    id: string;
    name: string;
    image_url: string | null;
    default_original_price: number;
    addon_discounted_price: number | null;
    addon_max_quantity: number;
    addon_stock_quantity: number | null;
    addon_stock_sold: number;
    is_addon: boolean;
    addon_active: boolean;
  } | null;
};

/**
 * Active "ხელს გააყოლე" add-ons linked to one offer. Read-only; the charged
 * price is always recomputed server-side at checkout.
 */
export function useOfferAddons(offerId: string, enabled = true) {
  const [addons, setAddons] = useState<OfferAddon[]>([]);

  useEffect(() => {
    if (!enabled || !offerId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("offer_addons")
        .select(
          "saved_product_id, sort_order, saved_products!inner(id, name, image_url, default_original_price, addon_discounted_price, addon_max_quantity, addon_stock_quantity, addon_stock_sold, is_addon, addon_active)",
        )
        .eq("offer_id", offerId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled || error || !data) return;
      const mapped = (data as unknown as Row[])
        .map((r) => r.saved_products)
        .filter((p): p is NonNullable<Row["saved_products"]> => !!p && p.is_addon && p.addon_active)
        .map((p) => {
          const discounted =
            p.addon_discounted_price != null ? Number(p.addon_discounted_price) : null;
          const original = Number(p.default_original_price);
          return {
            id: p.id,
            name: p.name,
            imageUrl: p.image_url,
            price: discounted ?? original,
            // Only a real discount gets a struck-through price.
            originalPrice: discounted != null && discounted < original ? original : null,
            maxQuantity: Math.max(1, Number(p.addon_max_quantity) || 1),
            remaining:
              p.addon_stock_quantity == null
                ? null
                : Math.max(0, Number(p.addon_stock_quantity) - Number(p.addon_stock_sold)),
          };
        });
      setAddons(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId, enabled]);

  return addons;
}
