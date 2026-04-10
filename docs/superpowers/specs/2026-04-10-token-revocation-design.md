# Token Revocation — Design Spec

**Date:** 2026-04-10
**Status:** Approved

## Summary

Replace the static "ACTIVE" badge on bearer token rows in the dashboard with a trash icon that triggers a modal confirmation before hard-deleting the token.

## Types

```ts
type ActionResult =
  | { ok: true; redirect: string }
  | { ok: false; code: 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'TRANSIENT_ERROR'; error: string }
```

Used by both the action and `TokenRow` to avoid string matching for control flow.

## Behaviour

### Normal state
Each token row displays:
- Token label (bold)
- Created date (small, muted) — rendered by displaying the ISO string directly (no re-parsing required for this simple use case)
- Trash icon (`🗑`) on the right, with `title="Revoke token"` tooltip

The "ACTIVE" / "REVOKED" span is removed entirely. Hard-deleted rows are gone from the DB and will not appear in the list.

### Modal trigger
Clicking the trash icon opens a centered modal overlay styled to match the dark terminal aesthetic:
- Background: black with red accent border
- Heading: **"Delete token"**
- Body: `"Are you sure you want to delete [label]? This cannot be undone."`
- Buttons: `Delete` (solid red) and `Cancel` (dark/grey)

### Confirmed
Clicking `Delete` sets `isSubmitting = true` (disabling both buttons) and calls `revokeToken(id)`. The `Delete` button shows "Deleting…" while in-flight.

On `{ ok: true }` the client calls `router.push(result.redirect)`. The server does **not** call Next.js `redirect()` — returning a redirect signal avoids `NEXT_REDIRECT` being swallowed by try/catch and is compatible with direct async calls.

On `{ ok: true }`: the modal stays open with buttons disabled (`isSubmitting` remains `true`). `router.push(result.redirect)` is called. If `router.push` throws, `isSubmitting` is reset to `false` and an error message `"Navigation failed. Please refresh the page."` is shown in the modal with retry available. `closeModal()` is **not** called on this path — the modal closes only when the page unmounts after successful navigation.

On `{ ok: false, code: 'AUTH_ERROR' }`: calls `closeModal()` (which closes the dialog and restores focus to the trash icon), then calls `router.push('/api/auth/signin')`. The redirect target is hardcoded on the client — the `ok: false` branch never contains a `redirect` field.

On `{ ok: false, code: 'TRANSIENT_ERROR' | 'VALIDATION_ERROR' }`: sets `isSubmitting = false`, sets `error` to the message string. The modal stays open, the error is shown in red below the body text, buttons are re-enabled. `closeModal()` is not called — the user can retry or click Cancel.

### Cancelled
Clicking `Cancel` or pressing `Escape` closes the modal and resets `error` to `null`. Cancel and Escape are disabled while `isSubmitting` is true.

### Error state reset
`error` is reset to `null` whenever `isModalOpen` is set to `true`, so reopening the modal for the same token always starts clean.

### Post-delete navigation
After `router.push('/dashboard')` the list re-renders without the deleted token. A brief flash during navigation is an accepted trade-off. No loading skeleton is required.

## Components

### `TokenRow` (`src/app/dashboard/TokenRow.tsx`)
- `"use client"` component
- Props: `token: { id: string; label: string; createdAt: string }` — `id` is a UUID string; `createdAt` is an ISO string serialised by the parent (`t.createdAt.toISOString()`) before passing across the RSC boundary
- State: `isModalOpen: boolean`, `isSubmitting: boolean`, `error: string | null`
- `isSubmitting` is the single source of truth for the in-flight state — no `useTransition`/`isPending` layer needed; `startTransition` is not used
- Calls `revokeToken(id)` directly as an async function, sets `isSubmitting` before the call, clears it after
- Uses `useRouter` from `next/navigation` for client-side navigation on success or auth error
- Stores a `useRef` to the trash icon button for focus-return on modal close

### `revokeToken(id)` (`src/app/dashboard/actions.ts`)
- `"use server"` action: `(id: string) => Promise<ActionResult>`
- Input: validates `id` with `z.string().uuid()` — returns `{ ok: false, code: 'VALIDATION_ERROR', error: 'Invalid request.' }` if malformed. Client treats `VALIDATION_ERROR` the same as `TRANSIENT_ERROR` (shows error in modal with retry, does not redirect to sign-in)
- Auth check: re-fetches session; if absent or missing `tenantId`, returns `{ ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' }`
- Ownership check: loads token by `id`; if not found or `token.tenantId !== session.tenantId`, returns `{ ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' }` (same message — no leakage of token existence)
- DB delete in try/catch; on error returns `{ ok: false, code: 'TRANSIENT_ERROR', error: 'Failed to delete token. Please try again.' }`
- Success: returns `{ ok: true, redirect: '/dashboard' }`
- Never calls `redirect()` — all paths return a typed `ActionResult`
- CSRF: covered by Next.js App Router's built-in origin check for server actions (no additional handling needed)

### `dashboard/page.tsx`
- Passes `createdAt` as `t.createdAt.toISOString()` when constructing `TokenRow` props
- Replaces the inline `tokens.map(...)` `<li>` block with `<TokenRow token={...} />` instances
- Removes the `<span>ACTIVE/REVOKED</span>` element
- Query fetches all rows for the tenant (no filter — hard-deleted rows do not exist). Heading count: `tokens.length`

## Security

1. Input is validated with Zod before any DB access
2. Session is re-fetched inside the action (never trusts client-passed data)
3. Ownership is verified: `token.tenantId === session.tenantId` before delete
4. Auth errors and ownership mismatches return the same message (no information leakage)
5. CSRF is covered by Next.js App Router server action origin validation

## Accessibility

- Modal implemented using native HTML `<dialog>` element opened with `dialog.showModal()` (not the `open` attribute) — required for built-in focus trapping, `cancel` event firing on Escape, and `role="dialog"` semantics. Closed with `dialog.close()`.
- `aria-labelledby` pointing to the heading element
- `Escape` key suppression while `isSubmitting`: intercept via **both** `onCancel` (`e.preventDefault()`) and a `keydown` listener on the `<dialog>` element (`e.key === 'Escape' && e.preventDefault()`). `onCancel` alone is unreliable across browsers because the dialog may visually close before the event fires.
- On open: focus moves to the `Cancel` button (safe default for a destructive action)
- Close sequence is encapsulated in a single `closeModal()` helper inside `TokenRow` that: (1) sets `isModalOpen = false`, (2) calls `dialog.close()`, (3) calls `trashRef.current?.focus()`. All close paths (Cancel button, Escape key, after error) call this helper.
- On `AUTH_ERROR`: `closeModal()` is called before `router.push` — restoring focus to the trash icon before navigation. The element will no longer exist after navigation completes; that is acceptable.

## Styling

Follows the existing dashboard aesthetic (monospace font, black background, `#ff0000` red accents, `#333`/`#444` borders). The modal uses:
- `position: fixed`, `inset: 0` backdrop at `rgba(0,0,0,0.7)`
- Centered card with `border: 2px solid #ff0000`, `background: #000`
- Delete button: `background: #ff0000`, Cancel button: `background: #333`

## Out of Scope

- Audit log entry on delete (can be added later)
- Bulk revocation
- Token expiry / automatic revocation
- Loading skeleton during post-delete navigation
- Rate limiting on the `revokeToken` action (ownership check is the primary protection; rate limiting can be added at the middleware layer later)
