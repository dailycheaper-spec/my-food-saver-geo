// Aggregation helpers for Partner + Admin business insights.
// Every function derives its number from real order/offer rows passed in.
// Returns `null` when there isn't enough data to be honest about the metric.

import type { Database } from "@/integrations/supabase/types";

type Offer = Database["public"]["Tables"]["offers"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type OrderWithOffer = OrderRow & { offer?: Offer | null };

const REVENUE_STATUSES = new Set(["paid", "ready", "collected"]);
export const isRevenueOrder = (o: OrderRow) => REVENUE_STATUSES.has(o.status);

const dayMs = 86_400_000;

export function ordersToday(orders: OrderRow[]) {
  const today = new Date().toDateString();
  return orders.filter((o) => isRevenueOrder(o) && new Date(o.created_at).toDateString() === today);
}

export function ordersInLastDays(orders: OrderRow[], days: number) {
  const cutoff = Date.now() - days * dayMs;
  return orders.filter((o) => isRevenueOrder(o) && new Date(o.created_at).getTime() >= cutoff);
}

export function sumAmount(orders: OrderRow[]) {
  return orders.reduce((s, o) => s + Number(o.amount), 0);
}

/** Average % discount across offers with completed orders in the window. */
export function averageDiscountPct(orders: OrderWithOffer[], days = 30): number | null {
  const scope = ordersInLastDays(orders, days).filter(
    (o) => o.offer && Number(o.offer.original_price) > 0,
  ) as OrderWithOffer[];
  if (scope.length === 0) return null;
  const sum = scope.reduce((s, o) => {
    const orig = Number(o.offer!.original_price);
    const disc = Number(o.offer!.discounted_price);
    return s + Math.max(0, (orig - disc) / orig) * 100;
  }, 0);
  return sum / scope.length;
}

/**
 * % of distinct customers in the last `days` that also had at least one
 * revenue-eligible order before that window (from the same order set).
 */
export function returningCustomerPct(
  orders: OrderRow[],
  days = 30,
): { pct: number; returning: number; total: number } | null {
  const cutoff = Date.now() - days * dayMs;
  const recent = orders.filter((o) => isRevenueOrder(o) && new Date(o.created_at).getTime() >= cutoff);
  if (recent.length === 0) return null;
  const prior = new Set(
    orders
      .filter((o) => isRevenueOrder(o) && new Date(o.created_at).getTime() < cutoff)
      .map((o) => o.user_id),
  );
  const recentUsers = new Set(recent.map((o) => o.user_id));
  if (recentUsers.size < 3) return null;
  let returning = 0;
  recentUsers.forEach((u) => { if (prior.has(u)) returning++; });
  return { pct: (returning / recentUsers.size) * 100, returning, total: recentUsers.size };
}

export function averageBasketValue(orders: OrderRow[]): number | null {
  const scope = orders.filter(isRevenueOrder);
  if (scope.length === 0) return null;
  return sumAmount(scope) / scope.length;
}

/**
 * Best 3-hour window by order count. Requires ≥ MIN orders and the window
 * must concentrate a meaningful share (≥30% and ≥5 orders) or we return null.
 */
export function peakHourWindow(
  orders: OrderRow[],
  minOrders = 10,
): { from: number; to: number; share: number } | null {
  const scope = orders.filter(isRevenueOrder);
  if (scope.length < minOrders) return null;
  const b = new Array<number>(24).fill(0);
  scope.forEach((o) => { b[new Date(o.created_at).getHours()]++; });
  let best = { from: 0, count: 0 };
  for (let h = 0; h <= 21; h++) {
    const c = b[h] + b[h + 1] + b[h + 2];
    if (c > best.count) best = { from: h, count: c };
  }
  if (best.count < Math.max(5, scope.length * 0.3)) return null;
  return { from: best.from, to: best.from + 3, share: best.count / scope.length };
}

/** Top category only if there's a clear leader (≥1.3× runner-up). */
export function leadingCategory(
  orders: OrderWithOffer[],
  minOrders = 10,
): { category: string; count: number } | null {
  const scope = orders.filter((o) => isRevenueOrder(o) && o.offer?.category);
  if (scope.length < minOrders) return null;
  const m = new Map<string, number>();
  scope.forEach((o) => { const c = o.offer!.category; m.set(c, (m.get(c) ?? 0) + 1); });
  const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
  if (arr.length === 0) return null;
  if (arr.length === 1) return { category: arr[0][0], count: arr[0][1] };
  if (arr[0][1] < arr[1][1] * 1.3) return null;
  return { category: arr[0][0], count: arr[0][1] };
}

/** Week-over-week order count change; only when prior week had ≥3 orders. */
export function weekOverWeekOrderChange(
  orders: OrderRow[],
): { changePct: number; thisWeek: number; lastWeek: number } | null {
  const now = Date.now();
  const thisWeek = orders.filter(
    (o) => isRevenueOrder(o) && new Date(o.created_at).getTime() >= now - 7 * dayMs,
  ).length;
  const lastWeek = orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return isRevenueOrder(o) && t >= now - 14 * dayMs && t < now - 7 * dayMs;
  }).length;
  if (lastWeek < 3) return null;
  return { changePct: ((thisWeek - lastWeek) / lastWeek) * 100, thisWeek, lastWeek };
}

export function topOffersByOrders(orders: OrderWithOffer[], n = 5) {
  const map = new Map<string, { offerId: string; title: string; count: number; revenue: number }>();
  orders.filter(isRevenueOrder).forEach((o) => {
    const prev = map.get(o.offer_id) ?? {
      offerId: o.offer_id,
      title: o.offer?.title ?? "—",
      count: 0,
      revenue: 0,
    };
    prev.count += 1;
    prev.revenue += Number(o.amount);
    map.set(o.offer_id, prev);
  });
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, n);
}

export function lowestPerformingActiveOffers(
  orders: OrderRow[],
  offers: Offer[],
  n = 5,
) {
  const counts = new Map<string, number>();
  orders.filter(isRevenueOrder).forEach((o) => counts.set(o.offer_id, (counts.get(o.offer_id) ?? 0) + 1));
  return offers
    .filter((o) => o.is_active)
    .map((o) => ({ offerId: o.id, title: o.title, count: counts.get(o.id) ?? 0 }))
    .sort((a, b) => a.count - b.count)
    .slice(0, n);
}

const HOURS = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

export type Insight = { id: string; text: string };

/** Build up to 3 confident Georgian insight sentences from real aggregates. */
export function buildInsights(orders: OrderWithOffer[]): Insight[] {
  const out: Insight[] = [];
  const peak = peakHourWindow(orders);
  if (peak) {
    out.push({
      id: "peak",
      text: `თქვენი ყველაზე აქტიური საათებია ${HOURS(peak.from)}–${HOURS(peak.to)} (შეკვეთების ${Math.round(peak.share * 100)}%).`,
    });
  }
  const cat = leadingCategory(orders);
  if (cat) {
    out.push({
      id: "category",
      text: `ყველაზე მეტად იყიდება კატეგორია „${cat.category}" — ${cat.count} შეკვეთა.`,
    });
  }
  const wow = weekOverWeekOrderChange(orders);
  if (wow) {
    const rounded = Math.round(wow.changePct);
    if (Math.abs(rounded) >= 5) {
      out.push({
        id: "wow",
        text:
          rounded > 0
            ? `ამ კვირას შეკვეთები ${rounded}%-ით მეტია გასულ კვირაზე (${wow.thisWeek} vs ${wow.lastWeek}).`
            : `ამ კვირას შეკვეთები ${Math.abs(rounded)}%-ით ნაკლებია გასულ კვირაზე (${wow.thisWeek} vs ${wow.lastWeek}).`,
      });
    }
  }
  return out.slice(0, 3);
}
