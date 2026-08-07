# ხელს გააყოლე — Phase 2: customer-facing add-ons

Builds on Phase 1's schema (`offer_addons`, `order_addons`, add-on fields on `saved_products`). No new parallel systems.

## 1. Database — add-on stock

Migration (needs approval before the code work):
- `saved_products.addon_stock_quantity` (integer, null = unlimited) and `addon_stock_sold` (integer, default 0).
- A `BEFORE INSERT` trigger on `order_addons` that locks the `saved_products` row (`SELECT ... FOR UPDATE`), rejects the insert when `addon_stock_quantity` is set and `addon_stock_sold + quantity` would exceed it, and otherwise increments `addon_stock_sold` atomically. Unlimited add-ons skip the check.

## 2. Server-side checkout

`src/lib/payments/orders-common.ts`:
- `OrderInput` gains `addons?: { savedProductId: string; quantity: number }[]`.
- In `createPendingOrder`, before the order insert, load the requested `saved_products` rows and validate each: `is_addon` and `addon_active` true, belongs to `data.storeId`, has an active `offer_addons` link to `data.offerId`, and `quantity` within `addon_max_quantity`. Any failure throws and no order is created.
- Line price computed server-side as `addon_discounted_price ?? default_original_price`; the client-sent price is ignored entirely (same rule as the main offer).
- Sum of add-on lines is added to `realAmount`.
- After the `orders` insert, write the `order_addons` rows through the privileged path used for order creation (no client INSERT grant exists). If the stock trigger rejects a row, the order is cancelled so no half-complete order is left behind.
- `validate_order_amount` only enforces a floor, so a higher amount stays valid — verified during implementation, not assumed.

## 3. Customer UI — `src/routes/offer.$id.tsx`

- New section between the offer info and the payment method selector; nothing rendered when the offer has no active add-ons.
- Fetch: active `offer_addons` for this offer joined to `saved_products` (add-on + active), ordered by `sort_order`.
- Each add-on is a compact horizontal card: image, name, price. Struck-through original price and `-X%` badge only when `addon_discounted_price` is set — never a fake discount.
- Quantity stepper per card, starting at 0, capped by `addon_max_quantity` and by remaining stock (`addon_stock_quantity - addon_stock_sold`) when stock is limited; sold-out add-ons show the out-of-stock label and can't be increased.
- Selections live in local page state (`Record<savedProductId, quantity>`) — there is no cart.
- The sticky bottom total adds `Σ(unit price × quantity)` for display; the charge stays server-authoritative.
- Non-zero selections are passed as `addons` into both `startBogCheckoutFn` and `startFlittCheckoutFn`.

## 4. Translations

`offer.addons.title`, `offer.addons.add`, `offer.addons.outOfStock` in all five languages (ka/en/ru/tr/fa), added to the customer i18n domain.

## Not in this phase

Partner order-detail add-on display, partner analytics, admin moderation — Phases 3–4.
