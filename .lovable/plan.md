# Add-ons Phase 4 — admin moderation panel

Final phase of "ხელს გააყოლე": a platform-wide admin page to review add-ons from every partner and enable/disable them.

## What gets built

**1. Access rule (database change)**
Admins currently have no rule that lets them see other partners' saved products — only partners see their own, plus the narrow customer-facing rule for active linked add-ons (verified against the live database). Add an admin-wide rule on the products table so admins can view and moderate all of them.

**2. Admin data layer** (`src/lib/admin-db.ts`)
- `useAllAddons()` — loads products marked as add-ons joined with the store name, following the same shape as the existing `useAllOffers` (client-side query, live refresh paused while the tab is hidden via the existing `withVisibility` helper).
- Sales aggregates come from a second, grouped query over add-on order lines (quantity sold, revenue) so the full order-line table is never pulled into the browser.
- `updateAddonAdmin(id, patch)` — mirrors `updateOfferAdmin`. Admin UI only ever sends the active flag; name, price and composition stay partner-owned.

**3. Admin page** (`src/routes/_authenticated/admin.addons.tsx`)
Same layout as the offers page (heading + count, filters card, table):
- Filters: store, add-on category (the 10 defined categories), active/inactive; plus name search.
- Columns: name, store, category, regular price, discounted price (when set), remaining stock or "unlimited", quantity sold, revenue, active toggle, audit-log button.
- Toggling writes the change and records an audit entry.

**4. Navigation + wording**
New "დამატებები" entry in the admin sidebar next to Offers/Orders. New `admin.addons.*` labels in **all five languages** (ka/en/ru/tr/fa) — the project's language set is five, not three, so ka/en/ru alone would leave gaps.

## Notes worth flagging

- **Audit log:** the panel/button exists and reads entries, but nothing in the codebase currently writes to `audit_log` (no client insert, no database trigger — checked). The insert rule requires the actor to be the signed-in user, so the toggle will write the entry itself (entity type `addon`). This is a new write path rather than reuse of an existing one; the reading UI is reused unchanged.
- `admin.offers.tsx` is not modified — patterns are copied, not refactored.

## Verification

- As admin, add-ons from multiple stores appear (proves the new access rule works).
- Toggling an add-on inactive removes it from the customer offer page's add-on section, and an audit entry appears.
- Sold/revenue figures match the partner stats page for the same add-on.
- A non-admin cannot read or update other stores' add-ons.

## Follow-up

After this lands, walk the original 14 acceptance criteria end to end and report anything that doesn't check out.
