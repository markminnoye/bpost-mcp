# Design: `check_batch` — BPost OptiAddress Pre-Validation

**Date:** 2026-04-12
**Status:** Draft
**Related issues:**
- markminnoye/bpost-mcp#13 — `check_batch` tool (MailingCheck / OptiAddress pre-validation)

---

## Goal

Add a `check_batch` MCP tool that sends batch rows to BPost's OptiAddress service (MailingCheck action) for address validation **before** submission. This catches BPost-level issues (undeliverable addresses, invalid postal codes, etc.) that Zod schema validation cannot detect.

The production flow becomes:

```
upload → map → check_batch → fix → recheck → submit_ready_batch
```

`check_batch` is non-destructive — it does NOT change batch status (`MAPPED` stays `MAPPED`). It can be called multiple times to verify fixes.

---

## Architecture

### Approach: Mirrors `submit-batch.ts` pattern

New file `src/lib/batch/check-batch.ts` — a pure function that builds a `MailingCheck` request (NOT `MailingCreate`), sends via `BpostClient`, and returns structured per-item results. The tool handler in `route.ts` stays thin (auth, state loading, calling the service, storing results back into Redis).

This follows the same extraction pattern as `submit-batch.ts`.

---

## How `check_batch` Differs from `submit_ready_batch`

| Aspect | `submit_ready_batch` | `check_batch` |
|--------|----------------------|----------------|
| BPost action | `MailingCreate` | `MailingCheck` |
| Purpose | Submit mail for delivery | Validate addresses only |
| Batch status | → `SUBMITTED` (locks batch) | stays `MAPPED` (re-checkable) |
| Can be retried? | No (already submitted) | Yes (multiple times) |
| expectedDeliveryDate | Required | **Not allowed** |
| Format | Required | **Not used** |
| genMID, genPSC | Yes | Yes (same options) |
| MailingCheck extras | N/A | `copyRequestItem`, `suggestionsCount`, `suggestionsMinScore`, `pdpInResponse`, `allRecordInResponse` |

---

## Input Schema

The `check_batch` tool takes:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `batchId` | string | Yes | — | The batch to check (must be in `MAPPED` status) |
| `mailingRef` | string (max 20) | No | `CHK-YYYYMMDD-HHmm` | Unique reference for this check operation. Different from the eventual `MailingCreate` ref. |
| `mode` | `"P"` \| `"T"` \| `"C"` | No | `"T"` | BPost communication mode. Default `T` (test, max 200 addresses). |
| `customerFileRef` | string (max 10) | No | First 10 chars of `batchId` | Short reference for the request file |
| `copyRequestItem` | `"Y"` \| `"N"` | No | `"N"` | If `"Y"`, BPost rewrites all addresses in the response file |
| `suggestionsCount` | number (0–9999) | No | `5` | Max suggestions returned per address. Default 5 covers most cases. |
| `suggestionsMinScore` | number (1–100) | No | `60` | Minimum Levenshtein score for suggestions. Default 60 (higher = stricter). |
| `pdpInResponse` | `"Y"` \| `"N"` | No | `"N"` | Include PDP distribution info in response |
| `allRecordInResponse` | `"Y"` \| `"N"` | No | `"Y"` | **Default `"Y"`** — return feedback for ALL rows, not just errors. Critical for reviewing valid addresses too. |

**Key insight on `mailingRef`:** The `mailingRef` used in `MailingCheck` is completely separate from the one used in `MailingCreate` (which happens at submit time). BPost treats these as independent operations. We auto-generate a different prefix (`CHK-`) to make them visually distinguishable.

---

## XML Mapping: MailingRequest with MailingCheck

```
MailingRequest
├── Context
│   ├── requestName: "MailingRequest"       — Fixed
│   ├── dataset: "M037_MID"                 — Fixed
│   ├── sender: credentials.customerNumber  — The customer number
│   ├── receiver: "MID"                     — Fixed
│   └── version: "0200"                     — Fixed protocol version
│
├── Header
│   ├── customerId: credentials.customerNumber
│   ├── accountId: credentials.accountId
│   ├── mode: params.mode
│   └── Files
│       └── RequestProps
│           └── customerFileRef: params.customerFileRef
│
└── MailingCheck[0]                         — ONE MailingCheck action per check
    ├── seq: 1
    ├── mailingRef: params.mailingRef        — Separate from eventual MailingCreate ref
    ├── genMID: "N"                           — No MID barcodes for address check
    ├── genPSC: "N"                           — No PSC codes for address check
    ├── copyRequestItem: params.copyRequestItem
    ├── suggestionsCount: params.suggestionsCount
    ├── suggestionsMinScore: params.suggestionsMinScore
    ├── pdpInResponse: params.pdpInResponse
    ├── allRecordInResponse: params.allRecordInResponse
    ├── Items
    │   └── Item[]: all rows (not just error-free ones) → Item shape
    │       ├── seq: row.mapped.seq
    │       ├── lang: row.mapped.lang
    │       ├── priority: row.mapped.priority ?? "NP"
    │       ├── midNum: row.mapped.midNum (optional)
    │       ├── psCode: row.mapped.psCode (optional)
    │       └── Comps
    └── ItemCount
        └── value: rows.length                — All rows, not just ready ones
```

### Key differences from MailingCreate

- **`genMID` always `"N"`** — MailingCheck doesn't generate MID barcodes (no physical mail)
- **`genPSC` always `"N"`** — No presorting codes in address validation
- **`allRecordInResponse: "Y"`** (default) — Get feedback on every row, not just errors
- **`Items` includes ALL rows** (not just validation-error-free ones) — BPost-level validation provides feedback on every address. We store only the latest check result (last call wins) so re-checking gives fresh feedback.
- **`mailingRef` has `CHK-` prefix** — Visually distinct from eventual `MailingCreate` ref

---

## State Management

### BatchRow changes

Add `bpostValidation` to `BatchRow` in `src/lib/kv/client.ts`:

```ts
export interface BpostValidationItem {
  checkedAt: string         // ISO timestamp of this check call
  status: 'OK' | 'ERROR' | 'WARNING'
  statusCode?: string       // e.g. "MID-2001" (empty if OK)
  statusMessage?: string    // e.g. "Address not found in database"
  suggestions?: Array<{
    score: number
    comps: Array<{ code: string; value: string }>
  }>
}

export interface BatchRow {
  index: number
  raw: Record<string, unknown>
  mapped?: Record<string, unknown>
  validationErrors?: $ZodIssue[]  // Zod-level errors (from mapping/validation)
  bpostValidation?: BpostValidationItem  // BPost-level feedback from latest check_batch call
}
```

**Design decision: `bpostValidation` is an array, not a single value.** This is because `check_batch` can be called multiple times, and each call may return different results. The array allows the agent to see the history of checks. Alternatively, we could store only the latest result — but history is useful for the agent to understand "I fixed it, it passed". Let's store an **array** (history), so the agent can see whether a re-check improved things.

### BatchState changes

No changes to `BatchState.status` — checking does not alter status. `MAPPED` stays `MAPPED` until `submit_ready_batch` transitions to `SUBMITTED`.

---

## Error Handling

| Scenario | Batch status | Response |
|----------|-------------|----------|
| BPost accepts (all OK or with warnings) | stays `MAPPED` | Success with counts + per-item status |
| BPost rejects (fatal error on request level) | stays `MAPPED` | `isError: true` with BPost code + message |
| Network timeout / connection error | stays `MAPPED` | `isError: true` with network error |
| Missing credentials | n/a | `isError: true` — "No BPost credentials configured" |
| Batch not in `MAPPED` status | stays unchanged | `isError: true` — "Batch must be MAPPED before checking" |

---

## Response Format

**Success:**
```
Check complete: 20 rows checked.
OK: 17 | Warnings: 2 | Errors: 1

Row 3: ERROR — MID-2030: Street name not found in database
Row 7: WARNING — Suggestion available (score: 85)
  → [Comp code 3: "Krijgsmansstraat"] instead of "Krijgsmansstr"

Use apply_row_fix to correct rows, then call check_batch again to re-verify.
```

**BPost request error:**
```
BPost rejected the check request.
Code: MID-3080
Message: MailingCheck cannot be combined with other actions in the same request.
```

---

## Integration: `get_batch_errors`

The `get_batch_errors` tool currently only shows Zod `validationErrors`. We should expand it to also show BPost `bpostValidation` errors/warnings alongside Zod errors.

**Proposed output structure:**

```
Batch errors for {batchId}:

[Zod Validation Errors] (from apply_mapping_rules)
  Row 5: "lang must be one of ['fr', 'nl', 'de']" — fix: patch row with valid lang

[BPost Address Validation] (from check_batch)
  Row 3: ERROR MID-2030 — Street name not found in database
  Row 7: WARNING — Suggestion available (score 85)
    → Corrected: [Comp code 3: "Krijgsmansstraat"]

[No errors] All rows valid!
```

**Design decision: Should `get_batch_errors` be updated?** Yes. It's incomplete if it only shows Zod errors and not BPost-level errors. However, this requires:
1. Adding `bpostValidation` to `BatchRow` (this spec)
2. Updating `get_batch_errors` tool handler to also read `bpostValidation`

This is in scope for this issue.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/batch/check-batch.ts` | **New** — service function: rows + params + credentials → XML → BPost → result |
| `src/lib/kv/client.ts` | Add `bpostValidation` field to `BatchRow` |
| `src/app/api/mcp/route.ts` | Register `check_batch` tool + expand `get_batch_errors` to show BPost errors |
| `tests/lib/batch/check-batch.test.ts` | **New** — unit tests for XML construction, response parsing, suggestions |
| `src/lib/mcp/server-instructions.ts` | Update flow guidance to include `check_batch` in pipeline |

---

## Not In Scope

- **Modifying `submit_ready_batch`** — it's correct as-is
- **Durable submission history** — tracked separately (markminnoye/bpost-mcp#12)
- **Customer onboarding** — tracked separately (markminnoye/bpost-mcp#16)