# bfcache fix — already applied, one gap remains

## Current state (verified)

`src/components/AppTracker.tsx` already contains both changes from the uploaded prompt:

- an early `if (!notifs.enabled) return;` guard before the channel is created
- subscribe/unsubscribe helpers with a `visibilitychange` listener that closes the channel while the tab is hidden and reopens it when visible

So the global always-on WebSocket is gone. No change needed there.

## Remaining gap

Two other places still open Realtime channels that can keep a page out of bfcache:

- `src/lib/delivery/hooks.ts` — `delivery-order-${orderId}`, live on the order page, which is exactly where the bank redirect returns the user
- `src/lib/admin-db.ts` — admin bank-account/bank-detail channels and an `presence:admin` channel

The order-tracking one matters most for the payment flow.

## Proposed change

Apply the same visibility pause/resume pattern to `src/lib/delivery/hooks.ts`:

- hold the channel in a nullable variable with `subscribe()` / `unsubscribe()` helpers
- close it on `visibilitychange → hidden`, reopen on `visible`
- on resume, re-fetch the order once so any status change missed while hidden is picked up (delivery status must not go stale)

Optionally the same for the admin channels in `src/lib/admin-db.ts`; admin pages aren't part of the payment flow, so this is lower priority and can be skipped.

## Verification

Start a real BOG/Flitt checkout from the order page, press browser back from the bank page, and confirm an instant restore with no full app reload. Then confirm the delivery status still updates live while the tab is in the foreground, and refreshes correctly right after returning.
