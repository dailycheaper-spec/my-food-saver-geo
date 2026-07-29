import { useCallback, useEffect, useState } from "react";

/**
 * The one confirmed delivery address for the current checkout.
 * Temporary picker state (map centre, search results) never lands here —
 * only an address the customer explicitly confirmed.
 */
export interface ConfirmedDeliveryAddress {
  id?: string;
  addressLine: string;
  details: string;
  courierNote: string;
  lat: number;
  lng: number;
  placeId?: string | null;
}

const KEY = "cheaper:delivery-address";
const EVENT = "cheaper:delivery-address-changed";

function isValid(a: unknown): a is ConfirmedDeliveryAddress {
  if (!a || typeof a !== "object") return false;
  const v = a as ConfirmedDeliveryAddress;
  return (
    typeof v.addressLine === "string" &&
    v.addressLine.trim().length >= 3 &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lng)
  );
}

export function readDeliveryAddress(): ConfirmedDeliveryAddress | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDeliveryAddress(a: ConfirmedDeliveryAddress | null) {
  try {
    if (a) localStorage.setItem(KEY, JSON.stringify(a));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Flattened one-line form used for the orders.delivery_address column. */
export function formatDeliveryAddress(a: ConfirmedDeliveryAddress | null): string {
  if (!a) return "";
  return [a.addressLine, a.details, a.courierNote].filter(Boolean).join(" · ");
}

/**
 * Persistent, SSR-safe accessor. Reads after hydration so the server render
 * and the first client render agree.
 */
export function useDeliveryAddress() {
  const [address, setAddressState] = useState<ConfirmedDeliveryAddress | null>(null);

  useEffect(() => {
    setAddressState(readDeliveryAddress());
    const sync = () => setAddressState(readDeliveryAddress());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setAddress = useCallback((a: ConfirmedDeliveryAddress | null) => {
    writeDeliveryAddress(a);
    setAddressState(a);
  }, []);

  return { address, setAddress };
}
