# Plan: `check_batch` — BPost OptiAddress Pre-Validation

**Date:** 2026-04-12
**Status:** Complete
**Spec:** `../../docs/superpowers/specs/2026-04-12-check-batch-design.md`

---

## Context

We need to implement the `check_batch` MCP tool that sends batch rows to BPost's OptiAddress service (MailingCheck action) for address validation before submission. This follows the same service-function pattern as `submit-batch.ts`.

---

## Implementation Order

1. Add `bpostValidation` to `BatchRow` type in `src/lib/kv/client.ts`
2. Write failing tests in `tests/lib/batch/check-batch.test.ts`
3. Implement `src/lib/batch/check-batch.ts` service function
4. Register `check_batch` tool in `src/app/api/mcp/route.ts`
5. Update `get_batch_errors` to also show BPost validation errors
6. Update `src/lib/mcp/server-instructions.ts` flow guidance
7. Run DoD: `npm run lint:fix` → `npx tsc --noEmit` → `npx vitest run`
8. Commit + update CHANGELOG + update plan index

---

## Step-by-Step

### Step 1: Add `bpostValidation` to `BatchRow`

**File:** `src/lib/kv/client.ts`

Add after existing `validationErrors` field:

```ts
export interface BpostValidationItem {
  checkedAt: string
  status: 'OK' | 'ERROR' | 'WARNING'
  statusCode?: string
  statusMessage?: string
  suggestions?: Array<{
    score: number
    comps: Array<{ code: string; value: string }>
  }>
}

export interface BatchRow {
  index: number
  raw: Record<string, unknown>
  mapped?: Record<string, unknown>
  validationErrors?: $ZodIssue[]
  bpostValidation?: BpostValidationItem  // NEW
}
```

---

### Step 2: Write failing tests

**File:** `tests/lib/batch/check-batch.test.ts`

Create tests covering:

1. **XML construction** — `MailingCheck` envelope, `CHK-` mailingRef prefix, all attributes set correctly
2. **genMID/genPSC always "N"** — regardless of any input params (they should be hardcoded for MailingCheck)
3. **All rows sent** — not just error-free ones (unlike `submit_ready_batch`)
4. **Response parsing** — `OK` / `ERROR` / `WARNING` per row, extracted from Replies/Reply
5. **Suggestions parsing** — score + Comp array per suggestion
6. **Empty rows** — throws Error like `submitBatch` does
7. **BpostError handling** — returns structured error result

Mirror the test structure from `tests/lib/batch/submit-batch.test.ts`.

---

### Step 3: Implement `src/lib/batch/check-batch.ts`

**File:** `src/lib/batch/check-batch.ts`

Follow `submit-batch.ts` exactly as a template:

```ts
export interface CheckBatchParams {
  mailingRef: string
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  copyRequestItem: 'Y' | 'N'
  suggestionsCount: number
  suggestionsMinScore: number
  pdpInResponse: 'Y' | 'N'
  allRecordInResponse: 'Y' | 'N'
}

export interface CheckBatchResult {
  success: boolean
  mailingRef: string
  checkedCount: number
  okCount: number
  warningCount: number
  errorCount: number
  bpostResponse?: Record<string, unknown>
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

export async function checkBatch(
  rows: BatchRow[],
  params: CheckBatchParams,
  credentials: SubmitBatchCredentials,  // same shape as submit-batch
): Promise<CheckBatchResult>
```

Key implementation differences from `submitBatch`:

- Uses `MailingCheck` array (not `MailingCreate`)
- `genMID: 'N'` and `genPSC: 'N'` are hardcoded (not passed)
- `suggestionsCount`, `suggestionsMinScore`, `pdpInResponse`, `allRecordInResponse` are included
- Auto-generates `CHK-` prefix for mailingRef if not provided
- Sends **all rows** (not filtered by validation errors)
- Response parsing extracts per-`Reply` items with their `Status` (OK/ERROR/WARNING) and `Suggestions`

---

### Step 4: Register `check_batch` tool

**File:** `src/app/api/mcp/route.ts`

Add after `submit_ready_batch` tool registration:

```ts
server.registerTool(
  'check_batch',
  {
    description:
      'BATCH PIPELINE step 4/6: Validates all batch rows against BPost OptiAddress (address validation service). ' +
      'Call this AFTER apply_mapping_rules (step 3) and BEFORE submit_ready_batch (step 6). ' +
      'MailingCheck is non-destructive — batch stays in MAPPED status and can be re-checked after fixes. ' +
      'Use suggestions to auto-correct addresses with apply_row_fix, then recheck.',
    inputSchema: z.object({
      batchId: z.string(),
      mailingRef: z.string().max(20).optional(),
      mode: z.enum(['P', 'T', 'C']).optional().default('T'),
      customerFileRef: z.string().max(10).optional(),
      copyRequestItem: z.enum(['Y', 'N']).optional().default('N'),
      suggestionsCount: z.number().int().min(0).max(9999).optional().default(5),
      suggestionsMinScore: z.number().int().min(1).max(100).optional().default(60),
      pdpInResponse: z.enum(['Y', 'N']).optional().default('N'),
      allRecordInResponse: z.enum(['Y', 'N']).optional().default('Y'),
    }),
  },
  async (input, extra) => {
    // 1. requireTenantId
    // 2. getBatchState
    // 3. Guard: status must be MAPPED
    // 4. Filter out rows with no mapped data (optional — check design spec)
    // 5. resolveCredentials
    // 6. Auto-generate mailingRef with CHK- prefix if not provided
    // 7. call checkBatch()
    // 8. On success: update state.rows[i].bpostValidation for each row
    // 9. saveBatchState
    // 10. Return summary + errors/warnings
  },
)
```

---

### Step 5: Update `get_batch_errors`

**File:** `src/app/api/mcp/route.ts`

Expand the `get_batch_errors` response to also show `bpostValidation` errors/warnings.

Current output shows only Zod `validationErrors`. After change:

```
Batch errors for {batchId}:

[Zod Validation Errors] (from apply_mapping_rules)
  Row 5: "lang must be one of ['fr', 'nl', 'de']" — use apply_row_fix

[BPost Address Validation] (from check_batch)
  Row 3: ERROR MID-2030 — Street name not found in database
  Row 7: WARNING — Suggestion available (score 85)
    → Corrected: [Comp code 3: "Krijgsmansstraat"]

[No errors] All rows valid according to Zod AND BPost OptiAddress!
```

---

### Step 6: Update server instructions

**File:** `src/lib/mcp/server-instructions.ts`

Update flow guidance to include `check_batch`:

```
upload → map → check_batch → fix → recheck → submit_ready_batch
```

Add `check_batch` description explaining it as the OptiAddress pre-validation step, and that it can be called multiple times.

---

### Step 7: Run DoD

```bash
npm run lint:fix
npx tsc --noEmit
npx vitest run
```

---

### Step 8: Commit

```
feat: implement check_batch MCP tool (OptiAddress pre-validation)

- New src/lib/batch/check-batch.ts service function
- New tests/lib/batch/check-batch.test.ts
- Add bpostValidation field to BatchRow
- Register check_batch tool in route.ts
- Update get_batch_errors to show BPost errors
- Update server instructions with check_batch in pipeline
```

Also:
- Update `CHANGELOG.md` under `[Unreleased]`
- Register plan in `.agent/plans/INDEX.md` as ✅
- Close issue: `gh issue close 13 --repo markminnoye/bpost-mcp`

---

## Verification

After implementation, verify:

- [ ] `npm run lint:fix` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all tests green
- [ ] `check_batch` tool appears in MCP tool list
- [ ] Calling `check_batch` on a MAPPED batch returns validation results per row
- [ ] Calling `check_batch` on a non-MAPPED batch returns error
- [ ] `get_batch_errors` shows both Zod errors and BPost validation errors
- [ ] Re-checking after a fix updates `bpostValidation` on the row