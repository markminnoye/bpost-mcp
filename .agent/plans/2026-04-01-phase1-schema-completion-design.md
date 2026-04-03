# Phase 1 Schema Completion — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Finish all Zod schemas for Phase 1 (bpost e-MassPost MCP service)

---

## 1. Context

Phase 1 delivers a read-only, locally-hosted MCP server for validating bpost e-MassPost requests. The action sub-schemas (`DepositCreate`, `DepositUpdate`, `DepositDelete`, `DepositValidate`, `MailingCreate`, `MailingCheck`, `MailingDelete`, `MailingReuse`) are currently stubs (`.passthrough()`). The `Header` schema is incomplete (missing `customerId`, `accountId`, `mode`). Response schemas do not yet exist. Source of truth: XSD files in `docs/internal/e-masspost/skills/e-masspost-protocol/resources/`.

---

## 2. Approach

**Domain-split (Approach B):** Shared types first, then Deposit domain, then Mailing domain. Each domain is a complete TDD cycle (RED → GREEN → REFACTOR) covering request actions, response schema, and tests.

---

## 3. Shared Types — `src/schemas/common.ts`

### 3.1 Header (breaking fix)

Current `HeaderSchema` is missing required attributes. Replace with:

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `customerId` | `z.number().int().positive()` | Yes | XSD attribute |
| `accountId` | `z.number().int().positive()` | Yes | XSD attribute |
| `mode` | `z.enum(['P', 'T', 'C'])` | Yes | XSD `ModeType` |
| `Files.RequestProps.customerFileRef` | `z.string().regex(/^[A-Z\d]{10}$/)` | Yes | XSD pattern |
| `Files.ResponseProps` | optional, see below | No | XSD minOccurs=0 |
| `CustomerRefs` | optional array | No | XSD minOccurs=0 |

`ResponseProps` optional fields: `format?: enum('XML'|'TXT')`, `compressed?: BooleanType`, `encrypted?: BooleanType`, `transmissionMode?: enum('HTTP'|'HTTPS'|'FTP'|'FTPS')`.

`CustomerRef`: `{ key: z.string().max(250).min(1), value: z.string().max(250).min(1) }`.

### 3.2 Response building blocks (new)

These schemas are shared by both `DepositResponse` and `MailingResponse`:

```
StatusSchema         = { code: z.string().max(10) }
LocationSchema       = { tagName: string≤50, attributeName?: string≤50, attributeValue?: string≤250 }
MessageContentSchema = { key: string≤50, value: string≤250 }
MessageSchema        = {
  code: string≤10,
  severity: z.enum(['FATAL', 'ERROR', 'WARN', 'INFO']),
  Description?: string≤50,
  MessageContents?: { MessageContent: MessageContentSchema[] }
}
ReplySchema          = { seq: positiveInteger, XPath: string≤50, Locations?: { Location: LocationSchema[] }, Messages: { Message: MessageSchema[] } }
RepliesSchema        = { Reply: ReplySchema[] }
```

### 3.3 Existing schemas unchanged

`DepositContextSchema`, `MailingContextSchema`, `BooleanTypeSchema` remain as-is.

---

## 4. Deposit Domain

### 4.1 Request — `src/schemas/deposit-request.ts`

Replace all `.passthrough()` stubs. The `DepositRequest.xsd` is the authoritative source.

**Common deposit action attributes:**

| Attribute | Type | Required |
|-----------|------|----------|
| `seq` | `z.number().int().positive()` | Yes |
| `depositIdentifier` | `z.string().min(1).max(20)` | Yes |
| `depositIdentifierType` | `enum('depositRef'|'tmpDepositNr')` default `'depositRef'` | No |

**DepositCreate** — additional fields per XSD (full type definition to be derived from `DepositRequest.xsd` during implementation):
- `CustomerRefs?`, `Replies?` (shared types)

**DepositUpdate** — same shape as DepositCreate.

**DepositDelete** — `seq`, `depositIdentifier`, `depositIdentifierType?`, `CustomerRefs?`.

**DepositValidate** — same shape as DepositCreate.

### 4.2 Response — `src/schemas/deposit-response.ts` (new file)

```
DepositContextResponseSchema = {
  requestName: z.literal('DepositResponse'),
  dataset:     z.literal('M004_MPA'),
  sender:      z.literal('EMP'),
  receiver:    z.number().int().positive(),
  version:     z.literal('0100'),
}

DepositResponseHeaderSchema = {
  customerId:    z.number().int().positive(),
  CustomerRefs?: { CustomerRef: CustomerRefSchema[] },
  Files: {
    RequestProps: { fileName: z.string().max(100), customerFileRef: z.string().max(10) }
  }
}

DepositResponseActionSchema = {
  seq:                   positiveInteger,
  depositIdentifier:     string≤20,
  depositIdentifierType?: enum('depositRef'|'tmpDepositNr'),
  Status:                StatusSchema,
  CustomerRefs?:         { CustomerRef: CustomerRefSchema[] },
  Replies?:              RepliesSchema,
}

DepositResponseSchema = {
  Context:          DepositContextResponseSchema,
  Header:           DepositResponseHeaderSchema,
  Replies?:         RepliesSchema,
  DepositCreate?:   DepositResponseActionSchema[],
  DepositUpdate?:   DepositResponseActionSchema[],
  DepositDelete?:   DepositResponseActionSchema[],
  DepositValidate?: DepositResponseActionSchema[],
}
```

### 4.3 Tests

**`tests/schemas/deposit-request.test.ts`** — update existing + add:
- Header: valid with `customerId`/`accountId`/`mode`, reject missing each required field
- `customerFileRef` regex: accept `ABC1234567`, reject `abc123` (lowercase) and wrong length
- Per action (DepositCreate/Update/Delete/Validate): happy-path minimal, missing `seq`, missing `depositIdentifier`, invalid `depositIdentifierType`

**`tests/schemas/deposit-response.test.ts`** (new):
- Valid minimal response with one DepositCreate action
- Context with wrong `requestName` rejected
- Action missing `Status` rejected
- `severity` outside enum rejected
- `MessageContent` key/value length limits

---

## 5. Mailing Domain

### 5.1 Request — `src/schemas/mailing-request.ts`

Replace all `.passthrough()` stubs.

**MailingCreate:**

| Field | Type | Required |
|-------|------|----------|
| `seq` | positiveInteger | Yes |
| `mailingRef` | string 1-20 | Yes |
| `expectedDeliveryDate` | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` | Yes |
| `depositIdentifier` | string 1-20 | No |
| `depositIdentifierType` | enum | No, default `'depositRef'` |
| `genMID` | `enum('N'|'7'|'9'|'11')` | No, default `'N'` |
| `genPSC` | BooleanType | No, default `'N'` |
| `FileInfo` | `{ type: z.string() }` | Yes |
| `Format` | `{ value: enum('Large'|'Small'), responseSortingMode?: enum('PO'|'CU') }` | Yes |
| `Contacts` | Contact[] | No |
| `CustomerRefs` | CustomerRef[] | No |
| `Items` | `{ Item: ItemSchema[] }` min 1 | Yes |
| `ItemCount` | `{ value: positiveInteger }` | Yes |

**Contact schema:** `{ seq, firstName?, lastName?, email: string≤100, lang: enum('fr'|'nl'|'de'), phone?, fax?, mobile? }`

**Item schema:** `{ seq, lang?: enum('fr'|'nl'|'de'), midNum?: string matching /^[0-9]{14,18}$/, psCode?: string≤20, priority: enum('P'|'NP'), Comps: { Comp: CompSchema[] } }`

**Comp schema:** `{ code: enum('1'-'19','70'-'79','90'-'93'), value?: string≤70 }`

**MailingCheck** — same as MailingCreate minus `expectedDeliveryDate`, `FileInfo`, `Format`, plus additional attributes: `copyRequestItem?: BooleanType`, `suggestionsCount?: z.number().int().min(0)`, `suggestionsMinScore?: z.number().int().min(1).max(100)`, `pdpInResponse?: BooleanType`, `allRecordInResponse?: BooleanType`.

**MailingDelete** — `seq`, `mailingRef`, `Contacts?`, `CustomerRefs?`.

**MailingReuse** — `seq`, `mailingRef`, `sourceMailingRef: string 1-20`, `depositIdentifier: string 1-20` (required), `depositIdentifierType?`, `Contacts?`, `CustomerRefs?`.

### 5.2 Response — `src/schemas/mailing-response.ts` (new file)

```
MailingResponseSchema = {
  Context: { requestName:'MailingResponse', dataset:'M037_MID', sender:'MID', receiver: positiveInteger, version:'0200' }
  Header: {
    customerId: positiveInteger,
    CustomerRefs?: { CustomerRef: CustomerRefSchema[] },
    Customer?: z.unknown(),  // passthrough — structure not critical for Phase 1
    Files: { RequestProps: { fileName: string≤100, customerFileRef: string≤10 } }
  }
  Replies?:       RepliesSchema,
  MailingCreate?: MailingCreateResponseSchema[],
  MailingCheck?:  MailingCheckResponseSchema[],
  MailingDelete?: MailingDeleteResponseSchema[],
  MailingReuse?:  MailingReuseResponseSchema[],
}
```

`MailingCreateResponseSchema`: `seq`, `mailingRef`, `Status` (with optional `DistributionInformation`), `CustomerRefs?`, `Replies?`.

`MailingCheckResponseSchema`: same base + extended `Replies` that may contain `Alternatives`, `Suggestions` (complex nested — modelled with `.passthrough()` on the inner item content for Phase 1, full detail deferred to Phase 2).

`MailingDeleteResponseSchema` / `MailingReuseResponseSchema`: `seq`, `mailingRef`, `Status`, `CustomerRefs?`, `Replies?`.

### 5.3 Tests

**`tests/schemas/mailing-request.test.ts`** — update existing + add:
- Header breaking changes (same as deposit)
- MailingCreate: happy-path full, missing `expectedDeliveryDate`, invalid `genMID` value, invalid `priority`, `midNum` wrong length, `comp.code` outside allowed set
- MailingCheck: `suggestionsMinScore` out of range (0, 101)
- MailingDelete: minimal valid
- MailingReuse: missing `depositIdentifier` rejected

**`tests/schemas/mailing-response.test.ts`** (new):
- Valid minimal MailingCreate response
- Wrong `requestName` rejected
- Missing `Status` in action rejected

---

## 6. File Structure After Completion

```
src/schemas/
  common.ts            (updated — Header fix + shared response types)
  deposit-request.ts   (updated — stubs replaced)
  deposit-response.ts  (new)
  mailing-request.ts   (updated — stubs replaced)
  mailing-response.ts  (new)

tests/schemas/
  common.test.ts            (existing — may need minor updates)
  deposit-request.test.ts   (updated)
  deposit-response.test.ts  (new)
  mailing-request.test.ts   (updated)
  mailing-response.test.ts  (new)
```

---

## 7. Definition of Done

1. `npm run lint:fix` — no errors
2. `npx tsc --noEmit` — no type errors
3. All existing tests pass (updated for Header breaking change)
4. All new tests pass (RED → GREEN confirmed per TDD cycle)
5. No `.passthrough()` stubs remain (exception: `MailingCheckResponse` inner item content, explicitly noted)

---

## 8. Out of Scope (Phase 2)

- HTTP client integration (sending requests to bpost)
- `RequestAck.xsd` / acknowledgement schemas
- Full `MailingCheck` response item-level detail (Alternatives, Suggestions inner structure)
- Credential management
