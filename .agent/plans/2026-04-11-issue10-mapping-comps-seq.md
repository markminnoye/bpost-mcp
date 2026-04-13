# Issue #10 Fix: Comps Mapping + seq Auto-Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 3 critical problems from [GitHub issue #10](https://github.com/markminnoye/bpost-mcp/issues/10): (1) `apply_mapping_rules` can't map multiple CSV columns into the nested `Comps` object, (2) `seq` is never auto-generated, (3) error messages don't explain how to use `Comps`.

**Architecture:** Extract the mapping logic from the monolithic route handler into a dedicated pure function (`applyMapping`) that understands `Comps.<code>` dot-notation. This function collects all `Comps.*` targets, builds the nested `{ Comp: [{ code, value }] }` structure, and auto-assigns `seq` from the 1-based row index. The error message for unknown targets is enriched with a Comps usage hint.

**Tech Stack:** TypeScript, Zod, Vitest

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/batch/apply-mapping.ts` | Pure mapping function: flat CSV row + mapping rules → BPost Item shape (with Comps aggregation + seq auto-gen) |
| Create | `tests/lib/batch/apply-mapping.test.ts` | Unit tests for the mapping function |
| Modify | `src/app/api/mcp/route.ts:258-312` | Use `applyMapping`, update target validation to allow `Comps.<code>`, improve error hint |
| Modify | `tests/app/api/mcp/route.test.ts` | Integration test: Comps dot-notation through MCP endpoint |

---

### Task 1: Mapping helper — failing tests for Comps aggregation

**Files:**
- Create: `tests/lib/batch/apply-mapping.test.ts`

- [x] **Step 1: Write failing tests for `applyMapping`**

These tests define the contract for the new mapping function. It takes a raw CSV row (as `Record<string, unknown>`), a mapping config (`Record<string, string>`), and the 1-based row index. It returns a mapped object ready for `ItemSchema.safeParse()`.

```ts
// tests/lib/batch/apply-mapping.test.ts
import { describe, it, expect } from 'vitest'
import { applyMapping } from '@/lib/batch/apply-mapping'

describe('applyMapping', () => {
  it('maps flat fields directly (lang, priority, psCode)', () => {
    const raw = { Taal: 'nl', Prioriteit: 'NP' }
    const mapping = { Taal: 'lang', Prioriteit: 'priority' }
    const result = applyMapping(raw, mapping, 1)

    expect(result.lang).toBe('nl')
    expect(result.priority).toBe('NP')
  })

  it('auto-generates seq from rowIndex', () => {
    const raw = { Taal: 'nl', Prioriteit: 'NP' }
    const mapping = { Taal: 'lang', Prioriteit: 'priority' }

    expect(applyMapping(raw, mapping, 1).seq).toBe(1)
    expect(applyMapping(raw, mapping, 5).seq).toBe(5)
  })

  it('does not overwrite an explicitly mapped seq', () => {
    const raw = { SeqCol: '99', Taal: 'nl' }
    const mapping = { SeqCol: 'seq', Taal: 'lang' }
    const result = applyMapping(raw, mapping, 1)

    // Explicit mapping wins over auto-gen
    expect(result.seq).toBe('99')
  })

  it('aggregates Comps.<code> targets into nested Comps object', () => {
    const raw = {
      Voornaam: 'Jan',
      Familienaam: 'Janssen',
      Straatnaam: 'Kerkstraat',
      Huisnummer: '10',
      Postcode: '2000',
      Gemeente: 'Antwerpen',
    }
    const mapping = {
      Familienaam: 'Comps.1',
      Voornaam: 'Comps.2',
      Straatnaam: 'Comps.3',
      Huisnummer: 'Comps.4',
      Postcode: 'Comps.8',
      Gemeente: 'Comps.9',
    }
    const result = applyMapping(raw, mapping, 1)

    expect(result.Comps).toEqual({
      Comp: [
        { code: '1', value: 'Janssen' },
        { code: '2', value: 'Jan' },
        { code: '3', value: 'Kerkstraat' },
        { code: '4', value: '10' },
        { code: '8', value: '2000' },
        { code: '9', value: 'Antwerpen' },
      ],
    })
  })

  it('sorts Comp entries by numeric code', () => {
    const raw = { B: 'second', A: 'first' }
    const mapping = { B: 'Comps.10', A: 'Comps.2' }
    const result = applyMapping(raw, mapping, 1)

    expect(result.Comps.Comp[0].code).toBe('2')
    expect(result.Comps.Comp[1].code).toBe('10')
  })

  it('skips Comps entries with empty/undefined values', () => {
    const raw = { Naam: 'Jan', Bus: '' }
    const mapping = { Naam: 'Comps.1', Bus: 'Comps.5' }
    const result = applyMapping(raw, mapping, 1)

    expect(result.Comps.Comp).toHaveLength(1)
    expect(result.Comps.Comp[0]).toEqual({ code: '1', value: 'Jan' })
  })

  it('combines flat fields and Comps in one mapping', () => {
    const raw = { Taal: 'nl', Prioriteit: 'NP', Naam: 'Jan', Straat: 'Kerkstraat' }
    const mapping = {
      Taal: 'lang',
      Prioriteit: 'priority',
      Naam: 'Comps.1',
      Straat: 'Comps.3',
    }
    const result = applyMapping(raw, mapping, 1)

    expect(result.seq).toBe(1)
    expect(result.lang).toBe('nl')
    expect(result.priority).toBe('NP')
    expect(result.Comps.Comp).toEqual([
      { code: '1', value: 'Jan' },
      { code: '3', value: 'Kerkstraat' },
    ])
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/batch/apply-mapping.test.ts`
Expected: FAIL — module `@/lib/batch/apply-mapping` does not exist.

---

### Task 2: Mapping helper — implementation

**Files:**
- Create: `src/lib/batch/apply-mapping.ts`

- [x] **Step 3: Write `applyMapping` implementation**

```ts
// src/lib/batch/apply-mapping.ts

const COMPS_PREFIX = 'Comps.'

/**
 * Maps a flat CSV row into the BPost Item shape.
 *
 * Supports:
 * - Direct field mapping: `"Taal": "lang"` → `{ lang: "nl" }`
 * - Comps dot-notation: `"Naam": "Comps.1"` → aggregated into `{ Comps: { Comp: [{ code: "1", value: "..." }] } }`
 * - Auto-generated seq from rowIndex (1-based) unless explicitly mapped
 */
export function applyMapping(
  raw: Record<string, unknown>,
  mapping: Record<string, string>,
  rowIndex: number,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  const comps: Array<{ code: string; value: string }> = []

  for (const [sourceCol, target] of Object.entries(mapping)) {
    const value = raw[sourceCol]

    if (target.startsWith(COMPS_PREFIX)) {
      const code = target.slice(COMPS_PREFIX.length)
      // Skip empty/undefined values — common for optional fields like "Bus"
      if (value !== undefined && value !== null && value !== '') {
        comps.push({ code, value: String(value) })
      }
    } else {
      mapped[target] = value
    }
  }

  if (comps.length > 0) {
    // Sort by numeric code for deterministic output
    comps.sort((a, b) => Number(a.code) - Number(b.code))
    mapped.Comps = { Comp: comps }
  }

  // Auto-generate seq if not explicitly mapped
  if (!('seq' in mapped)) {
    mapped.seq = rowIndex
  }

  return mapped
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/batch/apply-mapping.test.ts`
Expected: All 7 tests PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/batch/apply-mapping.ts tests/lib/batch/apply-mapping.test.ts
git commit -m "feat(batch): add applyMapping helper with Comps dot-notation and seq auto-gen

Resolves the core of issue #10: multiple CSV columns can now be
aggregated into the nested Comps object via Comps.<code> syntax."
```

---

### Task 3: Update `apply_mapping_rules` target validation

The current validation on `route.ts:284-287` rejects any target that isn't a literal key of `ItemSchema.shape`. We need to also accept `Comps.<code>` targets.

**Files:**
- Create: `src/lib/batch/validate-mapping-targets.ts`
- Create: `tests/lib/batch/validate-mapping-targets.test.ts`

- [x] **Step 6: Write failing tests for target validation**

```ts
// tests/lib/batch/validate-mapping-targets.test.ts
import { describe, it, expect } from 'vitest'
import { validateMappingTargets } from '@/lib/batch/validate-mapping-targets'

describe('validateMappingTargets', () => {
  it('accepts known flat fields', () => {
    const result = validateMappingTargets({ A: 'lang', B: 'priority' })
    expect(result).toBeNull()
  })

  it('accepts Comps.<code> for valid BPost comp codes', () => {
    const result = validateMappingTargets({
      A: 'Comps.1', B: 'Comps.2', C: 'Comps.9', D: 'Comps.70',
    })
    expect(result).toBeNull()
  })

  it('rejects unknown flat fields', () => {
    const result = validateMappingTargets({ A: 'firstName', B: 'lang' })
    expect(result).not.toBeNull()
    expect(result!.unknownTargets).toContain('firstName')
  })

  it('rejects invalid Comps codes', () => {
    const result = validateMappingTargets({ A: 'Comps.99' })
    expect(result).not.toBeNull()
    expect(result!.unknownTargets).toContain('Comps.99')
  })

  it('rejects bare "Comps" without dot-notation', () => {
    const result = validateMappingTargets({ A: 'Comps' })
    expect(result).not.toBeNull()
    expect(result!.hint).toContain('Comps.<code>')
  })

  it('includes a hint explaining Comps syntax when Comps-related target fails', () => {
    const result = validateMappingTargets({ A: 'Comps.999' })
    expect(result).not.toBeNull()
    expect(result!.hint).toContain('Comps.<code>')
  })
})
```

- [x] **Step 7: Run tests to verify they fail**

Run: `npx vitest run tests/lib/batch/validate-mapping-targets.test.ts`
Expected: FAIL — module does not exist.

- [x] **Step 8: Implement `validateMappingTargets`**

```ts
// src/lib/batch/validate-mapping-targets.ts
import { ItemSchema } from '@/schemas/mailing-request'

/** Valid BPost comp codes (from CompCodeSchema). */
const VALID_COMP_CODES = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
  '90', '91', '92', '93',
])

const KNOWN_FLAT_FIELDS = new Set(Object.keys(ItemSchema.shape))

const COMPS_HINT =
  'To map address columns, use Comps.<code> dot-notation. ' +
  'Example: { "Familienaam": "Comps.1", "Voornaam": "Comps.2", "Straatnaam": "Comps.3", "Huisnummer": "Comps.4", "Bus": "Comps.5", "Postcode": "Comps.8", "Gemeente": "Comps.9" }. ' +
  'Valid codes: 1-19 (address components), 70-79, 90-93. See BPost e-MassPost protocol for the full code table.'

export interface TargetValidationError {
  unknownTargets: string[]
  hint: string
}

export function validateMappingTargets(
  mapping: Record<string, string>,
): TargetValidationError | null {
  const unknownTargets: string[] = []
  let compsRelated = false

  for (const target of Object.values(mapping)) {
    if (KNOWN_FLAT_FIELDS.has(target) && target !== 'Comps') {
      // Valid flat field (but bare "Comps" is not valid — must use dot-notation)
      continue
    }

    if (target.startsWith('Comps.')) {
      const code = target.slice(6)
      if (VALID_COMP_CODES.has(code)) continue
      unknownTargets.push(target)
      compsRelated = true
      continue
    }

    if (target === 'Comps') {
      unknownTargets.push(target)
      compsRelated = true
      continue
    }

    unknownTargets.push(target)
  }

  if (unknownTargets.length === 0) return null

  const knownList = [...KNOWN_FLAT_FIELDS].filter(f => f !== 'Comps').join(', ')
  const baseMsg = `Mapping references unknown target fields: ${unknownTargets.join(', ')}. Known flat fields: ${knownList}.`
  const hint = compsRelated ? `${baseMsg} ${COMPS_HINT}` : baseMsg

  return { unknownTargets, hint }
}
```

- [x] **Step 9: Run tests to verify they pass**

Run: `npx vitest run tests/lib/batch/validate-mapping-targets.test.ts`
Expected: All 6 tests PASS.

- [x] **Step 10: Commit**

```bash
git add src/lib/batch/validate-mapping-targets.ts tests/lib/batch/validate-mapping-targets.test.ts
git commit -m "feat(batch): add mapping target validator with Comps code validation and hint

Validates that mapping targets are known ItemSchema fields or valid
Comps.<code> entries. Returns an actionable hint when Comps syntax
is incorrect."
```

---

### Task 4: Wire helpers into `apply_mapping_rules` tool

**Files:**
- Modify: `src/app/api/mcp/route.ts:258-312`

- [x] **Step 11: Write an integration test for Comps mapping through MCP**

Add this test to `tests/app/api/mcp/route.test.ts`:

```ts
describe('apply_mapping_rules Comps dot-notation', () => {
  it('maps Comps.<code> targets into nested Comps object with auto-seq', async () => {
    const mockState = {
      batchId: 'b-comps', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['Naam', 'Straat', 'Postcode', 'Gemeente', 'Taal', 'Prioriteit'],
      rows: [{
        index: 0,
        raw: { Naam: 'Janssen', Straat: 'Kerkstraat', Postcode: '2000', Gemeente: 'Antwerpen', Taal: 'nl', Prioriteit: 'NP' },
      }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          arguments: {
            batchId: 'b-comps',
            mapping: {
              Naam: 'Comps.1',
              Straat: 'Comps.3',
              Postcode: 'Comps.8',
              Gemeente: 'Comps.9',
              Taal: 'lang',
              Prioriteit: 'priority',
            },
          },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()

    // Verify the saved state has correct Comps structure and auto-seq
    const savedState = vi.mocked(saveBatchState).mock.calls[0]?.[0] as any
    const row = savedState.rows[0]
    expect(row.mapped.seq).toBe(1)
    expect(row.mapped.lang).toBe('nl')
    expect(row.mapped.priority).toBe('NP')
    expect(row.mapped.Comps).toEqual({
      Comp: [
        { code: '1', value: 'Janssen' },
        { code: '3', value: 'Kerkstraat' },
        { code: '8', value: '2000' },
        { code: '9', value: 'Antwerpen' },
      ],
    })
    // Validation should pass — this is a complete, valid Item
    expect(row.validationErrors).toBeUndefined()
  })

  it('rejects bare "Comps" target with a helpful hint', async () => {
    const mockState = {
      batchId: 'b-bare', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['Naam'],
      rows: [{ index: 0, raw: { Naam: 'Jan' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          arguments: { batchId: 'b-bare', mapping: { Naam: 'Comps' } },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('Comps.<code>')
  })
})
```

- [x] **Step 12: Run the new integration test to verify it fails**

Run: `npx vitest run tests/app/api/mcp/route.test.ts`
Expected: The two new tests FAIL (the mapping still uses the old flat logic).

- [x] **Step 13: Replace mapping logic in route.ts**

In `src/app/api/mcp/route.ts`, add imports at the top:

```ts
import { applyMapping } from '@/lib/batch/apply-mapping'
import { validateMappingTargets } from '@/lib/batch/validate-mapping-targets'
```

Then replace the `apply_mapping_rules` tool's target validation and mapping loop (lines ~284-310). The full replacement for the tool handler body (everything after the `state.status === 'SUBMITTED'` guard):

```ts
        const unknownCols = Object.keys(input.mapping).filter(col => !state.headers.includes(col))
        if (unknownCols.length > 0) {
          return { isError: true, content: [{ type: 'text' as const, text: `Mapping references unknown source columns: ${unknownCols.join(', ')}. Available headers: ${state.headers.join(', ')}` }] }
        }

        const targetError = validateMappingTargets(input.mapping)
        if (targetError) {
          return { isError: true, content: [{ type: 'text' as const, text: targetError.hint }] }
        }

        state.rows = state.rows.map(r => {
          const mapped = applyMapping(r.raw, input.mapping, r.index + 1)
          const result = ItemSchema.safeParse(mapped)
          return {
            ...r,
            mapped: result.success ? result.data : mapped,
            validationErrors: result.success ? undefined : result.error.issues,
          }
        })
        state.status = 'MAPPED'
```

Key changes:
1. **Target validation** now uses `validateMappingTargets` instead of bare `ItemSchema.shape` key check — accepts `Comps.<code>` and returns actionable hints.
2. **Row mapping** now calls `applyMapping(r.raw, input.mapping, r.index + 1)` which handles Comps aggregation and seq auto-gen. Note: `r.index + 1` because `seq` is 1-based while `r.index` is 0-based.
3. The rest (ItemSchema validation, error collection, state save) stays identical.

- [x] **Step 14: Run all tests to verify everything passes**

Run: `npx vitest run`
Expected: All tests PASS (existing + new unit + new integration).

- [x] **Step 15: Run lint and type check**

Run: `npm run lint:fix && npx tsc --noEmit`
Expected: No errors.

- [x] **Step 16: Commit**

```bash
git add src/app/api/mcp/route.ts tests/app/api/mcp/route.test.ts
git commit -m "feat(mcp): wire Comps dot-notation and seq auto-gen into apply_mapping_rules

Replaces flat-only mapping with applyMapping helper. CSV columns can
now be mapped to Comps.<code> (e.g. Comps.1, Comps.3) and the engine
builds the nested {Comp: [{code, value}]} structure automatically.
seq is auto-generated from row index when not explicitly mapped.
Error messages now include Comps syntax hints.

Closes #10 (problems 1-3)"
```

---

### Task 5: Update tool description for AI discoverability

The `apply_mapping_rules` tool description should tell AI agents about the Comps dot-notation so they use it correctly without trial-and-error.

**Files:**
- Modify: `src/app/api/mcp/route.ts:259-263`

- [x] **Step 17: Update the tool description**

Replace the current `description` string in the `apply_mapping_rules` tool registration:

```ts
        description:
          'After upload: maps each spreadsheet column header to the correct BPost mailing-row field key (Item schema). ' +
          'Flat fields: lang, priority, psCode, midNum. ' +
          'Address columns: use Comps.<code> dot-notation, e.g. { "Familienaam": "Comps.1", "Voornaam": "Comps.2", "Straatnaam": "Comps.3", "Huisnummer": "Comps.4", "Bus": "Comps.5", "Postcode": "Comps.8", "Gemeente": "Comps.9" }. ' +
          'seq is auto-generated from row index (1-based) unless explicitly mapped. ' +
          'Required before row-level checks are meaningful; afterwards each row is validated against bpost field rules.',
```

- [x] **Step 18: Run tests to confirm no regressions**

Run: `npx vitest run && npm run lint:fix && npx tsc --noEmit`
Expected: All pass.

- [x] **Step 19: Commit**

```bash
git add src/app/api/mcp/route.ts
git commit -m "docs(mcp): update apply_mapping_rules description with Comps syntax

AI agents now see the Comps.<code> dot-notation and common Belgian
address codes directly in the tool description, reducing trial-and-error."
```

---

## Verification Checklist

After all tasks are complete:

- [x] `npx vitest run` — all tests pass
- [x] `npm run lint:fix` — no lint errors
- [x] `npx tsc --noEmit` — no type errors
- [ ] Manual smoke test: the mapping from issue #10's test CSV should work in one pass:
  ```json
  {
    "Familienaam": "Comps.1",
    "Voornaam": "Comps.2",
    "Straatnaam": "Comps.3",
    "Huisnummer": "Comps.4",
    "Bus": "Comps.5",
    "Gemeente": "Comps.9",
    "Postcode": "Comps.8",
    "Taal": "lang",
    "Prioriteit": "priority"
  }
  ```
  This should produce 10 valid rows with no errors and no need for `apply_row_fix`.
