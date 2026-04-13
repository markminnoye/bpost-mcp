# `submit_ready_batch` BPost XML Dispatch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `[STUB]` in `submit_ready_batch` with real BPost XML dispatch via a `MailingCreate` request.

**Architecture:** New `src/lib/batch/submit-batch.ts` service function that builds a `MailingRequest` envelope from batch rows + mailing params + credentials, serializes to XML, and sends via `BpostClient`. The tool handler in `route.ts` stays thin. `BatchState` gains a `submission` field for audit.

**Tech Stack:** TypeScript, Zod, `fast-xml-parser` (via `buildXml`), `BpostClient`, Redis (via `src/lib/kv/client.ts`)

**Spec:** `docs/superpowers/specs/2026-04-12-submit-ready-batch-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/kv/client.ts` | Modify | Add `SubmissionRecord` type and `submission?` field to `BatchState` |
| `src/lib/batch/submit-batch.ts` | Create | Service function: build `MailingRequest`, serialize XML, call BPost, return result |
| `tests/lib/batch/submit-batch.test.ts` | Create | Unit tests for XML construction, priority fallback, error mapping |
| `src/app/api/mcp/route.ts` | Modify | Expand input schema, replace stub, wire handler to service function |

---

### Task 1: Add `SubmissionRecord` to `BatchState`

**Files:**
- Modify: `src/lib/kv/client.ts:37-53`

- [ ] **Step 1: Add the `SubmissionRecord` type and update `BatchState`**

In `src/lib/kv/client.ts`, add the following type after the `BatchRow` interface (line 44) and add the `submission` field to `BatchState`:

```ts
export interface SubmissionRecord {
  mailingRef: string
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
  submittedAt: string
  submittedRowCount: number
  skippedRowCount: number
  userId?: string
  clientId: string
  bpostStatus?: string
  bpostErrors?: Array<{
    seq: number
    code: string
    message: string
  }>
}
```

Add to `BatchState`:

```ts
export interface BatchState {
  batchId: string
  tenantId: string
  status: BatchStatus
  headers: string[]
  rows: BatchRow[]
  createdAt: string
  submission?: SubmissionRecord
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors (the field is optional, no code changes needed)

- [ ] **Step 3: Commit**

```bash
git add src/lib/kv/client.ts
git commit -m "feat(batch): add SubmissionRecord type to BatchState"
```

---

### Task 2: Create `submit-batch.ts` service function — failing tests first

**Files:**
- Create: `tests/lib/batch/submit-batch.test.ts`
- Create: `src/lib/batch/submit-batch.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/batch/submit-batch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BatchRow } from '@/lib/kv/client'

// Mock BpostClient before importing
vi.mock('@/client/bpost', () => ({
  createBpostClient: vi.fn(),
}))

vi.mock('@/lib/xml', () => ({
  buildXml: vi.fn((obj: Record<string, unknown>) => `<mock-xml>${JSON.stringify(obj)}</mock-xml>`),
}))

import { submitBatch, type SubmitBatchParams, type SubmitBatchResult } from '@/lib/batch/submit-batch'
import { createBpostClient } from '@/client/bpost'
import { buildXml } from '@/lib/xml'
import { BpostError } from '@/client/errors'

const MOCK_CREDENTIALS = {
  username: 'testuser',
  password: 'testpass',
  customerNumber: '12345',
  accountId: '67890',
}

const MOCK_PARAMS: SubmitBatchParams = {
  mailingRef: 'B-20260412-1430',
  expectedDeliveryDate: '2026-04-15',
  format: 'Small',
  priority: 'NP',
  mode: 'T',
  customerFileRef: 'BATCH001',
  genMID: '7',
  genPSC: 'N',
}

function makeReadyRow(index: number, mapped: Record<string, unknown>): BatchRow {
  return {
    index,
    raw: {},
    mapped,
    validationErrors: undefined,
  }
}

describe('submitBatch', () => {
  let mockSendMailingRequest: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMailingRequest = vi.fn().mockResolvedValue({
      MailingResponse: {
        MailingCreate: [{ Status: { code: 'OK' } }],
      },
    })
    vi.mocked(createBpostClient).mockReturnValue({
      sendMailingRequest: mockSendMailingRequest,
    } as never)
  })

  it('builds a valid MailingRequest XML and sends it', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'P',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
      makeReadyRow(2, {
        seq: 2,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Martin' }] },
      }),
    ]

    const result = await submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(true)
    expect(result.mailingRef).toBe('B-20260412-1430')
    expect(result.submittedCount).toBe(2)

    // Verify buildXml was called with correct structure
    expect(buildXml).toHaveBeenCalledOnce()
    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const req = xmlArg.MailingRequest

    expect(req.Context).toEqual({
      requestName: 'MailingRequest',
      dataset: 'M037_MID',
      sender: 12345,
      receiver: 'MID',
      version: '0200',
    })

    expect(req.Header).toEqual({
      customerId: 12345,
      accountId: 67890,
      mode: 'T',
      Files: { RequestProps: { customerFileRef: 'BATCH001' } },
    })

    const mailing = (req.MailingCreate as Record<string, unknown>[])[0]
    expect(mailing.seq).toBe(1)
    expect(mailing.mailingRef).toBe('B-20260412-1430')
    expect(mailing.expectedDeliveryDate).toBe('2026-04-15')
    expect(mailing.genMID).toBe('7')
    expect(mailing.genPSC).toBe('N')
    expect(mailing.FileInfo).toEqual({ type: 'MID2' })
    expect(mailing.Format).toEqual({ value: 'Small' })
    expect((mailing.ItemCount as { value: number }).value).toBe(2)

    const items = (mailing.Items as { Item: Record<string, unknown>[] }).Item
    expect(items).toHaveLength(2)
    expect(items[0].priority).toBe('P')
    expect(items[1].priority).toBe('NP')
  })

  it('applies priority fallback to rows without priority', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        // no priority — should get fallback from params
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    await submitBatch(rows, { ...MOCK_PARAMS, priority: 'P' }, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const mailing = (xmlArg.MailingRequest.MailingCreate as Record<string, unknown>[])[0]
    const items = (mailing.Items as { Item: Record<string, unknown>[] }).Item
    expect(items[0].priority).toBe('P')
  })

  it('does not override row-level priority with params fallback', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'P', // row has its own priority
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    // Param says NP, but row says P — row wins
    await submitBatch(rows, { ...MOCK_PARAMS, priority: 'NP' }, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const mailing = (xmlArg.MailingRequest.MailingCreate as Record<string, unknown>[])[0]
    const items = (mailing.Items as { Item: Record<string, unknown>[] }).Item
    expect(items[0].priority).toBe('P')
  })

  it('converts customerNumber and accountId to numbers', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    await submitBatch(rows, MOCK_PARAMS, {
      ...MOCK_CREDENTIALS,
      customerNumber: '00999',
      accountId: '00123',
    })

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const req = xmlArg.MailingRequest
    expect((req.Context as Record<string, unknown>).sender).toBe(999)
    expect((req.Header as Record<string, unknown>).customerId).toBe(999)
    expect((req.Header as Record<string, unknown>).accountId).toBe(123)
  })

  it('returns error result on BpostError', async () => {
    mockSendMailingRequest.mockRejectedValue(
      new BpostError('MID-4010', 'Address line too long', false),
    )

    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    const result = await submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(false)
    expect(result.error).toEqual({
      code: 'MID-4010',
      message: 'Address line too long',
      retryable: false,
    })
  })

  it('throws on unexpected (non-BPost) errors', async () => {
    mockSendMailingRequest.mockRejectedValue(new Error('Network timeout'))

    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    await expect(submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)).rejects.toThrow('Network timeout')
  })

  it('throws when rows array is empty', async () => {
    await expect(submitBatch([], MOCK_PARAMS, MOCK_CREDENTIALS)).rejects.toThrow(
      'No rows to submit',
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/batch/submit-batch.test.ts`
Expected: FAIL — module `@/lib/batch/submit-batch` does not exist

- [ ] **Step 3: Write the service function**

Create `src/lib/batch/submit-batch.ts`:

```ts
import type { BatchRow } from '@/lib/kv/client'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

export interface SubmitBatchParams {
  mailingRef: string
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
}

interface SubmitBatchCredentials {
  username: string
  password: string
  customerNumber: string
  accountId: string
}

export interface SubmitBatchResult {
  success: boolean
  mailingRef: string
  submittedCount: number
  bpostResponse?: Record<string, unknown>
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

/**
 * Builds a MailingCreate request from batch rows and sends it to BPost.
 *
 * Does NOT touch Redis or batch state — the caller handles that.
 * Catches BpostError and returns a structured error result.
 * Rethrows unexpected errors (network, etc.) for the caller to handle.
 */
export async function submitBatch(
  rows: BatchRow[],
  params: SubmitBatchParams,
  credentials: SubmitBatchCredentials,
): Promise<SubmitBatchResult> {
  if (rows.length === 0) {
    throw new Error('No rows to submit')
  }

  const customerNumber = Number(credentials.customerNumber)
  const accountId = Number(credentials.accountId)

  const items = rows.map((row) => {
    const mapped = row.mapped as Record<string, unknown>
    return {
      ...mapped,
      priority: mapped.priority ?? params.priority,
    }
  })

  const mailingRequest = {
    Context: {
      requestName: 'MailingRequest' as const,
      dataset: 'M037_MID' as const,
      sender: customerNumber,
      receiver: 'MID' as const,
      version: '0200' as const,
    },
    Header: {
      customerId: customerNumber,
      accountId,
      mode: params.mode,
      Files: {
        RequestProps: {
          customerFileRef: params.customerFileRef,
        },
      },
    },
    MailingCreate: [
      {
        seq: 1,
        mailingRef: params.mailingRef,
        expectedDeliveryDate: params.expectedDeliveryDate,
        genMID: params.genMID,
        genPSC: params.genPSC,
        FileInfo: { type: 'MID2' as const },
        Format: { value: params.format },
        Items: { Item: items },
        ItemCount: { value: rows.length },
      },
    ],
  }

  const xml = buildXml({ MailingRequest: mailingRequest })
  const client = createBpostClient(credentials)

  try {
    const bpostResponse = await client.sendMailingRequest(xml)
    return {
      success: true,
      mailingRef: params.mailingRef,
      submittedCount: rows.length,
      bpostResponse,
    }
  } catch (err) {
    if (err instanceof BpostError) {
      return {
        success: false,
        mailingRef: params.mailingRef,
        submittedCount: 0,
        error: {
          code: err.code,
          message: err.message,
          retryable: err.isRetryable,
        },
      }
    }
    throw err
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/batch/submit-batch.test.ts`
Expected: All 7 tests pass

- [ ] **Step 5: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/batch/submit-batch.ts tests/lib/batch/submit-batch.test.ts
git commit -m "feat(batch): add submitBatch service function with tests"
```

---

### Task 3: Wire the handler in `route.ts`

**Files:**
- Modify: `src/app/api/mcp/route.ts:378-408`

- [ ] **Step 1: Add import for `submitBatch`**

At the top of `src/app/api/mcp/route.ts`, add the import alongside the existing batch imports:

```ts
import { submitBatch } from '@/lib/batch/submit-batch'
```

- [ ] **Step 2: Replace the `submit_ready_batch` tool registration**

Replace the entire `submit_ready_batch` tool block (lines 378–408) with:

```ts
    server.registerTool(
      'submit_ready_batch',
      {
        description:
          'Submits all validated rows from the current uploaded batch to BPost e-MassPost as a MailingCreate request. ' +
          'Only rows without validation errors are included; skipped rows are reported in the response. ' +
          'IMPORTANT: Before calling, confirm these values with the user: mailingRef, expectedDeliveryDate, format, priority, and mode. ' +
          'The batch must be in MAPPED status. After successful submission, the batch is locked as SUBMITTED.',
        inputSchema: z.object({
          batchId: z.string(),
          expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
          format: z.enum(['Large', 'Small']),
          mailingRef: z.string().max(20).optional(),
          priority: z.enum(['P', 'NP']).optional().default('NP'),
          mode: z.enum(['P', 'T', 'C']).optional().default('T'),
          customerFileRef: z.string().max(10).optional(),
          genMID: z.enum(['N', '7', '9', '11']).optional().default('7'),
          genPSC: z.enum(['Y', 'N']).optional().default('N'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError

        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        if (state.status === 'SUBMITTED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} has already been submitted.` }] }
        if (state.status !== 'MAPPED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} is not in MAPPED state. Current status: ${state.status}` }] }

        const readyRows = state.rows.filter(r => !r.validationErrors || r.validationErrors.length === 0)
        if (readyRows.length === 0) return { isError: true, content: [{ type: 'text' as const, text: 'No valid rows to submit. Use get_batch_errors and apply_row_fix first.' }] }

        const credentials = await resolveCredentials(tenantId)

        const now = new Date()
        const mailingRef = input.mailingRef ?? `B-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
        const customerFileRef = input.customerFileRef ?? input.batchId.slice(0, 10)

        const result = await submitBatch(
          readyRows,
          {
            mailingRef,
            expectedDeliveryDate: input.expectedDeliveryDate,
            format: input.format,
            priority: input.priority,
            mode: input.mode,
            customerFileRef,
            genMID: input.genMID,
            genPSC: input.genPSC,
          },
          credentials,
        )

        const skippedCount = state.rows.length - readyRows.length
        const authInfo = extra.authInfo
        const userId = (authInfo?.extra as Record<string, unknown> | undefined)?.userId as string | undefined
        const clientId = authInfo?.clientId ?? 'unknown'

        if (result.success) {
          state.status = 'SUBMITTED'
          state.submission = {
            mailingRef,
            expectedDeliveryDate: input.expectedDeliveryDate,
            format: input.format,
            priority: input.priority,
            mode: input.mode,
            customerFileRef,
            genMID: input.genMID,
            genPSC: input.genPSC,
            submittedAt: now.toISOString(),
            submittedRowCount: readyRows.length,
            skippedRowCount: skippedCount,
            userId,
            clientId,
            bpostStatus: 'OK',
          }
          try {
            await saveBatchState(state)
          } catch (err) {
            console.error('[MCP] saveBatchState failed after BPost success:', err)
            return { isError: true, content: [{ type: 'text' as const, text: `BPost accepted the mailing but state save failed. mailingRef: ${mailingRef}. Please contact support.` }] }
          }

          return {
            content: [{
              type: 'text' as const,
              text: `Mailing submitted: ${readyRows.length} rows sent, ${skippedCount} skipped (validation errors).\nmailingRef: ${mailingRef}\nBPost status: OK`,
            }],
          }
        }

        // BPost error — batch stays MAPPED
        return {
          isError: true,
          content: [{
            type: 'text' as const,
            text: `BPost rejected the mailing.\nCode: ${result.error!.code}\nMessage: ${result.error!.message}\nBatch stays in MAPPED status — fix errors and retry.`,
          }],
        }
      },
    )
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run lint**

Run: `npm run lint:fix`
Expected: No errors (or auto-fixed)

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass, no regressions

- [ ] **Step 6: Commit**

```bash
git add src/app/api/mcp/route.ts
git commit -m "feat(batch): wire submit_ready_batch to BPost XML dispatch"
```

---

### Task 4: Definition of Done checks

- [ ] **Step 1: Run lint**

Run: `npm run lint:fix`
Expected: Clean

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Manual smoke check**

Verify the stub text `[STUB]` no longer appears in `route.ts`:

Run: `grep -r "STUB" src/`
Expected: No matches

- [ ] **Step 5: Update CHANGELOG.md**

Add to `[Unreleased]` section in `CHANGELOG.md`:

```markdown
### Changed
- **`submit_ready_batch`** (`src/app/api/mcp/route.ts`): Replaced stub with real BPost XML dispatch. Builds a `MailingCreate` request from mapped batch rows, sends via `BpostClient`, and stores submission metadata (mailingRef, row counts, BPost status, user/client ID) in `BatchState`. Supports configurable `mode` (default T/test), `priority` (default NP), `format`, `expectedDeliveryDate`, `mailingRef` (auto-generated if omitted), `genMID` (default 7 = BPost generates barcodes), and `genPSC`. Batch stays `MAPPED` on BPost errors for retry.

### Added
- **`src/lib/batch/submit-batch.ts`**: Service function that constructs the full `MailingRequest` XML envelope from batch rows + mailing-level params + tenant credentials, sends to BPost, and returns a structured result.
- **`SubmissionRecord`** (`src/lib/kv/client.ts`): New type tracking submission params, row counts, BPost response status, user/client audit fields. Stored as `submission?` on `BatchState` in Redis.
- **Tests**: `submit-batch.test.ts` — XML construction, priority fallback, numeric conversion, BPost error handling.
```

- [ ] **Step 6: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): document submit_ready_batch implementation"
```
