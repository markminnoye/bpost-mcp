# Batch Pipeline Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 7 code-review findings in the batch pipeline MCP tools and upload route: try/catch KV writes, sanitize `correctedData`, extract shared tenantId guard, add batch reset, surface error count, guard `submit_ready_batch` state order, fix `catch (error: any)`.

**Architecture:** All changes are in two files (`src/app/api/mcp/route.ts` and `src/app/api/batches/upload/route.ts`). A shared `requireTenantId` helper is extracted to `src/lib/mcp/require-tenant.ts` to eliminate 8× duplication. Each fix is covered by a test. No external interfaces change.

**Tech Stack:** TypeScript, mcp-handler, Zod, Vercel KV (@upstash/redis), vitest

---

## File Map

| File | Change |
|---|---|
| `src/lib/mcp/require-tenant.ts` | NEW — `requireTenantId(extra)` helper, returns tenantId or structured error |
| `src/app/api/mcp/route.ts` | MODIFY — use helper, wrap KV writes, fix `apply_row_fix` data pollution, add error count to `get_raw_headers`, add batch reset path |
| `src/app/api/batches/upload/route.ts` | MODIFY — fix `catch (error: any)` |
| `tests/lib/mcp/require-tenant.test.ts` | NEW — unit tests for the helper |
| `tests/app/api/mcp/route.test.ts` | MODIFY — add tests for new/changed behaviors |

---

## Context for Implementers

### How tool handlers work

Every batch tool in `src/app/api/mcp/route.ts` uses this pattern:

```typescript
async (input, extra) => {
  // 1. Guard: require tenant
  const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
  if (!tenantId) { return { isError: true, content: [...] } }
  // 2. Load state from KV
  const state = await getBatchState(tenantId, input.batchId)
  // 3. Mutate + save
  await saveBatchState(state)
  return { content: [...] }
}
```

### What `requireTenantId` should do

`mcp-handler` does not export the `RequestHandlerExtra` type, so the helper uses `any` for the `extra` parameter. This is intentional and correct.

```typescript
// src/lib/mcp/require-tenant.ts
type McpErrorResponse = { content: [{ type: 'text'; text: string }]; isError: true }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireTenantId(extra: any): string | McpErrorResponse {
  const tenantId = extra?.authInfo?.extra?.tenantId as string | undefined
  if (!tenantId) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
      isError: true as const,
    }
  }
  return tenantId
}
```

Usage pattern in every tool:
```typescript
async (input, extra) => {
  const tenantOrError = requireTenantId(extra)
  if (typeof tenantOrError !== 'string') return tenantOrError
  const tenantId = tenantOrError
  // ... rest of tool
}
```

### KV write try/catch pattern

Wrap every `saveBatchState` call:
```typescript
try {
  await saveBatchState(state)
} catch {
  return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
}
```

### `apply_row_fix` data pollution fix

**Problem:** On the failure path, `row.mapped` is the dirty merged object (attacker-controlled). The fix is to **only merge `correctedData` into a clean copy and validate, never persist the pre-validation merged object**:

```typescript
// Build a candidate mapped object by merging corrected fields
const candidateMapped = { ...row.mapped, ...input.correctedData }
const validationResult = ItemSchema.safeParse(candidateMapped)
if (validationResult.success) {
  row.mapped = validationResult.data   // Zod-validated output only
  row.validationErrors = undefined
} else {
  // On failure: update validationErrors but do NOT write candidateMapped to row.mapped
  row.validationErrors = validationResult.error.issues
  // row.mapped stays as it was — no pollution
}
```

### `get_raw_headers` error count

Add `errorCount` to the returned JSON when `status !== 'UNMAPPED'`:

```typescript
const errorCount = state.status !== 'UNMAPPED'
  ? state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0).length
  : undefined

return { content: [{ type: 'text' as const, text: JSON.stringify({
  headers: state.headers,
  status: state.status,
  totalRows: state.rows.length,
  ...(errorCount !== undefined ? { errorCount } : {}),
}, null, 2) }] }
```

### `apply_mapping_rules` reset path

Change the status guard from hard-blocking to allowing re-mapping:
```typescript
// Old: if (state.status !== 'UNMAPPED') return error
// New: accept UNMAPPED or MAPPED (re-map resets errors)
if (state.status === 'SUBMITTED') {
  return { isError: true, content: [{ type: 'text' as const, text: 'Cannot re-map a submitted batch.' }] }
}
// reset status before mapping
state.status = 'UNMAPPED'
```

### `submit_ready_batch` state order

Move `saveBatchState` to after the submission logic (currently a stub, but the save must come last):
```typescript
// Mark SUBMITTED only after all validation passes
// (When stub becomes real: call BPost XML here first)
state.status = 'SUBMITTED'
try {
  await saveBatchState(state)
} catch {
  return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
}
return { content: [{ type: 'text' as const, text: `[STUB] ...` }] }
```

---

## Task 1: Extract `requireTenantId` helper

**Files:**
- Create: `src/lib/mcp/require-tenant.ts`
- Create: `tests/lib/mcp/require-tenant.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/lib/mcp/require-tenant.test.ts
import { describe, it, expect } from 'vitest'
import { requireTenantId } from '@/lib/mcp/require-tenant'

describe('requireTenantId', () => {
  it('returns tenantId string when authInfo.extra.tenantId is set', () => {
    const extra = { authInfo: { extra: { tenantId: 'tenant_abc' }, token: 'tok', clientId: 'c', scopes: [] } } as any
    const result = requireTenantId(extra)
    expect(result).toBe('tenant_abc')
  })

  it('returns error object when authInfo is undefined', () => {
    const extra = { authInfo: undefined } as any
    const result = requireTenantId(extra)
    expect(typeof result).toBe('object')
    expect((result as any).isError).toBe(true)
    expect((result as any).content[0].text).toContain('Unauthorized')
  })

  it('returns error object when tenantId is missing from extra', () => {
    const extra = { authInfo: { extra: {}, token: 'tok', clientId: 'c', scopes: [] } } as any
    const result = requireTenantId(extra)
    expect(typeof result).toBe('object')
    expect((result as any).isError).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/lib/mcp/require-tenant.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/mcp/require-tenant'`

- [ ] **Step 3: Implement the helper**

```typescript
// src/lib/mcp/require-tenant.ts
type McpErrorResponse = {
  content: [{ type: 'text'; text: string }]
  isError: true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function requireTenantId(extra: any): string | McpErrorResponse {
  const tenantId = extra?.authInfo?.extra?.tenantId as string | undefined
  if (!tenantId) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
      isError: true as const,
    }
  }
  return tenantId
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/lib/mcp/require-tenant.test.ts
```

Expected: 3/3 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp/require-tenant.ts tests/lib/mcp/require-tenant.test.ts
git commit -m "feat(mcp): extract requireTenantId helper — eliminate 8x guard duplication"
```

---

## Task 2: Fix `apply_row_fix` data pollution + wrap all KV writes in try/catch

**Files:**
- Modify: `src/app/api/mcp/route.ts`
- Modify: `tests/app/api/mcp/route.test.ts`

This task is the most security-sensitive change. The key insight: on Zod validation failure, `row.mapped` must NOT be updated with the attacker-controlled merged candidate. Only `row.validationErrors` changes.

- [ ] **Step 1: Write the failing tests**

**Important:** `vi.mock` calls must be at the file's **top level** (Vitest hoists them before imports). Add the mock and import at the top of `tests/app/api/mcp/route.test.ts`, alongside the existing `vi.mock` blocks — NOT inside a `describe` block.

```typescript
// Add at top of file, with the existing vi.mock blocks:
vi.mock('@/lib/kv/client', () => ({
  getBatchState: vi.fn(),
  saveBatchState: vi.fn(),
}))

// Add with the existing imports:
import { getBatchState, saveBatchState } from '@/lib/kv/client'
```

Then add the test case inside the file:

```typescript
describe('apply_row_fix data pollution', () => {
  it('does not persist correctedData to row.mapped on validation failure', async () => {
    const originalMapped = { seq: 1, priority: 'P' }
    const mockState = {
      batchId: 'b1', tenantId: 'tenant_a', status: 'MAPPED',
      headers: [], rows: [{ index: 0, raw: {}, mapped: originalMapped, validationErrors: [] }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue()

    // verifyToken mock must return a valid tenant
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'],
      extra: { tenantId: 'tenant_a' },
    } as any)

    // correctedData with an invalid value (seq must be positive int, 'INVALID' fails)
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_row_fix', arguments: { batchId: 'b1', rowIndex: 0, correctedData: { seq: 'INVALID' } } }
      }),
    })
    await POST(req)

    // saveBatchState should have been called but row.mapped should NOT contain 'INVALID'
    const savedState = vi.mocked(saveBatchState).mock.calls[0]?.[0] as any
    expect(savedState?.rows[0]?.mapped?.seq).not.toBe('INVALID')
    expect(savedState?.rows[0]?.mapped).toEqual(originalMapped)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/app/api/mcp/route.test.ts
```

Expected: new test FAIL (currently `row.mapped` gets polluted)

- [ ] **Step 3: Apply all route.ts fixes**

In `src/app/api/mcp/route.ts`, make these changes:

**a) Add import at top:**
```typescript
import { requireTenantId } from '@/lib/mcp/require-tenant'
```

**b) Replace all 8 inline `tenantId` guard blocks with the helper.** For each tool, replace:
```typescript
const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
if (!tenantId) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
    isError: true,
  }
}
```
With:
```typescript
const tenantOrError = requireTenantId(extra)
if (typeof tenantOrError !== 'string') return tenantOrError
const tenantId = tenantOrError
```

**c) Fix `apply_row_fix` — replace lines 176–188:**
```typescript
// Build candidate without mutating row.mapped before validation
const candidateMapped = { ...row.mapped, ...input.correctedData }
const validationResult = ItemSchema.safeParse(candidateMapped)
if (validationResult.success) {
  row.mapped = validationResult.data
  row.validationErrors = undefined
} else {
  // Only update errors — do NOT write the unvalidated candidate to row.mapped
  row.validationErrors = validationResult.error.issues
}
try {
  await saveBatchState(state)
} catch {
  return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
}
if (validationResult.success) {
  return { content: [{ type: 'text' as const, text: `Row ${input.rowIndex} patched and validated successfully.` }] }
}
return { content: [{ type: 'text' as const, text: `Row ${input.rowIndex} patched but still has ${validationResult.error.issues.length} validation error(s). Use get_batch_errors to review.` }] }
```

**d) Wrap `saveBatchState` in `apply_mapping_rules` (line 123):**
```typescript
try {
  await saveBatchState(state)
} catch {
  return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
}
```

**e) Wrap `saveBatchState` in `submit_ready_batch` (lines 215–216):**
```typescript
state.status = 'SUBMITTED'
try {
  await saveBatchState(state)
} catch {
  return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all pass (including new pollution test)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/mcp/route.ts tests/app/api/mcp/route.test.ts
git commit -m "fix(mcp): sanitize correctedData on validation failure, wrap KV writes in try/catch"
```

---

## Task 3: Fix `get_raw_headers` error count + `apply_mapping_rules` reset path

**Files:**
- Modify: `src/app/api/mcp/route.ts`
- Modify: `tests/app/api/mcp/route.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/app/api/mcp/route.test.ts`:

```typescript
describe('get_raw_headers', () => {
  it('does NOT include errorCount when status is UNMAPPED', async () => {
    const mockState = {
      batchId: 'b1', tenantId: 'tenant_a', status: 'UNMAPPED',
      headers: ['name'], rows: [{ index: 0, raw: { name: 'x' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'get_raw_headers', arguments: { batchId: 'b1' } }
      }),
    })
    const res = await POST(req)
    const body = await res.json()
    const result = JSON.parse(body?.result?.content?.[0]?.text ?? '{}')
    expect(result.errorCount).toBeUndefined()
  })

  it('includes errorCount in response when status is MAPPED', async () => {
    const mockState = {
      batchId: 'b1', tenantId: 'tenant_a', status: 'MAPPED',
      headers: ['name', 'postalCode'], rows: [
        { index: 0, raw: {}, mapped: {}, validationErrors: [{ message: 'err' }] },
        { index: 1, raw: {}, mapped: {}, validationErrors: undefined },
      ],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'get_raw_headers', arguments: { batchId: 'b1' } }
      }),
    })
    const res = await POST(req)
    const body = await res.json()
    const result = JSON.parse(body?.result?.content?.[0]?.text ?? '{}')
    expect(result.errorCount).toBe(1)
  })
})

describe('apply_mapping_rules reset', () => {
  it('allows re-mapping a MAPPED batch (resets status to UNMAPPED first)', async () => {
    const mockState = {
      batchId: 'b1', tenantId: 'tenant_a', status: 'MAPPED',
      headers: ['name'], rows: [{ index: 0, raw: { name: 'Test' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue()
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_mapping_rules', arguments: { batchId: 'b1', mapping: { name: 'psCode' } } }
      }),
    })
    const res = await POST(req)
    expect(res.status).not.toBe(400) // should succeed, not block re-mapping
    const savedState = vi.mocked(saveBatchState).mock.calls[0]?.[0] as any
    expect(savedState?.status).toBe('MAPPED') // ends as MAPPED after applying rules
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/app/api/mcp/route.test.ts
```

Expected: new tests FAIL

- [ ] **Step 3: Apply fixes in `src/app/api/mcp/route.ts`**

**a) `get_raw_headers` — update the return statement (currently line 74):**
```typescript
const errorCount = state.status !== 'UNMAPPED'
  ? state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0).length
  : undefined
return {
  content: [{
    type: 'text' as const,
    text: JSON.stringify({
      headers: state.headers,
      status: state.status,
      totalRows: state.rows.length,
      ...(errorCount !== undefined ? { errorCount } : {}),
    }, null, 2),
  }],
}
```

**b) `apply_mapping_rules` — replace the status guard (currently line 97):**
```typescript
// Old: if (state.status !== 'UNMAPPED') return error
// New: only block SUBMITTED; re-mapping from MAPPED is allowed (the mapping logic
//      unconditionally sets state.status = 'MAPPED' before saving, so no intermediate reset needed)
if (state.status === 'SUBMITTED') {
  return { isError: true, content: [{ type: 'text' as const, text: 'Cannot re-map a submitted batch.' }] }
}
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/mcp/route.ts tests/app/api/mcp/route.test.ts
git commit -m "fix(mcp): add errorCount to get_raw_headers, allow re-mapping MAPPED batches"
```

---

## Task 4: Fix `catch (error: any)` in upload route

**Files:**
- Modify: `src/app/api/batches/upload/route.ts`

This is the smallest fix — change `error: any` to `unknown` with a type-safe message extraction.

- [ ] **Step 1: Apply the fix**

In `src/app/api/batches/upload/route.ts`, replace line 98–103:

```typescript
  } catch (error: any) {
    console.error("[UPLOAD_BATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
```

With:

```typescript
  } catch (error: unknown) {
    console.error("[UPLOAD_BATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: clean

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all 102+ pass

- [ ] **Step 4: Commit**

```bash
git add src/app/api/batches/upload/route.ts
git commit -m "fix(upload): use unknown instead of any in catch block"
```

---

## Task 5: Update CHANGELOG and merge to main

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add a new patch entry to CHANGELOG.md**

Insert after the `## [2.0.0]` heading block:

```markdown
## [2.0.1] - 2026-04-08

### Fixed
- **Batch pipeline hardening**: `apply_row_fix` no longer persists unvalidated `correctedData` to KV on re-validation failure (data pollution fix)
- **KV write resilience**: `apply_mapping_rules`, `apply_row_fix`, `submit_ready_batch` now return structured `isError` responses on Redis write failure instead of propagating unhandled exceptions
- **`get_raw_headers`**: Returns `errorCount` alongside `totalRows` when batch status is `MAPPED` or `SUBMITTED`, saving agents a round-trip
- **`apply_mapping_rules`**: Now allows re-mapping a `MAPPED` batch (previously hard-blocked); only `SUBMITTED` batches cannot be re-mapped
- **Upload route**: `catch (error: any)` replaced with `unknown` + type-safe message extraction
- **DRY**: Extracted `requireTenantId` helper to `src/lib/mcp/require-tenant.ts`, removing 8× duplicated tenantId guard
```

- [ ] **Step 2: Run full test suite one final time**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v2.0.1 batch pipeline hardening"
```

- [ ] **Step 4: Push develop and merge to main**

```bash
git push origin develop
git checkout main
git merge develop --no-ff -m "merge: develop into main — v2.0.1 batch pipeline hardening"
git push origin main
git checkout develop
```
