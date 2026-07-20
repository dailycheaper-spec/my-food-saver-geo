// LocalStorage-backed state for favorites, orders, notifications. Client-only.
import { useEffect, useState, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

const EMPTY_STRING_LIST: string[] = [];

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
  const value = useSyncExternalStore(subscribe, () => read<string[]>(FAV_KEY, EMPTY_STRING_LIST), () => EMPTY_STRING_LIST);
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
const EMPTY_ORDERS: Order[] = [];
export function useOrders() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => read<Order[]>(ORDERS_KEY, EMPTY_ORDERS), () => EMPTY_ORDERS);
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
const DEFAULT_NOTIF: NotifSettings = { enabled: true, radiusKm: 3, categories: [] };
export function useNotifSettings() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(
    subscribe,
    () => read<NotifSettings>(NOTIF_KEY, DEFAULT_NOTIF),
    () => DEFAULT_NOTIF,
  );
  return hydrated ? { ...DEFAULT_NOTIF, ...value, radiusKm: Number(value.radiusKm ?? DEFAULT_NOTIF.radiusKm) || DEFAULT_NOTIF.radiusKm } : DEFAULT_NOTIF;
}
export function saveNotifSettings(s: NotifSettings) { write(NOTIF_KEY, s); }

// REVIEWS
export interface Review {
  id: string;
  offerId: string;
  storeId: string;
  author: string;
  rating: number;         // 1-5 overall taste/quality
  text: string;
  worthIt: boolean;       // ღირდა თუ არა
  wouldBuyAgain: boolean; // ისევ იყიდიდა თუ არა
  createdAt: number;
}
const REVIEWS_KEY = "gemo:reviews";
const EMPTY_REVIEWS: Review[] = [];
const SEED_REVIEWS: Review[] = [
  { id: "r-seed-1", offerId: "o1", storeId: "s1", author: "თამარ ლ.", rating: 5, text: "სუპერ იყო! ხაჭაპური ცხელი და გემრიელი. ღირს ყოველი თეთრი.", worthIt: true, wouldBuyAgain: true, createdAt: Date.now() - 86400000 * 2 },
  { id: "r-seed-2", offerId: "o1", storeId: "s1", author: "გიორგი ბ.", rating: 4, text: "კარგი პაკეტი, ცოტა ნაკლები რაოდენობა ეგონა.", worthIt: true, wouldBuyAgain: true, createdAt: Date.now() - 86400000 * 5 },
  { id: "r-seed-3", offerId: "o3", storeId: "s6", author: "მარიამ ქ.", rating: 5, text: "სუშის ნაკრები საოცარი! თითქოს ახალი გაკეთდა.", worthIt: true, wouldBuyAgain: true, createdAt: Date.now() - 86400000 * 1 },
  { id: "r-seed-4", offerId: "o4", storeId: "s8", author: "ლუკა ჯ.", rating: 4, text: "ხილი კარგი იყო, ბოსტნეული ცოტა ნაცემი.", worthIt: true, wouldBuyAgain: false, createdAt: Date.now() - 86400000 * 3 },
  { id: "r-seed-5", offerId: "o6", storeId: "s3", author: "ნინო შ.", rating: 5, text: "ხინკლები დღის ბოლოს, მაგრამ მაინც წვნიანი!", worthIt: true, wouldBuyAgain: true, createdAt: Date.now() - 86400000 * 4 },
];
function readReviews(): Review[] {
  if (typeof window === "undefined") return SEED_REVIEWS;
  return read<Review[]>(REVIEWS_KEY, SEED_REVIEWS);
}
export function useReviews(offerId?: string) {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => readReviews(), () => EMPTY_REVIEWS);
  const list = hydrated ? value : [];
  return offerId ? list.filter((r) => r.offerId === offerId) : list;
}
export function addReview(r: Omit<Review, "id" | "createdAt">) {
  const full: Review = { ...r, id: `rev_${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
  const current = readReviews();
  write(REVIEWS_KEY, [full, ...current]);
  return full;
}

// ANALYTICS
export interface AnalyticsData {
  visits: number;
  purchases: number;
  offerViews: Record<string, number>;
  storeSales: Record<string, { count: number; revenue: number; name: string; logo: string }>;
  dailyVisits: Record<string, number>; // "YYYY-MM-DD"
}
const ANALYTICS_KEY = "gemo:analytics";
const DEFAULT_ANALYTICS: AnalyticsData = { visits: 0, purchases: 0, offerViews: {}, storeSales: {}, dailyVisits: {} };
export function useAnalytics() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => read<AnalyticsData>(ANALYTICS_KEY, DEFAULT_ANALYTICS), () => DEFAULT_ANALYTICS);
  return hydrated ? value : DEFAULT_ANALYTICS;
}
function today() { return new Date().toISOString().slice(0, 10); }
export function trackVisit() {
  if (typeof window === "undefined") return;
  const a = read<AnalyticsData>(ANALYTICS_KEY, DEFAULT_ANALYTICS);
  // seed base numbers on very first run so analytics feel alive
  const seeded = a.visits === 0 && a.purchases === 0;
  const base: AnalyticsData = seeded
    ? { ...DEFAULT_ANALYTICS, visits: 1247, purchases: 384, dailyVisits: seedDaily() }
    : a;
  const t = today();
  write(ANALYTICS_KEY, {
    ...base,
    visits: base.visits + 1,
    dailyVisits: { ...base.dailyVisits, [t]: (base.dailyVisits[t] ?? 0) + 1 },
  });
}
function seedDaily(): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    out[d.toISOString().slice(0, 10)] = 120 + Math.floor(Math.random() * 90);
  }
  return out;
}
export function trackOfferView(offerId: string) {
  if (typeof window === "undefined") return;
  const a = read<AnalyticsData>(ANALYTICS_KEY, DEFAULT_ANALYTICS);
  write(ANALYTICS_KEY, { ...a, offerViews: { ...a.offerViews, [offerId]: (a.offerViews[offerId] ?? 0) + 1 } });
}
export function trackPurchase(storeId: string, storeName: string, storeLogo: string, revenue: number) {
  if (typeof window === "undefined") return;
  const a = read<AnalyticsData>(ANALYTICS_KEY, DEFAULT_ANALYTICS);
  const prev = a.storeSales[storeId] ?? { count: 0, revenue: 0, name: storeName, logo: storeLogo };
  write(ANALYTICS_KEY, {
    ...a,
    purchases: a.purchases + 1,
    storeSales: { ...a.storeSales, [storeId]: { ...prev, count: prev.count + 1, revenue: prev.revenue + revenue, name: storeName, logo: storeLogo } },
  });
}

// SEEN OFFERS — for "new offer" notifications
const SEEN_KEY = "gemo:seen-offers";
export function getSeenOffers(): string[] { return read<string[]>(SEEN_KEY, []); }
export function markOffersSeen(ids: string[]) { write(SEEN_KEY, ids); }

// PARTNER VOTES — thumbs up/down after pickup, drives Trusted Partner badge
export interface PartnerVotes { yes: number; no: number }
const VOTES_KEY = "cheaper:partner-votes";
const VOTED_ORDERS_KEY = "cheaper:voted-orders";
const EMPTY_VOTES: Record<string, PartnerVotes> = {};

// Seed a few partners as trusted so the badge shows immediately in demo data.
const SEED_VOTES: Record<string, PartnerVotes> = {
  s1: { yes: 42, no: 3 },
  s2: { yes: 18, no: 2 },
  s5: { yes: 27, no: 1 },
  s6: { yes: 12, no: 4 },
  s7: { yes: 9, no: 1 },
};

function readVotes(): Record<string, PartnerVotes> {
  if (typeof window === "undefined") return SEED_VOTES;
  return read<Record<string, PartnerVotes>>(VOTES_KEY, SEED_VOTES);
}
export function usePartnerVotes() {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => readVotes(), () => EMPTY_VOTES);
  return hydrated ? value : EMPTY_VOTES;
}
export function getPartnerRating(storeId: string) {
  const v = readVotes()[storeId] ?? { yes: 0, no: 0 };
  const total = v.yes + v.no;
  const ratio = total > 0 ? v.yes / total : 0;
  return { ...v, total, ratio, isTrusted: total >= 5 && ratio >= 0.8 };
}
export function isTrustedPartner(storeId: string) {
  return getPartnerRating(storeId).isTrusted;
}
export function addPartnerVote(storeId: string, yes: boolean, orderId?: string) {
  const current = readVotes();
  const prev = current[storeId] ?? { yes: 0, no: 0 };
  const next = { ...current, [storeId]: { yes: prev.yes + (yes ? 1 : 0), no: prev.no + (yes ? 0 : 1) } };
  write(VOTES_KEY, next);
  if (orderId) {
    const voted = read<string[]>(VOTED_ORDERS_KEY, []);
    if (!voted.includes(orderId)) write(VOTED_ORDERS_KEY, [...voted, orderId]);
  }
}
export function useHasVotedOrder(orderId: string) {
  const hydrated = useHydrated();
  const value = useSyncExternalStore(subscribe, () => read<string[]>(VOTED_ORDERS_KEY, []), () => EMPTY_STRING_LIST);
  return hydrated ? value.includes(orderId) : false;
}
