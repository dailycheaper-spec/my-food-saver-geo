# Restore instant back-navigation (bfcache) after payment redirects

## Confirmed current behaviour

`src/components/AppTracker.tsx` (mounted globally) opens the Supabase Realtime channel `app-new-offer-alerts` in an effect with no `notifs.enabled` guard — the guard exists only inside `notify()`. So the WebSocket is open for every visitor on every page, including users with notifications off. An open WebSocket blocks the browser back/forward cache, so returning from an external payment page forces a full app reload instead of an instant restore.

## Changes (single file: `src/components/AppTracker.tsx`)

1. **Skip the channel entirely when notifications are off**
   - Add an early return on `!notifs.enabled` before the channel is created. Dependencies already include `notifs.enabled`, so re-subscription behaviour is unchanged.

2. **Pause/resume the channel with tab visibility for users who do have notifications on**
   - Wrap subscribe/unsubscribe in helpers holding a nullable channel ref.
   - On `visibilitychange`: hidden -> remove the channel; visible -> re-subscribe (also fires on bfcache restore).
   - Cleanup removes the listener and the channel.
   - The realtime handler logic (`notify`, `shouldNotify`, distance filtering, localized title) stays exactly as-is.

No changes to notification settings storage, i18n, payment flow, or any other component.

## Verification

- With notifications enabled, navigate away to an external URL and press back; confirm the page restores from bfcache with no loading flash or full re-fetch.
- Confirm a new offer insert still triggers a notification while the tab is in the foreground.
- Confirm the same instant restore for a user with notifications disabled (channel never opens).
