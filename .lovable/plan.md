# "ხელს გააყოლე" — final acceptance pass, verified against current code

Every item below was re-checked against the real files and the live database this turn, not against the phase summaries.

## Results: 11 pass, 3 partial

| # | Criterion | Result | Where it actually lives |
|---|---|---|---|
| 1 | Partner can create / mark a product as an add-on | Pass | `partner.menu.tsx` — `is_addon` checkbox writes `is_addon`, `addon_category`, `addon_discounted_price`, `addon_max_quantity`, `addon_active` |
| 2 | Add-on does not require a discount | Pass | `partner.menu.tsx` submit — `addon_discounted_price` is null when blank; the 35% floor is only applied to offers, never to `saved_products` |
| 3 | Partner can link add-ons to main offers | **Partial** | `partner.new.tsx` inserts into `offer_addons` at creation only. The edit modal in `partner.offers.tsx` has no add-on section, so links cannot be changed afterwards |
| 4 | Customer sees recommendations contextually | Pass | `offer.$id.tsx` renders the block only when `useOfferAddons(offer.id)` returns rows for that specific offer |
| 5 | Non-discounted add-on shows only the real price | Pass | `offer-addons.ts` — `originalPrice` is null unless `addon_discounted_price < default_original_price` |
| 6 | Discounted add-on shows correct old/new price | Pass | `offer.$id.tsx` lines 623-635 — struck-through original plus computed percent badge |
| 7 | Add-ons attach to the order (this app has no separate cart) | Pass | `offer.$id.tsx` `selectedAddons` → `addons` on the checkout payload for both BOG and Flitt paths |
| 8 | Add-on stock tracked correctly | **Partial** | DB trigger `consume_addon_stock` on `order_addons` correctly locks the row, refuses oversell and increments `addon_stock_sold`. Two gaps: no UI anywhere sets `addon_stock_quantity` (always null = unlimited), and `cancelOrder` only flips status, so stock consumed by an abandoned/failed payment is never released |
| 9 | Add-ons stay linked to the main order | Pass | `order_addons.order_id` FK; inserted inside `createPendingOrder` and rolled back via `cancelOrder` if the insert fails |
| 10 | Partner sees add-ons in order details | Pass | `partner.orders.tsx` lines 111-120, fed by the `order_addons(...)` join in `db.ts` |
| 11 | Checkout total is correct | Pass | `orders-common.ts` `resolveAddonLines` re-prices every line from the DB and validates store, link, active flag and max quantity; `validate_order_amount` trigger is the second floor check |
| 12 | Admin can review and manage add-ons | Pass | `admin.addons.tsx` + `useAllAddons` / `updateAddonAdmin` in `admin-db.ts`, backed by the `admins manage saved_products` policy |
| 13 | Localization | Pass | `i18n-domains/addons.ts` — 24 keys present in all five languages, exact parity; `admin.addons.*` + `admin.nav.addons` = 9 keys in ka/en/ru and zero in tr/fa, per the standing rule. No used-but-undefined keys. Caveat: add-on **names** are single-column (`saved_products.name`), so partner-entered names are not translated the way offer titles are |
| 14 | No regressions | Pass | Typecheck clean. Order queries only gained a nested select; the orders/offers/payments/map paths were not otherwise touched; `order_addons` has no client INSERT grant, so the admin path uses `supabaseAdmin` |

## Direct answer on `audit_log`

Yes — the add-on toggle is still the only writer in the entire app. `logAddonAudit` in `admin-db.ts` is the sole insert; the only other reference (`db.ts`) reads and subscribes. No database trigger or function writes there either (checked `pg_proc` across `public` and `app_private`). The table is currently empty, and `entity_type` has only ever been intended to hold `'addon'`. So an `audit_log` entry is evidence of an add-on activation toggle and nothing else — do not read it as a general moderation trail yet.

Note the RLS policy is `authenticated append audit log` (INSERT open to any authenticated user), which is fine while nothing else depends on the table but should tighten before the log is treated as authoritative.

## Proposed follow-up to close the three partials

1. **Add-on links on offer edit** — add the same add-on picker from `partner.new.tsx` to the edit modal in `partner.offers.tsx`, diffing against existing `offer_addons` rows (insert new, delete removed) instead of blind insert.
2. **Add-on stock quantity field** — add an optional `addon_stock_quantity` input to the add-on section of `partner.menu.tsx`, blank meaning unlimited, plus a small "sold / remaining" readout.
3. **Release stock on cancel** — a DB trigger that decrements `addon_stock_sold` when an order moves to `cancelled` (or when its `order_addons` rows are deleted), so abandoned payments stop permanently eating stock.

Items 1 and 2 are frontend-only. Item 3 needs one migration.
