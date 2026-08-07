# Fix the add-on access-rule recursion

Confirmed against the live database: the two access rules reference each other in a loop.

- On offer↔add-on links: the partner rule's write check reads the products table.
- On products: the "anyone reads linked active add-ons" rule reads the offer↔add-on links table.

Postgres refuses to evaluate the cycle and returns "infinite recursion detected in policy for relation 'offer_addons'".

## The fix

One migration, no app-code changes.

Move the products-side lookup into a privileged helper function (`app_private.is_active_linked_addon`) that reads the link table internally without re-triggering row security — the same helper pattern the project already uses for `app_private.is_store_member` and `app_private.has_role`. The public read rule is then recreated to call that helper instead of embedding the sub-query.

Execute permission is revoked from PUBLIC and re-granted only to the anon and authenticated roles, matching the other helpers.

The link-table rules are left untouched — only how the products rule reaches them changes.

## Full audit of the other add-on rules (already done)

I read every access rule on the three tables added across the four phases and mapped which other table each one reads:

```text
offer_addons   -> offers, saved_products
saved_products -> offer_addons          <-- the loop
order_addons   -> orders, offers
orders         -> stores
offers         -> (none)
```

Result: the products <-> link-table pair is the only cycle. The order-line rules read orders and offers, and neither of those reads back into the order-line table, so that chain terminates. The offers rules reference no other table at all. Everything else on these tables uses the privileged `is_store_member` / `has_role` helpers, which are cycle-proof by construction.

No extra changes needed beyond the one fix above — but after the migration I will re-run the same mapping to confirm the new helper leaves no remaining loop.


## Verification

- Query the products table as anon and as authenticated after the change and confirm the recursion error is gone. If `SECURITY DEFINER` alone does not stop it, add `set local row_security = off` inside the function body (safe here because the function's own logic fully replaces what row security would check) — try the simpler form first.
- Load an offer page carrying add-ons as a customer and confirm the add-on section loads.
- As an owning partner, link and unlink an add-on on an offer and confirm both still succeed.
- Run the security linter after the migration.
