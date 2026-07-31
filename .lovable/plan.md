## Goal

Turn the current read-only Admin → Users table into a full user-management dashboard, in the existing cream/green design system, with all privileged actions validated server-side.

## What's there today

`src/routes/_authenticated/admin.users.tsx` renders a plain table from `useAllCustomers()` (a direct browser Supabase read of `profiles` + `user_roles` + `orders`). Only a text search exists. The `profiles` table has: id, first_name, last_name, avatar_url, phone, district, created_at, updated_at — there is **no email and no account-status column**, and email lives in the auth system, not in `profiles`.

## 1. Database

One migration:
- Add `account_status` to `profiles` (`active` | `suspended` | `unverified`, default `active`, backfilled `active`).
- Add an admin-only update policy so only admins can change it (customer self-update policies stay limited to their own non-status fields).

Email stays where it is; it will be read server-side through the admin auth API and joined onto each row, plus the email-confirmed flag which drives the "Unverified" status badge.

## 2. Server functions (new `src/lib/admin-users.functions.ts`)

Every function starts with the same admin check used in `admin-store.functions.ts` (look up `admin` in `user_roles` for the caller, throw `Forbidden` otherwise), then uses the service-role client loaded inside the handler.

- `listAdminUsers` — profiles + roles + order aggregates + email/verified/last-sign-in from the auth admin API.
- `updateAdminUser` — name, phone, district, account status (Zod-validated).
- `setUserRole` — grant/revoke a role in `user_roles` (guard: an admin cannot strip their own admin role).
- `sendPasswordReset` — password-recovery email to the user's address.
- `generateTempPassword` — sets a generated one-time password, returns it once for the admin to hand over.
- `setUserStatus` (single + bulk) — suspend/activate.
- `deleteUserAccount` — deletes the auth user and cascading profile rows.

Suspension is enforced, not cosmetic: suspended users are blocked at sign-in/session check so the badge reflects real access.

## 3. Users page UI

Rebuilt as `admin.users.tsx` plus small components (`UsersTable`, `UserEditSheet`, `UserRowActions`, `ConfirmDialog`) using existing shadcn primitives (dropdown-menu, sheet, select, checkbox, alert-dialog, pagination, sonner toasts).

Filter bar: search input, Role filter (All / Customer / Partner / Admin), Status filter (All / Active / Suspended / Unverified), District select (populated from live data), and **Export CSV** of the current filtered set.

Table: leading checkbox column, existing columns plus **Status** badge (green/red/yellow) and a right-aligned **Actions** three-dot menu — Edit Profile, Reset Password, Change Role, Suspend/Activate, Delete Account. Joined / Spent / Orders headers become sortable (click to toggle asc/desc). Row click opens the edit panel.

Danger actions (Delete, Suspend, bulk suspend) always go through a confirmation dialog first.

Bulk bar appears when rows are selected: Bulk Suspend, Bulk Activate, Bulk Export.

Pagination at the bottom: items per page 10/25/50 and "Page X of Y".

## 4. Edit slide-over

Sheet panel with: full name, email (read-only, from auth), phone, district/address, role selector, status toggle, plus a read-only quick-view of order count, total GEL spent and total saved. Save calls the server functions and shows a toast.

## 5. i18n

All new labels, statuses, toasts and confirmation copy added to `src/lib/i18n-domains/admin.ts` for all five languages (KA, EN, RU, TR, FA) — no hardcoded strings.

## Technical notes

- No new colors: statuses reuse `success` / `destructive` / warning tokens already in `src/styles.css`.
- All mutations are server functions with the admin role check; the browser never uses the service-role client.
- Table data continues to refresh after each mutation; realtime is not added for this page.
