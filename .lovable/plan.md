# "ხელს გააყოლე" — Phase 1: data model + partner-side management

Scope is exactly Phase 1 from the brief: database schema and partner UI. No customer-facing add-on cards, no checkout/amount changes, no stock decrement — those stay for Phases 2–4.

## What gets built

**1. Data model**
- Extend the existing saved products table (the partner's reusable menu) with add-on fields: an "is add-on" flag, an add-on category (drinks, water, juice, coffee/tea, desserts, sauces, sides, snacks, extra portion, other), an optional discounted price, max quantity per order (default 5), and an active toggle. No new parallel product entity.
- New link table `offer_addons`: which add-ons are offered alongside which offer (many-to-many, with sort order and active flag, unique per offer+product).
- New table `order_addons`: the actual purchased add-on line items on an order, with quantity and a price snapshot taken at order time (never recomputed from a later-edited product row). Written server-side only — no client insert path, matching how order amounts are already handled.

**2. Access rules**
Reuse the existing store-membership and admin helpers already used everywhere else:
- Partners manage add-on links only for their own store's offers, and can only link add-ons that belong to their own store.
- Customers can read active add-on links (read-only).
- Order add-on rows are visible to the order's customer, the selling store's members, and admins.
- Grants are issued for each new table alongside the policies.

**3. Partner UI (additive only)**
- In the menu page's add/edit product sheet: a toggle "ხელს გააყოლე პროდუქტად დამატება". When on, it reveals the add-on category picker, an optional discounted price (blank by default — a discount is never required), max quantity per order, and an active toggle.
- A new "ჩემი დამატებები" section on the menu page listing only add-on products.
- In the new-offer flow and the "publish from saved product" flow: a multi-select "შესთავაზე დამატებები ამ შეთავაზებასთან ერთად" listing the store's active add-ons; selections are written as offer↔add-on links.
- One new partner-facing label key added to translations; broader i18n comes later.

## Verification
Mark a saved product as an add-on with no discount and confirm it saves without demanding a price reduction; link it to a test offer and confirm the link row exists; confirm another partner's account can neither see nor link those add-ons; confirm composition, unit type and publishing in the existing menu/offer flows are unchanged.

## Technical notes
- Migration adds columns with `if not exists` + a check constraint on add-on category; creates `offer_addons` and `order_addons` with RLS enabled, GRANTs, and the policies described above using `app_private.is_store_member` / `app_private.has_role`.
- Files touched: `src/routes/_authenticated/partner.menu.tsx`, `src/routes/_authenticated/partner.new.tsx`, `src/lib/partner-store.functions.ts` (add-on link read/write), i18n partner domain, and regenerated Supabase types.
