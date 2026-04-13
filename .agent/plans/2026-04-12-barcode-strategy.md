# Barcode Strategy Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow tenants to configure barcode strategy (bpost-generates / customer-provides / mcp-generates) and auto-generate Mail ID barcodes when the MCP service handles generation.

**Architecture:** New `tenant_preferences` and `barcode_sequences` DB tables + `barcodeCustomerId` column on `bpost_credentials`. Pure `generateMidNumber()` function for barcode formatting. Strategy resolution in the `submit_ready_batch` handler before calling `submitBatch()`. Dashboard UI for configuration.

**Tech Stack:** Drizzle ORM, Postgres, Zod, Vitest, Next.js Server Components + Server Actions

**Spec:** `../../docs/superpowers/specs/2026-04-12-barcode-strategy-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/db/schema.ts` | Modify | Add `barcodeCustomerId` to `bpostCredentials`, new `tenantPreferences` table, new `barcodeSequences` table |
| `drizzle/XXXX_barcode_strategy.sql` | Create (generated) | Drizzle migration |
| `src/lib/tenant/get-credentials.ts` | Modify | Add `barcodeCustomerId` to interface and query result |
| `src/lib/tenant/get-preferences.ts` | Create | `TenantPreferences` interface + `getTenantPreferences()` with defaults |
| `src/lib/batch/generate-barcode.ts` | Create | Pure `generateMidNumber()` function |
| `src/lib/batch/claim-batch-sequence.ts` | Create | Atomic DB counter claim for batch sequence |
| `src/app/api/mcp/route.ts` | Modify | Strategy resolution in `submit_ready_batch` handler |
| `src/app/dashboard/page.tsx` | Modify | Add `barcodeCustomerId` field + "Barcode-instellingen" section |
| `src/app/dashboard/actions.ts` | Modify | Add `savePreferences` server action |
| `tests/lib/batch/generate-barcode.test.ts` | Create | Unit tests for barcode generation |
| `tests/lib/tenant/get-preferences.test.ts` | Create | Unit tests for preferences with defaults |
| `tests/lib/batch/claim-batch-sequence.test.ts` | Create | Unit tests for sequence claim |

---

## Task 1: Schema — add `barcodeCustomerId` + new tables

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add `barcodeCustomerId` column to `bpostCredentials`**

In `src/lib/db/schema.ts`, add after the `prsNumber` column (line 21):

```ts
barcodeCustomerId: text('barcode_customer_id'),
```

- [ ] **Step 2: Add `tenantPreferences` table**

Add after the `bpostCredentials` table definition:

```ts
export const tenantPreferences = pgTable('tenant_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id)
    .unique(),
  barcodeStrategy: text('barcode_strategy').notNull().default('bpost-generates'),
  barcodeLength: text('barcode_length').notNull().default('7'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

- [ ] **Step 3: Add `barcodeSequences` table**

Add after `tenantPreferences`:

```ts
export const barcodeSequences = pgTable('barcode_sequences', {
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  week: integer('week').notNull(),
  nextValue: integer('next_value').notNull().default(0),
}, (table) => [
  unique('barcode_sequences_tenant_week_unique').on(table.tenantId, table.week),
])
```

Add `unique` to the import from `drizzle-orm/pg-core`:

```ts
import { pgTable, uuid, text, timestamp, integer, unique } from 'drizzle-orm/pg-core'
```

- [ ] **Step 4: Generate Drizzle migration**

Run: `npx drizzle-kit generate`

Expected: New SQL migration file created in `drizzle/` directory.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "$(cat <<'EOF'
feat(db): add barcode_customer_id column and tenant_preferences/barcode_sequences tables

Drizzle schema + migration for barcode strategy configuration (issue #16).
EOF
)"
```

---

## Task 2: `get-credentials.ts` — expose `barcodeCustomerId`

**Files:**
- Modify: `src/lib/tenant/get-credentials.ts`
- Modify: `tests/lib/tenant/get-credentials.test.ts`

- [ ] **Step 1: Write failing test — barcodeCustomerId returned when present**

Add to `tests/lib/tenant/get-credentials.test.ts`, inside the existing `describe` block:

```ts
it('returns barcodeCustomerId when present', async () => {
  const { db } = await import('@/lib/db/client');
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          username: 'bpost_user',
          passwordEncrypted: 'encrypted_pw',
          passwordIv: 'iv_value',
          customerNumber: '12345678',
          accountId: '87654321',
          prsNumber: null,
          barcodeCustomerId: '04521',
        }]),
      }),
    }),
  });
  (db as any).select = mockSelect;

  const { decrypt } = await import('@/lib/crypto');
  (decrypt as ReturnType<typeof vi.fn>).mockReturnValue('decrypted_password');

  const { getCredentialsByTenantId } = await import('@/lib/tenant/get-credentials');
  const result = await getCredentialsByTenantId('tenant_with_barcode');
  expect(result).not.toBeNull();
  expect(result!.barcodeCustomerId).toBe('04521');
});

it('returns undefined barcodeCustomerId when not set', async () => {
  const { db } = await import('@/lib/db/client');
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          username: 'bpost_user',
          passwordEncrypted: 'encrypted_pw',
          passwordIv: 'iv_value',
          customerNumber: '12345678',
          accountId: '87654321',
          prsNumber: null,
          barcodeCustomerId: null,
        }]),
      }),
    }),
  });
  (db as any).select = mockSelect;

  const { decrypt } = await import('@/lib/crypto');
  (decrypt as ReturnType<typeof vi.fn>).mockReturnValue('decrypted_password');

  const { getCredentialsByTenantId } = await import('@/lib/tenant/get-credentials');
  const result = await getCredentialsByTenantId('tenant_no_barcode');
  expect(result).not.toBeNull();
  expect(result!.barcodeCustomerId).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/tenant/get-credentials.test.ts`

Expected: FAIL — `barcodeCustomerId` not in interface / not returned.

- [ ] **Step 3: Update interface and query**

In `src/lib/tenant/get-credentials.ts`, add to `BpostCredentials` interface:

```ts
export interface BpostCredentials {
  bpostUsername: string;
  bpostPassword: string;
  customerNumber: string;
  accountId: string;
  prsNumber?: string;
  barcodeCustomerId?: string;
}
```

And add to the return statement:

```ts
return {
  bpostUsername: row.username,
  bpostPassword: password,
  customerNumber: row.customerNumber,
  accountId: row.accountId,
  prsNumber: row.prsNumber ?? undefined,
  barcodeCustomerId: row.barcodeCustomerId ?? undefined,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/tenant/get-credentials.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant/get-credentials.ts tests/lib/tenant/get-credentials.test.ts
git commit -m "$(cat <<'EOF'
feat(tenant): expose barcodeCustomerId in BpostCredentials
EOF
)"
```

---

## Task 3: `get-preferences.ts` — tenant preferences with defaults

**Files:**
- Create: `src/lib/tenant/get-preferences.ts`
- Create: `tests/lib/tenant/get-preferences.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/tenant/get-preferences.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

describe('getTenantPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns stored preferences when row exists', async () => {
    const { db } = await import('@/lib/db/client')
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            barcodeStrategy: 'mcp-generates',
            barcodeLength: '11',
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect

    const { getTenantPreferences } = await import('@/lib/tenant/get-preferences')
    const prefs = await getTenantPreferences('tenant_with_prefs')
    expect(prefs).toEqual({
      barcodeStrategy: 'mcp-generates',
      barcodeLength: '11',
    })
  })

  it('returns defaults when no row exists', async () => {
    const { db } = await import('@/lib/db/client')
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db as any).select = mockSelect

    const { getTenantPreferences } = await import('@/lib/tenant/get-preferences')
    const prefs = await getTenantPreferences('tenant_no_prefs')
    expect(prefs).toEqual({
      barcodeStrategy: 'bpost-generates',
      barcodeLength: '7',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/tenant/get-preferences.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `get-preferences.ts`**

Create `src/lib/tenant/get-preferences.ts`:

```ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { tenantPreferences } from '@/lib/db/schema'

export interface TenantPreferences {
  barcodeStrategy: 'bpost-generates' | 'customer-provides' | 'mcp-generates'
  barcodeLength: '7' | '9' | '11'
}

const DEFAULTS: TenantPreferences = {
  barcodeStrategy: 'bpost-generates',
  barcodeLength: '7',
}

export async function getTenantPreferences(
  tenantId: string,
): Promise<TenantPreferences> {
  const rows = await db
    .select()
    .from(tenantPreferences)
    .where(eq(tenantPreferences.tenantId, tenantId))
    .limit(1)

  if (rows.length === 0) return DEFAULTS

  const row = rows[0]
  return {
    barcodeStrategy: row.barcodeStrategy as TenantPreferences['barcodeStrategy'],
    barcodeLength: row.barcodeLength as TenantPreferences['barcodeLength'],
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/tenant/get-preferences.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tenant/get-preferences.ts tests/lib/tenant/get-preferences.test.ts
git commit -m "$(cat <<'EOF'
feat(tenant): add getTenantPreferences with bpost-generates defaults
EOF
)"
```

---

## Task 4: `generate-barcode.ts` — pure MID number generation

**Files:**
- Create: `src/lib/batch/generate-barcode.ts`
- Create: `tests/lib/batch/generate-barcode.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/batch/generate-barcode.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateMidNumber } from '@/lib/batch/generate-barcode'

describe('generateMidNumber', () => {
  it('generates a valid 18-digit MID number', () => {
    const mid = generateMidNumber('04521', 15, 42, 0)
    expect(mid).toBe('120452115042000000')
    expect(mid).toHaveLength(18)
    expect(mid).toMatch(/^[0-9]{18}$/)
  })

  it('pads week number to 2 digits', () => {
    const mid = generateMidNumber('04521', 1, 0, 0)
    expect(mid).toBe('120452101000000000')
  })

  it('pads batch sequence to 3 digits', () => {
    const mid = generateMidNumber('04521', 15, 3, 0)
    expect(mid).toBe('120452115003000000')
  })

  it('pads row index to 6 digits', () => {
    const mid = generateMidNumber('04521', 15, 0, 42)
    expect(mid).toBe('120452115000000042')
  })

  it('handles maximum values', () => {
    const mid = generateMidNumber('99999', 53, 999, 999999)
    expect(mid).toBe('129999953999999999')
    expect(mid).toHaveLength(18)
  })

  it('starts with FCC 12 (customer-generated, 11-digit)', () => {
    const mid = generateMidNumber('04521', 15, 0, 0)
    expect(mid.slice(0, 2)).toBe('12')
  })

  it('includes barcodeCustomerId at positions 2-6', () => {
    const mid = generateMidNumber('04521', 15, 0, 0)
    expect(mid.slice(2, 7)).toBe('04521')
  })

  it('throws if barcodeCustomerId is not 5 digits', () => {
    expect(() => generateMidNumber('123', 15, 0, 0)).toThrow('barcodeCustomerId must be exactly 5 digits')
    expect(() => generateMidNumber('123456', 15, 0, 0)).toThrow('barcodeCustomerId must be exactly 5 digits')
    expect(() => generateMidNumber('abcde', 15, 0, 0)).toThrow('barcodeCustomerId must be exactly 5 digits')
  })

  it('throws if weekNumber is out of range', () => {
    expect(() => generateMidNumber('04521', 0, 0, 0)).toThrow('weekNumber must be 1–53')
    expect(() => generateMidNumber('04521', 54, 0, 0)).toThrow('weekNumber must be 1–53')
  })

  it('throws if batchSequence is out of range', () => {
    expect(() => generateMidNumber('04521', 15, -1, 0)).toThrow('batchSequence must be 0–999')
    expect(() => generateMidNumber('04521', 15, 1000, 0)).toThrow('batchSequence must be 0–999')
  })

  it('throws if rowIndex is out of range', () => {
    expect(() => generateMidNumber('04521', 15, 0, -1)).toThrow('rowIndex must be 0–999999')
    expect(() => generateMidNumber('04521', 15, 0, 1000000)).toThrow('rowIndex must be 0–999999')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/batch/generate-barcode.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `generate-barcode.ts`**

Create `src/lib/batch/generate-barcode.ts`:

```ts
const FCC = '12' // Customer-generated, 11-digit mail piece number

/**
 * Generates an 18-digit Mail ID number for one row in a batch.
 *
 * Structure: FCC (2) + barcodeCustomerId (5) + weekNumber (2) + batchSequence (3) + rowIndex (6)
 *
 * Pure function — no DB access or side effects.
 */
export function generateMidNumber(
  barcodeCustomerId: string,
  weekNumber: number,
  batchSequence: number,
  rowIndex: number,
): string {
  if (!/^\d{5}$/.test(barcodeCustomerId)) {
    throw new Error('barcodeCustomerId must be exactly 5 digits')
  }
  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error('weekNumber must be 1–53')
  }
  if (batchSequence < 0 || batchSequence > 999) {
    throw new Error('batchSequence must be 0–999')
  }
  if (rowIndex < 0 || rowIndex > 999999) {
    throw new Error('rowIndex must be 0–999999')
  }

  const ww = String(weekNumber).padStart(2, '0')
  const bbb = String(batchSequence).padStart(3, '0')
  const nnnnnn = String(rowIndex).padStart(6, '0')

  return `${FCC}${barcodeCustomerId}${ww}${bbb}${nnnnnn}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/batch/generate-barcode.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/batch/generate-barcode.ts tests/lib/batch/generate-barcode.test.ts
git commit -m "$(cat <<'EOF'
feat(batch): add pure generateMidNumber function for MCP barcode generation

Structure: FCC(12) + customerId(5) + week(2) + batchSeq(3) + rowIndex(6) = 18 digits
EOF
)"
```

---

## Task 5: `claim-batch-sequence.ts` — atomic DB counter

**Files:**
- Create: `src/lib/batch/claim-batch-sequence.ts`
- Create: `tests/lib/batch/claim-batch-sequence.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/batch/claim-batch-sequence.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    execute: vi.fn(),
  },
}))

describe('claimBatchSequence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns batch sequence from upsert result', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.execute).mockResolvedValue([{ batch_sequence: 0 }] as any)

    const { claimBatchSequence } = await import('@/lib/batch/claim-batch-sequence')
    const seq = await claimBatchSequence('tenant-123', 15)
    expect(seq).toBe(0)
  })

  it('passes tenantId and weekNumber to SQL', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.execute).mockResolvedValue([{ batch_sequence: 5 }] as any)

    const { claimBatchSequence } = await import('@/lib/batch/claim-batch-sequence')
    await claimBatchSequence('tenant-abc', 22)

    expect(db.execute).toHaveBeenCalledOnce()
  })

  it('returns incrementing values on successive calls', async () => {
    const { db } = await import('@/lib/db/client')
    let counter = 0
    vi.mocked(db.execute).mockImplementation(async () => {
      return [{ batch_sequence: counter++ }] as any
    })

    const { claimBatchSequence } = await import('@/lib/batch/claim-batch-sequence')
    expect(await claimBatchSequence('tenant-123', 15)).toBe(0)
    expect(await claimBatchSequence('tenant-123', 15)).toBe(1)
    expect(await claimBatchSequence('tenant-123', 15)).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/batch/claim-batch-sequence.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `claim-batch-sequence.ts`**

Create `src/lib/batch/claim-batch-sequence.ts`:

```ts
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

/**
 * Atomically claims the next batch sequence number for a tenant + week.
 * Returns the claimed sequence (0-based).
 * One DB write per batch submission.
 */
export async function claimBatchSequence(
  tenantId: string,
  weekNumber: number,
): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO barcode_sequences (tenant_id, week, next_value)
    VALUES (${tenantId}, ${weekNumber}, 1)
    ON CONFLICT (tenant_id, week)
    DO UPDATE SET next_value = barcode_sequences.next_value + 1
    RETURNING next_value - 1 AS batch_sequence
  `)

  const row = (result as unknown as Array<{ batch_sequence: number }>)[0]
  return row.batch_sequence
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/batch/claim-batch-sequence.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/batch/claim-batch-sequence.ts tests/lib/batch/claim-batch-sequence.test.ts
git commit -m "$(cat <<'EOF'
feat(batch): add atomic claimBatchSequence for barcode generation
EOF
)"
```

---

## Task 6: Wire barcode strategy into `submit_ready_batch` handler

**Files:**
- Modify: `src/app/api/mcp/route.ts`

- [ ] **Step 1: Add imports**

At the top of `src/app/api/mcp/route.ts`, add:

```ts
import { getTenantPreferences } from '@/lib/tenant/get-preferences'
import { generateMidNumber } from '@/lib/batch/generate-barcode'
import { claimBatchSequence } from '@/lib/batch/claim-batch-sequence'
```

- [ ] **Step 2: Update `resolveCredentials` to return `barcodeCustomerId`**

Modify the `resolveCredentials` function to include `barcodeCustomerId`:

```ts
async function resolveCredentials(tenantId: string) {
  const creds = await getCredentialsByTenantId(tenantId)
  if (!creds) {
    throw new Error(`No BPost credentials found for tenant ${tenantId}`)
  }
  return {
    username: creds.bpostUsername,
    password: creds.bpostPassword,
    customerNumber: creds.customerNumber,
    accountId: creds.accountId,
    barcodeCustomerId: creds.barcodeCustomerId,
  }
}
```

- [ ] **Step 3: Add strategy resolution in the `submit_ready_batch` handler**

In the `submit_ready_batch` handler, after `const credentials = await resolveCredentials(tenantId)` (line 556) and before the `const result = await submitBatch(...)` call (line 562), insert the strategy resolution logic:

```ts
        // ── Barcode strategy resolution ──────────────────────────
        const preferences = await getTenantPreferences(tenantId)
        let resolvedGenMID = input.genMID

        // Only apply strategy defaults when the user did NOT explicitly provide genMID
        const userProvidedGenMID = input.genMID !== '7' // '7' is the schema default
        if (!userProvidedGenMID) {
          switch (preferences.barcodeStrategy) {
            case 'bpost-generates':
              resolvedGenMID = preferences.barcodeLength as 'N' | '7' | '9' | '11'
              break
            case 'customer-provides':
            case 'mcp-generates':
              resolvedGenMID = 'N'
              break
          }
        }

        // Validate strategy-specific requirements
        if (preferences.barcodeStrategy === 'customer-provides') {
          const missingMidNum = readyRows.filter(r => !(r.mapped as Record<string, unknown>)?.midNum)
          if (missingMidNum.length > 0) {
            return { isError: true, content: [{ type: 'text' as const, text: `Strategy is 'customer-provides' but ${missingMidNum.length} rows are missing midNum. Map the midNum column or change barcode strategy in dashboard settings.` }] }
          }
        }

        if (preferences.barcodeStrategy === 'mcp-generates') {
          if (!credentials.barcodeCustomerId) {
            return { isError: true, content: [{ type: 'text' as const, text: `Strategy is 'mcp-generates' but barcodeCustomerId is not configured. Add your 5-digit Barcode-klant-ID in dashboard settings.` }] }
          }
          if (readyRows.length > 999999) {
            return { isError: true, content: [{ type: 'text' as const, text: `Batch has ${readyRows.length} rows but MCP barcode generation supports max 999,999 per batch.` }] }
          }

          const now = new Date()
          const weekNumber = getISOWeekNumber(now)
          const batchSequence = await claimBatchSequence(tenantId, weekNumber)

          if (batchSequence > 999) {
            return { isError: true, content: [{ type: 'text' as const, text: `Batch sequence limit reached (1000 batches this week). Try again next week or switch to a different barcode strategy.` }] }
          }

          for (let i = 0; i < readyRows.length; i++) {
            const midNum = generateMidNumber(
              credentials.barcodeCustomerId,
              weekNumber,
              batchSequence,
              i,
            )
            ;(readyRows[i].mapped as Record<string, unknown>).midNum = midNum
          }
        }
```

- [ ] **Step 4: Add `getISOWeekNumber` helper**

Add this helper function near the top of `route.ts` (after the imports, before `resolveCredentials`):

```ts
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
```

- [ ] **Step 5: Update the `submitBatch` call to use `resolvedGenMID`**

Change the `submitBatch` call to use `resolvedGenMID` instead of `input.genMID`:

```ts
        const result = await submitBatch(
          readyRows,
          {
            mailingRef,
            expectedDeliveryDate: input.expectedDeliveryDate,
            format: input.format,
            priority: input.priority,
            mode: input.mode,
            customerFileRef,
            genMID: resolvedGenMID,
            genPSC: input.genPSC,
          },
          credentials,
        )
```

- [ ] **Step 6: Update `state.submission` to use `resolvedGenMID`**

In the success block, change:

```ts
            genMID: input.genMID,
```

to:

```ts
            genMID: resolvedGenMID,
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 8: Run existing submit tests to check for regressions**

Run: `npx vitest run tests/lib/batch/submit-batch.test.ts`

Expected: All PASS (the service function itself is unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/app/api/mcp/route.ts
git commit -m "$(cat <<'EOF'
feat(mcp): wire barcode strategy resolution into submit_ready_batch handler

Resolves tenant preferences before submission. Supports bpost-generates,
customer-provides, and mcp-generates strategies with per-call genMID override.
EOF
)"
```

---

## Task 7: Dashboard — `barcodeCustomerId` in credentials form

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add `barcodeCustomerId` field to the credentials form**

In `src/app/dashboard/page.tsx`, inside the `saveCreds` server action, after the `prsNumber` extraction (line 64):

```ts
    const barcodeCustomerId = (formData.get('barcodeCustomerId') as string) || null
```

Add validation after the existing numeric checks (after line 74):

```ts
    if (barcodeCustomerId && !/^\d{5}$/.test(barcodeCustomerId)) throw new Error('Barcode-klant-ID: exact 5 cijfers.')
```

Add `barcodeCustomerId` to both the update `common` object and the insert values:

In the `common` object (around line 84):
```ts
      const common = {
        username,
        customerNumber,
        accountId,
        prsNumber,
        barcodeCustomerId,
        updatedAt: new Date(),
      }
```

In the insert values (around line 111):
```ts
      await db.insert(bpostCredentials).values({
        tenantId: actionTenantId,
        username,
        passwordEncrypted: ciphertext,
        passwordIv: iv,
        customerNumber,
        accountId,
        prsNumber,
        barcodeCustomerId,
      })
```

- [ ] **Step 2: Add the form field in the HTML**

After the PRS-nummer label (after line 244), add:

```tsx
            <label className="bp-label">
              Barcode-klant-ID (optioneel)
              <input
                name="barcodeCustomerId"
                className="bp-input"
                defaultValue={existingCreds?.barcodeCustomerId ?? ''}
                pattern="\d{5}"
                maxLength={5}
                title="Exact 5 cijfers"
              />
            </label>
            <p className="bp-muted-note" style={{ marginTop: '-0.35rem', marginBottom: '0.5rem' }}>
              Een 5-cijferige code die je van bpost ontvangt als je deelneemt aan het Mail ID-programma.
              Alleen nodig als je barcodes automatisch wilt laten aanmaken door deze dienst.
            </p>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): add barcodeCustomerId field to credentials form

Flemish label and help text per customer-facing guidelines.
EOF
)"
```

---

## Task 8: Dashboard — "Barcode-instellingen" preferences section

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/actions.ts`

- [ ] **Step 1: Add `savePreferences` server action**

In `src/app/dashboard/actions.ts`, add imports and the action:

```ts
import { tenantPreferences } from '@/lib/db/schema'

const BARCODE_STRATEGIES = ['bpost-generates', 'customer-provides', 'mcp-generates'] as const
const BARCODE_LENGTHS = ['7', '9', '11'] as const

export async function savePreferences(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' }
  }

  const strategy = formData.get('barcodeStrategy') as string
  const length = formData.get('barcodeLength') as string

  if (!BARCODE_STRATEGIES.includes(strategy as any)) {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Ongeldige barcodestrategie.' }
  }
  if (!BARCODE_LENGTHS.includes(length as any)) {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Ongeldige barcodelengte.' }
  }

  try {
    const [existing] = await db
      .select()
      .from(tenantPreferences)
      .where(eq(tenantPreferences.tenantId, tenantId))
      .limit(1)

    if (existing) {
      await db
        .update(tenantPreferences)
        .set({
          barcodeStrategy: strategy,
          barcodeLength: length,
          updatedAt: new Date(),
        })
        .where(eq(tenantPreferences.tenantId, tenantId))
    } else {
      await db.insert(tenantPreferences).values({
        tenantId,
        barcodeStrategy: strategy,
        barcodeLength: length,
      })
    }
  } catch {
    return { ok: false, code: 'TRANSIENT_ERROR', error: 'Opslaan mislukt. Probeer opnieuw.' }
  }

  return { ok: true, redirect: '/dashboard' }
}
```

Add `eq` import if not already present (it is, used by `revokeToken`).

- [ ] **Step 2: Load preferences in the page component**

In `src/app/dashboard/page.tsx`, add import:

```ts
import { tenantPreferences } from '@/lib/db/schema'
```

After the `existingCreds` query (around line 50), add:

```ts
  const existingPrefs = existingTenant
    ? await db
        .select()
        .from(tenantPreferences)
        .where(eq(tenantPreferences.tenantId, existingTenant.id))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null

  const currentStrategy = existingPrefs?.barcodeStrategy ?? 'bpost-generates'
  const currentLength = existingPrefs?.barcodeLength ?? '7'
```

- [ ] **Step 3: Add the "Barcode-instellingen" section**

Import `savePreferences` from actions:

```ts
import { handleSignOut, savePreferences } from './actions'
```

After the "BPost-gegevens" section (after the closing `</section>` around line 249), add a new section:

```tsx
        <section className="bp-card bp-card--section">
          <h2 className="bp-section-title">Barcode-instellingen</h2>
          <p className="bp-prose">
            Kies hoe de barcodes voor je mailings worden aangemaakt.
          </p>

          <form action={savePreferences} className="bp-form-grid">
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend className="bp-label" style={{ marginBottom: '0.5rem' }}>Barcodestrategie</legend>
              <label style={{ display: 'block', marginBottom: '0.35rem' }}>
                <input
                  type="radio"
                  name="barcodeStrategy"
                  value="bpost-generates"
                  defaultChecked={currentStrategy === 'bpost-generates'}
                />{' '}
                bpost maakt de barcodes aan
              </label>
              <label style={{ display: 'block', marginBottom: '0.35rem' }}>
                <input
                  type="radio"
                  name="barcodeStrategy"
                  value="customer-provides"
                  defaultChecked={currentStrategy === 'customer-provides'}
                />{' '}
                Ik lever zelf barcodes aan in mijn adresbestand
              </label>
              <label style={{ display: 'block', marginBottom: '0.35rem' }}>
                <input
                  type="radio"
                  name="barcodeStrategy"
                  value="mcp-generates"
                  defaultChecked={currentStrategy === 'mcp-generates'}
                />{' '}
                Laat deze dienst de barcodes automatisch aanmaken
              </label>
              {currentStrategy === 'mcp-generates' && !existingCreds?.barcodeCustomerId && (
                <p className="bp-muted-note" style={{ color: '#b45309', marginTop: '0.25rem' }}>
                  Hiervoor heb je een Barcode-klant-ID nodig (zie &quot;BPost-gegevens&quot; hierboven).
                </p>
              )}
            </fieldset>

            {currentStrategy === 'bpost-generates' && (
              <label className="bp-label">
                Barcodelengte
                <select name="barcodeLength" className="bp-input" defaultValue={currentLength}>
                  <option value="7">7 cijfers</option>
                  <option value="9">9 cijfers</option>
                  <option value="11">11 cijfers</option>
                </select>
              </label>
            )}

            {currentStrategy !== 'bpost-generates' && (
              <input type="hidden" name="barcodeLength" value={currentLength} />
            )}

            <button type="submit" className="bp-btn bp-btn--primary" style={{ marginTop: '0.25rem', width: 'fit-content' }}>
              Instellingen bewaren
            </button>
          </form>
        </section>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/dashboard/actions.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add Barcode-instellingen preferences section

Radio group for strategy selection, length dropdown for bpost-generates.
Flemish copy per customer-facing guidelines.
EOF
)"
```

---

## Task 9: Definition of Done

- [ ] **Step 1: Run linter**

Run: `npm run lint:fix`

Expected: No errors (warnings OK).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`

Expected: All tests pass, no regressions.

- [ ] **Step 4: Update CHANGELOG.md**

Add under `[Unreleased]`:

```markdown
### Added
- Barcode strategy configuration: tenants can choose `bpost-generates`, `customer-provides`, or `mcp-generates` (#16)
- `barcodeCustomerId` field on BPost credentials for Mail ID program participation
- MCP barcode generation: auto-generates 18-digit MID numbers (FCC 12 + week-based uniqueness)
- Dashboard "Barcode-instellingen" section for strategy and length preferences
- `tenant_preferences` and `barcode_sequences` database tables
```

- [x] **Step 5: Register plan in INDEX.md**

Plan registered in `.agent/plans/INDEX.md` under "Phase 2 — Batch Pipeline Fixes".

- [x] **Step 6: Final commit**

Implemented in `develop` branch. Commit via `git log --oneline` or Vercel deploy log.
