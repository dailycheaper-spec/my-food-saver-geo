# bfcache fix — already in place, one gap left

## Current state (verified)

- `src/components/AppTracker.tsx` already does exactly what the uploaded note asks: it returns early when notifications are off, and it opens/closes the realtime channel on `visibilitychange`.
- `src/lib/delivery/hooks.ts` already uses the same pause-on-hidden pattern for both delivery channels.
- The only remaining always-open realtime subscriptions are in `src/lib/admin-db.ts`: three `postgres_changes` channels (bank accounts, bank details, contract status) plus an admin presence channel. These are admin-panel only, so they don't affect the customer payment-return flow.

## Proposed change

Apply the same visibility pause/resume wrapper to the subscriptions in `src/lib/admin-db.ts` so admin pages are also bfcache-eligible:

- Wrap each `subscribe`/`removeChannel` pair in `subscribe()` / `unsubscribe()` helpers with a `visibilitychange` listener.
- On becoming visible again, re-subscribe and refetch once so admin data isn't stale.
- Leave the presence channel logic intact aside from the same pause/resume (presence re-announces on resume).

## Verification

Start a checkout, go to the bank page, press back — the app should restore instantly with no reload flash. Then open an admin page, switch tabs and return — data should refresh without duplicate channels.
