# Token Revocation UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static ACTIVE/REVOKED badge on dashboard token rows with a trash icon + confirmation modal that hard-deletes the token, and show `lastUsedAt` usage context in its place.

**Architecture:** A new `"use client"` `TokenRow` component owns all modal state and calls a typed `revokeToken` server action that validates, authorises, and hard-deletes. The page server component passes serialised (ISO string) dates across the RSC boundary. No `redirect()` is used in the action — a typed `ActionResult` union drives all client-side routing.

**Tech Stack:** Next.js 14 App Router, TypeScript, Drizzle ORM, Zod, Vitest, native `<dialog>` element.

**Spec:** `../../docs/superpowers/specs/2026-04-10-token-revocation-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/app/dashboard/actions.ts` | Add `ActionResult` type + `revokeToken` server action |
| `src/app/dashboard/TokenRow.tsx` | **New** — `"use client"` component for a single token row |
| `src/app/dashboard/page.tsx` | Replace inline token `<li>` map with `<TokenRow>` instances |
| `tests/app/dashboard/actions.test.ts` | **New** — unit tests for `revokeToken` |

---

## Task 1: Add `ActionResult` type and `revokeToken` server action

**Files:**
- Modify: `src/app/dashboard/actions.ts`
- Create: `tests/app/dashboard/actions.test.ts`

### Step 1.1 — Write failing tests
- [ ] Create `tests/app/dashboard/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAuth, mockDbSelect, mockDbDelete } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbDelete: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => mockDbSelect(),
    delete: () => mockDbDelete(),
  },
}))

import { revokeToken } from '@/app/dashboard/actions'

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TENANT_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

beforeEach(() => vi.clearAllMocks())

describe('revokeToken', () => {
  it('returns VALIDATION_ERROR for a non-UUID id', async () => {
    const result = await revokeToken('not-a-uuid')
    expect(result).toEqual({ ok: false, code: 'VALIDATION_ERROR', error: 'Invalid request.' })
  })

  it('returns AUTH_ERROR when session is absent', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' })
  })

  it('returns AUTH_ERROR when session has no tenantId', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' })
  })

  it('returns AUTH_ERROR when token is not found', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: () => [] }) }) })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' })
  })

  it('returns AUTH_ERROR when token belongs to a different tenant', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ id: VALID_UUID, tenantId: 'other-tenant' }] }) }),
    })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' })
  })

  it('returns TRANSIENT_ERROR on DB delete failure', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ id: VALID_UUID, tenantId: TENANT_ID }] }) }),
    })
    mockDbDelete.mockReturnValue({ where: () => { throw new Error('db down') } })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'TRANSIENT_ERROR', error: 'Failed to delete token. Please try again.' })
  })

  it('returns ok:true with redirect on success', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ id: VALID_UUID, tenantId: TENANT_ID }] }) }),
    })
    mockDbDelete.mockReturnValue({ where: () => Promise.resolve() })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: true, redirect: '/dashboard' })
  })
})
```

### Step 1.2 — Run tests to confirm they fail
- [ ] Run: `npx vitest run tests/app/dashboard/actions.test.ts`
- Expected: **FAIL** — `revokeToken` does not exist yet

### Step 1.3 — Implement `ActionResult` type and `revokeToken`

`src/app/dashboard/actions.ts` already has `'use server'` as a **file-level directive on line 1** — do not add it again. Append the following below the existing imports and `handleSignOut` export. Do **not** add a second `'use server'` directive inside the function body.

```ts
// --- append below existing content ---
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { apiTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type ActionResult =
  | { ok: true; redirect: string }
  | { ok: false; code: 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'TRANSIENT_ERROR'; error: string }

export async function revokeToken(id: string): Promise<ActionResult> {
  // 1. Validate input
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Invalid request.' }
  }

  // 2. Auth check
  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId
  if (!tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' }
  }

  // 3. Ownership check — same message for not-found and wrong-tenant (no leakage)
  const [token] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.id, id))
    .limit(1)

  if (!token || token.tenantId !== tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' }
  }

  // 4. Delete
  try {
    await db.delete(apiTokens).where(eq(apiTokens.id, id))
  } catch {
    return { ok: false, code: 'TRANSIENT_ERROR', error: 'Failed to delete token. Please try again.' }
  }

  return { ok: true, redirect: '/dashboard' }
}
```

Note: The existing import line is `import { signOut } from '@/lib/auth'` — extend it to `import { signOut, auth } from '@/lib/auth'`. Do not add a second import line. Only add the imports for `z`, `db`, `apiTokens`, and `eq` if they are not already present.

### Step 1.4 — Run tests to confirm they pass
- [ ] Run: `npx vitest run tests/app/dashboard/actions.test.ts`
- Expected: **PASS** — all 7 tests green

### Step 1.5 — Lint and type-check
- [ ] Run: `npm run lint:fix && npx tsc --noEmit`
- Expected: no errors

---

## Task 2: Create `TokenRow` client component

**Files:**
- Create: `src/app/dashboard/TokenRow.tsx`

> Note: `TokenRow` is a client component using `<dialog>`, `useRouter`, and `useRef`. Vitest can unit-test the server action but testing this component would require a DOM environment with jsdom and `@testing-library/react`. That setup is not currently in this project — visual verification in the browser is the test strategy here (per spec).

> Note on `router.push`: In Next.js 14, `router.push()` returns `void`, not a `Promise`. It cannot be awaited for completion and will not throw on navigation failure. The `try/catch` around `router.push` below is a no-op for true navigation errors, but it is kept as a defensive wrapper in case future Next.js versions change this. The modal remains open with buttons disabled after a successful delete until the page unmounts — this is intentional.

### Step 2.1 — Create `TokenRow.tsx`
- [ ] Create `src/app/dashboard/TokenRow.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { revokeToken, type ActionResult } from './actions'

interface TokenRowProps {
  token: {
    id: string
    label: string
    createdAt: string
    lastUsedAt: string | null
  }
}

export function TokenRow({ token }: TokenRowProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const trashRef = useRef<HTMLButtonElement>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setError(null)
    setIsModalOpen(true)
    dialogRef.current?.showModal()
    // Move focus to Cancel button (safe default for destructive action)
    setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
    }, 0)
  }

  function closeModal() {
    setError(null)        // spec: error resets on close
    setIsModalOpen(false)
    dialogRef.current?.close()
    trashRef.current?.focus()
  }

  async function handleDelete() {
    setIsSubmitting(true)
    let result: ActionResult
    try {
      result = await revokeToken(token.id)
    } catch {
      setIsSubmitting(false)
      setError('Failed to delete token. Please try again.')
      return
    }

    if (result.ok) {
      // router.push returns void in Next.js 14 and will not throw on navigation failure.
      // The try/catch is a defensive no-op today but satisfies the spec's explicit
      // "navigation failed" error path requirement.
      try {
        router.push(result.redirect)
      } catch {
        setIsSubmitting(false)
        setError('Navigation failed. Please refresh the page.')
      }
      return
    }

    if (result.code === 'AUTH_ERROR') {
      closeModal()
      router.push('/api/auth/signin')
      return
    }

    // TRANSIENT_ERROR or VALIDATION_ERROR — show in modal, allow retry
    setIsSubmitting(false)
    setError(result.error)
  }

  return (
    <li style={{
      backgroundColor: '#111',
      padding: '0.8rem',
      marginBottom: '0.5rem',
      border: '1px solid #222',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      {/* Row content */}
      <div>
        <strong style={{ color: '#fff' }}>{token.label}</strong><br />
        <span style={{ fontSize: '0.7rem', color: '#666' }}>Created {token.createdAt}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* lastUsedAt indicator */}
        <span style={{ fontSize: '0.7rem', color: '#666' }}>
          {token.lastUsedAt ? `Last used: ${token.lastUsedAt}` : 'Never used'}
        </span>

        {/* Trash icon */}
        <button
          ref={trashRef}
          onClick={openModal}
          title="Revoke token"
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0.2rem 0.4rem',
            lineHeight: 1,
          }}
          aria-label={`Revoke token ${token.label}`}
        >
          🗑
        </button>
      </div>

      {/* Confirmation modal */}
      <dialog
        ref={dialogRef}
        aria-labelledby={`dialog-title-${token.id}`}
        aria-modal="true"
        onCancel={(e) => {
          if (isSubmitting) { e.preventDefault(); return }
          closeModal()
        }}
        onKeyDown={(e) => {
          // Belt-and-suspenders: suppress Escape at keydown level too (onCancel alone
          // is unreliable across browsers when isSubmitting)
          if (e.key === 'Escape' && isSubmitting) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        style={{
          background: '#000',
          border: '2px solid #ff0000',
          color: '#fff',
          fontFamily: 'monospace',
          padding: '1.5rem',
          minWidth: '320px',
          maxWidth: '90vw',
        }}
      >
        <h2 id={`dialog-title-${token.id}`} style={{ color: '#ff0000', marginTop: 0, fontSize: '1rem' }}>
          Delete token
        </h2>
        <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          Are you sure you want to delete <strong style={{ color: '#fff' }}>{token.label}</strong>?
          This cannot be undone.
        </p>

        {error && (
          <p style={{ color: '#ff0000', fontSize: '0.8rem', margin: '0 0 1rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            data-cancel
            onClick={closeModal}
            disabled={isSubmitting}
            style={{
              background: '#333',
              color: '#fff',
              border: '1px solid #444',
              padding: '0.4rem 0.8rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? '#660000' : '#ff0000',
              color: '#fff',
              border: 'none',
              padding: '0.4rem 0.8rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
            }}
          >
            {isSubmitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </dialog>
    </li>
  )
}
```

### Step 2.2 — Lint and type-check
- [ ] Run: `npm run lint:fix && npx tsc --noEmit`
- Expected: no errors

---

## Task 3: Wire `TokenRow` into `dashboard/page.tsx`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

### Step 3.1 — Update the token list rendering
- [ ] In `src/app/dashboard/page.tsx`, add the import near the top with the other local imports:

```ts
import { TokenRow } from './TokenRow'
```

- [ ] Replace the entire `<ul>` block (the `tokens.map(...)` section) with:

```tsx
<ul style={{ listStyle: 'none', padding: '0', fontSize: '0.9rem' }}>
  {tokens.map((t) => (
    <TokenRow
      key={t.id}
      token={{
        id: t.id,
        label: t.label,
        createdAt: t.createdAt.toISOString(),
        lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      }}
    />
  ))}
</ul>
```

- [ ] Update the section heading — change:
  ```tsx
  <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
    Active tokens ({tokens.filter((t) => !t.revokedAt).length})
  </h3>
  ```
  to:
  ```tsx
  <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
    Tokens ({tokens.length})
  </h3>
  ```

### Step 3.2 — Lint and type-check
- [ ] Run: `npm run lint:fix && npx tsc --noEmit`
- Expected: no errors

### Step 3.3 — Run full test suite to confirm no regressions
- [ ] Run: `npx vitest run`
- Expected: all tests pass including the new `actions.test.ts`

### Step 3.4 — Manual browser verification
- [ ] Run: `npm run dev`
- [ ] Open `http://localhost:3000/dashboard`
- [ ] Verify each token row shows:
  - Label (bold)
  - Created date
  - "Never used" or "Last used: …" — **not** ACTIVE/REVOKED
  - Trash icon `🗑` with tooltip on hover
- [ ] Click trash icon → modal opens, focus is on Cancel button
- [ ] Press Escape → modal closes, focus returns to trash icon
- [ ] Click trash icon again → modal opens clean (no stale error)
- [ ] Click Delete → button shows "Deleting…", both buttons disabled
- [ ] Confirm token disappears from the list after navigation

### Step 3.5 — Commit everything
- [ ] `git add src/app/dashboard/actions.ts src/app/dashboard/TokenRow.tsx src/app/dashboard/page.tsx tests/app/dashboard/actions.test.ts`
- [ ] `git commit -m "feat(dashboard): token revocation — trash icon, delete modal, lastUsedAt indicator"`
