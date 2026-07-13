// LocalStorage-backed state for favorites, orders, notifications. Client-only.
import { useEffect, useState, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

// Cache stable references so useSyncExternalStore doesn't loop.
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { return fallback; }
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T;
  try { value = raw ? (JSON.parse(raw) as T) : fallback; } catch { value = fallback; }
  snapshotCache.set(key, { raw, value });
  return value;
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  localStorage.setItem(key, raw);
  snapshotCache.set(key, { raw, value });
  emit();
}


export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

// FAVORITES
const FAV_KEY = "gemo:favorites";
export function useFavorites() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => read<string[]>(FAV_KEY, []), () => [] as string[]);
  return hydrated ? value : [];
}
export function toggleFavorite(storeId: string) {
  const current = read<string[]>(FAV_KEY, []);
  const next = current.includes(storeId) ? current.filter((x) => x !== storeId) : [...current, storeId];
  write(FAV_KEY, next);
}
export function isFavorite(storeId: string) {
  return read<string[]>(FAV_KEY, []).includes(storeId);
}

// ORDERS
export type OrderStatus = "დაჯავშნილი" | "მიღებული" | "გაუქმებული" | "გაჩუქებული";
export interface Order {
  id: string;
  offerId: string;
  storeName: string;
  storeLogo: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  method: "აღება" | "მიტანა";
  address?: string;
  pickupFrom: string;
  pickupTo: string;
  createdAt: number;
  status: OrderStatus;
  code: string;
  giftedTo?: string;
}
const ORDERS_KEY = "gemo:orders";
export function useOrders() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => read<Order[]>(ORDERS_KEY, []), () => [] as Order[]);
  return hydrated ? value : [];
}
export function createOrder(order: Omit<Order, "id" | "createdAt" | "status" | "code">) {
  const full: Order = {
    ...order,
    id: `ord_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    status: "დაჯავშნილი",
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
  };
  const current = read<Order[]>(ORDERS_KEY, []);
  write(ORDERS_KEY, [full, ...current]);
  return full;
}
export function updateOrder(id: string, patch: Partial<Order>) {
  const current = read<Order[]>(ORDERS_KEY, []);
  write(ORDERS_KEY, current.map((o) => (o.id === id ? { ...o, ...patch } : o)));
}
export function findOrder(id: string) {
  return read<Order[]>(ORDERS_KEY, []).find((o) => o.id === id);
}

// NOTIFICATION SETTINGS
export interface NotifSettings {
  enabled: boolean;
  radiusKm: number;
  categories: string[];
}
const NOTIF_KEY = "gemo:notifs";
const DEFAULT_NOTIF: NotifSettings = { enabled: false, radiusKm: 1.5, categories: [] };
export function useNotifSettings() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(
    subscribe,
    () => read<NotifSettings>(NOTIF_KEY, DEFAULT_NOTIF),
    () => DEFAULT_NOTIF,
  );
  return hydrated ? value : DEFAULT_NOTIF;
}
export function saveNotifSettings(s: NotifSettings) { write(NOTIF_KEY, s); }
