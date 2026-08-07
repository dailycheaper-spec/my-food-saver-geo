# Close the add-on partials

Three targeted changes. The untranslated add-on names caveat is explicitly left alone as an accepted simplification.

## 1. Release add-on stock when an order is cancelled

Today `consume_addon_stock` increments `saved_products.addon_stock_sold` the moment `order_addons` rows are inserted — which happens while the order is still `pending`, before payment. Nothing ever reverses it, so every abandoned or failed payment permanently eats stock.

Migration adds `public.release_addon_stock_on_cancel()` plus an `AFTER UPDATE` trigger on `orders`, firing only on the `status → cancelled` transition and decrementing with `greatest(0, ...)` so a repeat fire cannot go negative. Function privileges revoked from `public`, `anon`, `authenticated`.

Confirmed against the code: `cancelOrder` in `orders-common.ts` is the only cancellation path and it sets `status = 'cancelled'`, so that single transition covers both the rollback-on-addon-insert-failure case and failed/abandoned payments. Successful orders never hit it.

## 2. Add-on links editable on an existing offer

`partner.new.tsx` inserts `offer_addons` at creation; the edit modal `OfferForm` in `partner.offers.tsx` has no add-on section, so links are frozen after creation.

Changes to `partner.offers.tsx`:
- Load the store's active add-ons (`saved_products` where `is_addon` and `addon_active`) and, when editing, the offer's current `offer_addons` rows.
- Render the same multi-select chips used in `partner.new.tsx`, reusing the existing `partner.addons.offerPickTitle` / `offerPickEmpty` keys and `addonCategoryKey` labels — no new translation keys needed.
- On save, diff selection against the loaded set: insert only newly checked ids, delete only unchecked ids that previously existed. No blind re-insert (the table has `unique(offer_id, saved_product_id)`).
- On create, insert the selection after the offer row comes back, matching the existing `partner.new.tsx` behaviour.

## 3. Tighten `audit_log` INSERT

The current policy is literally named `authenticated append audit log` and lets any signed-in user insert. Migration drops it and adds an admin-only replacement checked through `app_private.has_role(auth.uid(), 'admin')`, which is the gate every other admin-only write in this project uses. Read policies (`admins read audit log`, `store members read own offer audit log`) are left untouched.

Safe because the admin add-on toggle is the only writer in the app; nothing partner- or customer-side writes there.

## Technical notes

- One migration covers items 1 and 3.
- Item 2 is frontend-only, in `partner.offers.tsx`.
- Verification: cancel a pending order carrying a limited-stock add-on and confirm `addon_stock_sold` drops and the add-on is purchasable again, while a paid order leaves it consumed; edit an offer adding one add-on and removing another and confirm `offer_addons` matches the selection exactly and the customer offer page reflects it; confirm the admin toggle still writes an audit row.
