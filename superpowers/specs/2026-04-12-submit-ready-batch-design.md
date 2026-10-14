# Design: `submit_ready_batch` — BPost XML Dispatch

**Date:** 2026-04-12
**Status:** Approved
**Related issues:**
- markminnoye/bpost-mcp#12 — Durable submission history & calendar view
- markminnoye/bpost-mcp#13 — `check_batch` tool (MailingCheck / OptiAddress pre-validation)
- markminnoye/bpost-mcp#14 — Validate & document BPost flows in MCP server instructions
- markminnoye/bpost-mcp#15 — Auto-generated tool reference page with MD export
- markminnoye/bpost-mcp#16 — Customer onboarding workflow & barcode strategy configuration

---

## Goal

Replace the `[STUB]` in `submit_ready_batch` with real BPost XML dispatch. The tool takes mapped, validated batch rows and submits them as a `MailingCreate` request to BPost e-MassPost.

---

## Architecture

### Approach: Extracted service function

New file `src/lib/batch/submit-batch.ts` — a pure function that builds the `MailingRequest`, serializes to XML, and sends via `BpostClient`. The tool handler in `route.ts` stays a thin orchestrator (auth, state loading, calling the service, updating Redis).

This follows the existing pattern of `apply-mapping.ts` and `validate-mapping-targets.ts` in `src/lib/batch/`.

---

## Input Schema

The `submit_ready_batch` tool input expands from `{ batchId }` to:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `batchId` | string | Yes | — | The batch to submit (must be in `MAPPED` status) |
| `expectedDeliveryDate` | string (YYYY-MM-DD) | Yes | — | The date the physical mail should be delivered by BPost |
| `format` | `"Large"` \| `"Small"` | Yes | — | Physical mail piece size. `Large` = A4/C4 envelopes, `Small` = standard letter |
| `mailingRef` | string (max 20) | No | `B-YYYYMMDD-HHmm` | Customer-chosen unique reference for this mailing in BPost's system. Used to link mailings to deposits and to reference the mailing in later operations (delete, check). Must be unique for at least 30 days within the account |
| `priority` | `"P"` \| `"NP"` | No | `"NP"` | Mail priority. `P` = prior (faster delivery), `NP` = non-prior (standard). Applied as fallback to rows that don't have `priority` mapped per-row. Default `NP` ensures every Item has a priority (required by BPost XSD) |
| `mode` | `"P"` \| `"T"` \| `"C"` | No | `"T"` | BPost communication mode. `T` = test (syntax check, max 200 addresses), `C` = certification (max 2000), `P` = production (no limit, requires certification) |
| `customerFileRef` | string (max 10) | No | First 10 chars of `batchId` | A short reference for the request file, used by BPost to label acknowledgement and response files |
| `genMID` | `"N"` \| `"7"` \| `"9"` \| `"11"` | No | `"7"` | Whether BPost should generate Mail ID barcodes (and of what length). Default `"7"` = BPost generates 7-digit barcodes (simplest for customers without their own barcode system). When `"N"`, customer must provide `midNum` per row. See markminnoye/bpost-mcp#16 for tenant-level barcode strategy configuration |
| `genPSC` | `"Y"` \| `"N"` | No | `"N"` | Whether BPost should generate presorting codes in the response. Only relevant for Round & Sequence (`RS1`), not for standard Mail ID (`MID2`) |

---

## XML Mapping: MailingRequest Envelope

The service function builds a `MailingRequest` from batch rows + mailing-level params + tenant credentials.

```
MailingRequest
├── Context
│   ├── requestName: "MailingRequest"       — Fixed literal identifying this as a mailing request
│   ├── dataset: "M037_MID"                 — Fixed BPost dataset code for Mail ID mailings
│   ├── sender: credentials.customerNumber  — The customer number (company ID in BPost)
│   ├── receiver: "MID"                     — Fixed literal: the Mail ID system at BPost
│   └── version: "0200"                     — Fixed protocol version for mailing requests
│
├── Header
│   ├── customerId: credentials.customerNumber  — Same as sender; identifies the company
│   ├── accountId: credentials.accountId        — The specific account within the company
│   │                                             (one company can have multiple accounts
│   │                                              for different departments or cost centers)
│   ├── mode: params.mode                       — Communication mode (T/C/P)
│   └── Files
│       └── RequestProps
│           └── customerFileRef: params.customerFileRef  — Short file reference (max 10 chars)
│
└── MailingCreate[0]                            — One MailingCreate action per batch submission
    ├── seq: 1                                  — Action sequence number (always 1, single action)
    ├── mailingRef: params.mailingRef           — Unique mailing reference (auto-generated or user-provided)
    ├── expectedDeliveryDate: params.expectedDeliveryDate  — Requested delivery date (YYYY-MM-DD)
    ├── genMID: params.genMID                    — Barcode generation: "N" (none), "7"/"9"/"11" (BPost generates)
    ├── genPSC: params.genPSC                    — Presorting codes: "N" (none), "Y" (only for RS1 file type)
    ├── FileInfo
    │   └── type: "MID2"                        — File type for Mail ID deposits (standard product)
    ├── Format
    │   └── value: params.format                — Physical mail size (Large/Small)
    ├── Items
    │   └── Item[]: readyRows → Item shape      — Each validated batch row becomes an Item
    │       ├── seq: row.mapped.seq             — Row sequence number (auto-generated during mapping)
    │       ├── lang: row.mapped.lang           — Language (fr/nl/de) if mapped
    │       ├── priority: row.mapped.priority   — Row-level priority, or params.priority as fallback (default "NP")
    │       │                ?? params.priority ?? "NP"
    │       ├── Comps                           — Address components (aggregated during mapping)
    │       │   └── Comp[]: { code, value }     — e.g. code "1" = family name, "3" = street name
    │       └── (other mapped fields: midNum, psCode, etc.)
    └── ItemCount
        └── value: readyRows.length             — Must equal the number of Item elements
```

### Key field relationships

- **`sender` = `customerId` = `credentials.customerNumber`**: The customer number appears in both `Context` and `Header`. It identifies the company. The `Context.sender` tells BPost who sent the file; the `Header.customerId` is used for business logic (pricing, certification status, etc.).
- **`accountId`**: A sub-division within the customer. One company may have multiple accounts for different mail products or cost centers. Comes from `bpost_credentials` in the database.
- **`mailingRef`**: The customer's own unique label for this mailing. BPost uses it to track the mailing and link it to deposits. Must be unique for at least 30 days. Auto-generated as `B-YYYYMMDD-HHmm` if not provided.
- **`FileInfo.type: "MID2"`**: Identifies this as a Mail ID mailing (as opposed to `"RS1"` for Round & Sequence). Mail ID is the standard product.
- **`genMID`**: Controls whether BPost generates Mail ID barcodes. Default `N` = customer handles their own barcodes (simplest flow). Set to `7`/`9`/`11` if the customer wants BPost to generate barcodes of that length — but then they must wait for the BPost response before printing.
- **`genPSC`**: Controls presorting code generation. Default `N`. Only set to `Y` for Round & Sequence mailings (`FileInfo.type: "RS1"`). Not applicable to standard Mail ID (`MID2`).

---

## State Management

### BatchState changes

Add a `submission` field to `BatchState` (in `src/lib/kv/client.ts`):

```ts
submission?: {
  mailingRef: string
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority?: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  submittedAt: string             // ISO timestamp
  submittedRowCount: number
  skippedRowCount: number
  userId?: string                 // OAuth user who triggered submission (if available)
  clientId: string                // "oauth" or "api_token"
  bpostStatus?: string            // Status code from BPost response
  bpostErrors?: Array<{           // Per-item errors from BPost (if any)
    seq: number
    code: string
    message: string
  }>
}
```

### Status transitions

- `UNMAPPED` → error: "Map the batch first using `apply_mapping_rules`"
- `MAPPED` → proceed with submission
- `SUBMITTED` → error: "Batch already submitted"
- Status only changes to `SUBMITTED` **after** a successful BPost response
- On BPost error: status stays `MAPPED`, agent can fix and retry

### Re-submission

Not allowed once `SUBMITTED`. The pre-validation loop (check → fix → recheck) is handled by the future `check_batch` tool (markminnoye/bpost-mcp#13), not by re-submitting `MailingCreate`.

---

## Tool Description (agent guidance)

The tool's `description` field must instruct the agent to **confirm defaulted values with the user before calling**. Specifically, the agent should present and get approval for:

- `mailingRef` — auto-generated or user-provided
- `expectedDeliveryDate` — user must explicitly provide
- `format` — Large or Small
- `priority` — default NP, confirm with user
- `mode` — default T (test), confirm with user

Example agent behavior: _"I'll submit your batch with these settings: mailingRef B-20260412-1430, delivery date 2026-04-15, format Small, priority NP (standard), mode T (test). OK?"_

This guidance is embedded in the tool description string, not enforced in code.

---

## Handler Flow (route.ts)

1. Validate input (new expanded schema)
2. `requireTenantId(extra)` — extract tenant + auth info
3. `getBatchState(tenantId, batchId)` — load from Redis
4. Guard: status must be `MAPPED`
5. Filter ready rows (`!validationErrors || validationErrors.length === 0`)
6. Guard: at least 1 ready row
7. `getCredentialsByTenantId(tenantId)` — fetch BPost credentials
8. Auto-generate defaults: `mailingRef` (if omitted), `customerFileRef` (if omitted)
9. Call `submitBatch()` from service function
10. **On success:**
    - `state.status = 'SUBMITTED'`
    - `state.submission = { ... params, counts, bpostStatus, userId, clientId }`
    - `saveBatchState(state)`
    - Return: `"Mailing submitted: 15 rows sent, 3 skipped (validation errors). mailingRef: B-20260412-1430. BPost status: OK"`
11. **On BPost error:**
    - Status stays `MAPPED`
    - Return: structured MCP error with BPost code + original error message

---

## Error Handling

| Scenario | Batch status | Response |
|----------|-------------|----------|
| BPost accepts the mailing | → `SUBMITTED` | Success with counts + mailingRef + status |
| BPost rejects (MPW/MID error) | stays `MAPPED` | `isError: true` with BPost error code and message (verbatim) |
| Network timeout / connection error | stays `MAPPED` | `isError: true` with network error description |
| Redis save fails after BPost success | stays `MAPPED` (stale) | `isError: true` — "BPost accepted the mailing but state save failed. mailingRef: X. Contact support." |
| Missing credentials | n/a | `isError: true` — "No BPost credentials configured" |

Tool responses are in English. BPost error messages are kept verbatim (they come back in English/French from BPost).

---

## Response Format

**Success:**
```
Mailing submitted: 15 rows sent, 3 skipped (validation errors).
mailingRef: B-20260412-1430
BPost status: OK
```

**BPost error:**
```
BPost rejected the mailing.
Code: MID-4010
Message: <BPost error description verbatim>
Batch stays in MAPPED status — fix errors and retry.
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/batch/submit-batch.ts` | **New** — service function: rows + params + credentials → XML → BPost → result |
| `src/lib/kv/client.ts` | Add `submission` field to `BatchState` interface |
| `src/app/api/mcp/route.ts` | Expand input schema, replace stub with handler that calls `submitBatch()` |
| `tests/lib/batch/submit-batch.test.ts` | **New** — unit tests for XML construction, priority fallback, error mapping |

---

## Not In Scope

These are tracked as separate issues:

- **`check_batch` (MailingCheck / OptiAddress)** — markminnoye/bpost-mcp#13. The production address validation loop. Will share the same service layer pattern.
- **Durable submission history** — markminnoye/bpost-mcp#12. Persist submissions to Postgres for calendar/schedule view.
- **Flow documentation in server instructions** — markminnoye/bpost-mcp#14. Guide agents through correct BPost flows.
- **Customer onboarding & barcode strategy** — markminnoye/bpost-mcp#16. Tenant-level barcode configuration, `barcodeCustomerId` field, MCP-generated barcodes.
