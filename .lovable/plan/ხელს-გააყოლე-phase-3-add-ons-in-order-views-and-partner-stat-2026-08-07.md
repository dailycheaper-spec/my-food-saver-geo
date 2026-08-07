# ხელს გააყოლე — Phase 3: add-ons in order views and partner stats

Display-only phase. No schema changes, no writes touched.

## 1. Order queries — `src/lib/db.ts`

`OrderWithRelations` gains:

```ts
order_addons: { quantity: number; unit_price: number; saved_products: { name: string } | null }[];
```

Add `, order_addons(quantity, unit_price, saved_products(name))` to the select in every hook that returns this type, so the type stays honest everywhere:
`useMyOrders`, `fetchOrder` (feeds the customer order-detail page), `useStoreOrders` (partner orders + stats) and `useAllOrders` (admin list).

Access rules already allow these reads: customers can read add-on lines on their own orders, store members on their store's orders. One caveat — the public read rule on add-on products only covers add-ons still linked and active, so a name can come back empty for a de-listed add-on; the UI falls back to a dash instead of breaking.

## 2. Partner order card — `src/routes/_authenticated/partner.orders.tsx`

Below the order header, when the order has add-ons, render a two-block layout:

```text
Main:
Burger Combo ×1

Add-ons:
Coca-Cola ×2
Sauce ×1
```

- Main line uses the existing offer title, now labelled `partner.orders.mainItem` and showing `×{order.quantity}`.
- Add-ons block only renders when `order.order_addons.length > 0`; smaller, muted text so it stays visually secondary.

## 3. Partner stats — `src/routes/_authenticated/partner.stats.tsx`

Extend the existing `useMemo` (no new query) with: add-on revenue, top 5 add-ons by quantity, conversion rate (share of paid orders containing an add-on) and average add-ons per order.

New card below "Top Selling", same style, titled "დამატებების სტატისტიკა":
- Add-on revenue
- Top add-ons list (name + quantity), same row style as top selling
- Conversion rate and average add-ons per order — **only when at least 10 paid orders exist**; below that the existing `noData` empty state is shown in that slot rather than a misleading "100%".

No "average order value increase" figure in this phase — that comparison needs a proper baseline and is easy to overstate.

## 4. Translations

Partner-facing keys in ka/en/ru (existing partner-domain convention): `partner.orders.mainItem`, `partner.orders.addonsItem`, `partner.stats.addonsTitle`, `partner.stats.addonRevenue`, `partner.stats.addonConversion`, `partner.stats.avgAddonsPerOrder`.

## 5. Customer order detail — `src/routes/orders.$id.tsx`

With the join added to `fetchOrder`, show the bought add-ons on the customer's own order page, reusing the existing `offer.addons.title` label and the same main/add-ons split.

## Not in this phase

Admin moderation/management of add-ons (Phase 4).
