# Masspost library & CLI

Developer guide for `src/core/masspost/` and the npm scripts that drive Contrapunt test uploads.

| Doc | Scope |
|-----|--------|
| **This page** | Library modules, scripts, flags, workflows |
| [masspost-test-env.md](./masspost-test-env.md) | `.env.local` variables (ids, MID version, file ref) |
| [e-masspost protocol (GitBook source)](./e-masspost/docs/README.md) | Official field/flow/transport specs |
| [Field findings](./e-masspost/docs/reference/field-findings.md) | Live Contrapunt observations (FTP, Opti `7001`, …) |
| [Plan](../../.agent/plans/2026-09-28-bpost-library-web-app.md) | Product decisions & milestone status |
| [Samples](../samples/contrapunt/README.md) | Excel fixtures & round-trip XML |

---

## What it does

```
.xlsx  →  parse  →  map Comp 90/92/93  →  build MailingRequest  →  Zod validate  →  XML (ISO-8859-1)
                                                                              ↘ HTTP* / FTP upload
```

\* HTTP Basic Auth is **not** a reliable machine API — use portal upload or FTP. See field findings.

The library is framework-agnostic (no Next.js / Redis / DB). Entry: `src/core/masspost/index.ts`.

Temporary guard: `FORCE_TEST_MODE = true` in `build-request.ts` — every request is forced to `mode="T"` until Contrapunt is certified.

---

## Quick start

```bash
# 1. Credentials in .env.local — see masspost-test-env.md
# 2. XML for manual portal upload (MailingCreate, max 200)
npm run generate:mailing-xml

# 3. OptiAddress check (MailingCheck)
npm run generate:mailing-xml -- --opti --limit 10

# 4. From a specific Excel file
npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx

# 5. Transport smoke (HTTP always; FTP optional — usually fails until onboarding)
npm run test:transport
npm run test:transport -- --ftp
```

Output XML lands in `docs/samples/contrapunt/generated/` unless you pass `--out`. Encoding is **Latin-1** (`ISO-8859-1`).

---

## npm scripts

### `npm run generate:mailing-xml`

Builds a **validated** `MailingRequest` XML for **manual** e-MassPost upload. Does **not** call HTTP/FTP.

Script: `scripts/generate-mailing-xml.ts`  
Requires: `BPOST_TEST_USERNAME`, `PASSWORD`, `CUSTOMER_ID`, `ACCOUNT_ID` (and related env — see test-env doc).

| Flag | Meaning |
|------|---------|
| *(none)* | Default source: `docs/samples/contrapunt/testadressen.xlsx`. **MailingCreate**, max **200** rows (`mode=T`). |
| `--file <pad.xlsx>` | Use that workbook instead (Contrapunt column layout). Mutually exclusive with `--simple`. |
| `--simple` | One synthetic Contrapunt-layout row (quick portal smoke). No `--limit` / `--all`. |
| `--opti` / `--check` | Build **MailingCheck** (OptiAddress) instead of MailingCreate. Sets `copyRequestItem=Y`, `suggestionsCount=5`, `suggestionsMinScore=60`. |
| `--limit N` | Cap mapped rows (positive integer). Default **200** when neither `--all` nor `--simple`. |
| `--all` | No row cap (warns if Create exceeds 200 under `mode=T`). |
| `--version 0100\|0102\|0200` | Override `BPOST_TEST_MID_VERSION` for this run. |
| `--out <pad.xml>` | Write to this path. Portal upload must still use the **canonical bpost filename** printed in the console (or omit `--out`). |

**Examples:**

```bash
npm run generate:mailing-xml
npm run generate:mailing-xml -- --simple
npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx
npm run generate:mailing-xml -- --opti --limit 10
npm run generate:mailing-xml -- --opti --file docs/samples/contrapunt/testadressen-200.xlsx
npm run generate:mailing-xml -- --limit 50 --version 0200
npm run generate:mailing-xml -- --all
npm run generate:mailing-xml -- --out ./tmp/mailing.xml
```

**Create vs Opti defaults in this script:**

| | MailingCreate (default) | MailingCheck (`--opti`) |
|--|-------------------------|-------------------------|
| Action | `MailingCreate` | `MailingCheck` only (no Create in the same file) |
| `genMID` | `7` | — |
| `mailingRef` prefix | `MANUAL…` / `SIMPLE…` | `OPTI…` / `OPTISIMPLE…` |
| Delivery / FileInfo | Set for `0200` | Not used |

---

### `npm run test:transport`

End-to-end smoke: Excel → validate → attempt **HTTP** send; optionally **FTP**.

Script: `scripts/test-transport.ts`

| Flag | Meaning |
|------|---------|
| *(none)* | Default `testadressen.xlsx` + Contrapunt mapping; HTTP only. |
| `--file <pad.xlsx>` | Custom workbook (uses Contrapunt column mapping). |
| `--synthetic` | One fake address (`Naam`/`Straat`/… columns), not the Contrapunt export layout. |
| `--ftp` | Also upload via FTPS to `\requests` (`.TMP` rename). Needs `BPOST_FTP_*` or falls back to test username/password. |

```bash
npm run test:transport
npm run test:transport -- --synthetic
npm run test:transport -- --file docs/samples/contrapunt/testadressen-200.xlsx
npm run test:transport -- --ftp
```

Notes:

- Always forces `mode=T`. Uses `genMID=N` (unlike `generate:mailing-xml`).
- HTTP is expected to fail against the live portal (SSO / 404) — useful to confirm credentials resolution and XML build.
- FTP proves upload only; reading `\responses` is a separate step (not automated yet).

---

### `npx tsx scripts/build-compare-200.ts`

Regenerates the **AFT vs XML** comparison pair from the first 200 rows of `testadressen.xlsx`:

| Output | Use |
|--------|-----|
| `docs/samples/contrapunt/testadressen-200.xlsx` | CRM columns → `generate:mailing-xml -- --file …` |
| `docs/samples/contrapunt/testadressen-200-aft.xls` | Portal Address File Tool (BIFF8; portal rejects `.xlsx`) |

Requires Python with **`xlwt`**. Override interpreter: `AFT_PYTHON=/path/to/python`.

```bash
pip install xlwt   # once
npx tsx scripts/build-compare-200.ts
```

Not wired as an npm script on purpose (Python side dependency).

---

## Library map (`src/core/masspost/`)

| Module | Role |
|--------|------|
| `excel.ts` | Parse `.xlsx` → `{ headers, rows }` (`exceljs`) |
| `mapping.ts` | Column mapping → unstructured Comp **90/91/92/93**; max **50** chars; reports truncation & charset fixes |
| `suggest-mapping.ts` | `suggestColumnMapping` — header heuristics / Contrapunt preset. No cell values, no AI |
| `presets/contrapunt-export.ts` | `CONTRAPUNT_EXPORT_COLUMN_MAPPING` (re-exported by the fixture) |
| `charset.ts` | `normalizeForBpost` / `findUnsupportedChars` (ISO-8859-1) |
| `build-request.ts` | `rowsToItems`, `buildMailingRequest`, `buildMailingCheckRequest`; `FORCE_TEST_MODE` |
| `validate.ts` | Zod validate with per-field issues (`midVersion`-aware) |
| `pipeline.ts` | `convertExcelToMailingRequest` / `convertExcelToMailingCheck` |
| `file-naming.ts` | `buildMailingRequestFileName`, `normalizeBpostCustomerFileRef` (pad to 10) |
| `credentials.ts` | `getHttpCredentials` / `getFtpCredentials` (lazy fail-fast) |
| `transport/http.ts` | Thin wrapper around existing `BpostClient` |
| `transport/ftp.ts` | FTPS upload: `\requests`, `.TMP` → final name |
| `parse-response.ts` | `extractMailingResponseMessages` / `hasFatalMailingResponse` (file-level Replies) |
| `fixtures/contrapunt-sample.ts` | Paths + `CONTRAPUNT_EXPORT_COLUMN_MAPPING` + simple buffer |

### Pipeline API

```ts
import {
  convertExcelToMailingRequest,
  convertExcelToMailingCheck,
} from '@/core/masspost'

const result = await convertExcelToMailingRequest(
  excelBuffer,
  { name: ['Roepnaam', 'Familienaam'], streetHouseBox: […], postcodeCity: […] },
  { mailingRef, expectedDeliveryDate, format, priority, mode, customerFileRef, genMID, genPSC },
  { customerId, accountId, midVersion: '0200', maxItems: 200 },
)

// result.itemCount, sourceItemCount, warnings[], validation, xml?
```

`convertExcelToMailingCheck` takes `BuildCheckParams` (`copyRequestItem`, `suggestionsCount`, …) instead of Create params.

### Column mapping

```ts
type ColumnMapping = {
  name: string[]                 // → Comp 90
  companyDepartment?: string[]   // → Comp 91 (optional)
  streetHouseBox: string[]       // → Comp 92
  postcodeCity: string[]         // → Comp 93
}
```

Source columns are joined with a space. Unsupported characters that cannot be normalized fail validation.

### Suggest a mapping

`suggestColumnMapping` proposes a `ColumnMapping` from **column titles only**. It does not read rows and it does not call `mapRows` or the pipeline. The caller confirms the proposal before any XML build.

```ts
import { suggestColumnMapping } from '@/core/masspost'

const suggestion = suggestColumnMapping({
  headers, // string[] from parseExcelAddresses
  presetId: 'contrapunt-export', // optional; also detected from the titles themselves
  localeHints: ['nl'], // optional: nl | fr | en, tie-break only
})

// suggestion.mapping, confidence: 'high' | 'medium' | 'low'
// suggestion.rationale — per Comp 90 / 91 / 92 / 93
// suggestion.unmatchedHeaders
// suggestion.needsAi — true only when a required target is missing or confidence is low
```

Contrapunt export titles (including an extra `Land` column) return exactly `CONTRAPUNT_EXPORT_COLUMN_MAPPING`, `confidence: 'high'`, `needsAi: false`. `Land` stays unmatched. Other layouts use NL/FR/EN synonyms. A preset id never invents columns that are not in `headers`.

Optional AI fallback, outside core: `POST /api/masspost/suggest-mapping` requires the same bearer token or session cookie as the other protected routes (`resolveRequestAuth`). It runs the heuristic first. Only when `needsAi` is true does `src/lib/masspost/suggest-mapping-ai.ts` call the Vercel AI Gateway (`ai` package, `provider/model` string). The model sees the system note for Comp 90–93 plus a JSON object `{ headers, localeHints }` — **not** the sheet. The response is Zod-parsed and every chosen column must be one of the headers, each used at most once. Without `MASSPOST_SUGGEST_MAPPING_MODEL` the route answers **503** `ai_not_configured` and still returns the local `suggestion` for a human to confirm. Nothing is applied to `convertExcelToMailingRequest` automatically.

Masked sample cells are intentionally not sent (later). Do not post `rows` in the JSON body; the schema rejects unknown keys.

### Transport

```ts
import { sendMailingRequestViaHttp, sendXmlViaFtp, getHttpCredentials, getFtpCredentials } from '@/core/masspost'

await sendMailingRequestViaHttp(validatedRequest, getHttpCredentials())
await sendXmlViaFtp(xmlString, 'MID_0200_….XML', getFtpCredentials())
```

---

## Typical workflows

### A. Portal Create (Status 100 smoke)

```bash
npm run generate:mailing-xml -- --simple
# Upload docs/samples/contrapunt/generated/MID_0200_…_0RQ.XML in e-MassPost (test)
```

### B. OptiAddress corrections

```bash
npm run generate:mailing-xml -- --opti --limit 10
# Upload → download 2RS → look for message code 7001 + compCorrection
```

Live response shape: [field findings](./e-masspost/docs/reference/field-findings.md). Fixtures: `docs/samples/contrapunt/bpost-roundtrip/`.

### C. Same 200 addresses: AFT vs XML

```bash
npx tsx scripts/build-compare-200.ts
npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx
# Portal: upload testadressen-200-aft.xls via Address File Tool
```

### D. Recommended production-shaped loop (once mode C/P allowed)

1. `MailingCheck` on ≥500 addresses  
2. Apply `7001` / `compCorrection`, re-Check  
3. `MailingCreate` only if compliance **> 98%**  
4. Send XML via **FTP** (after Connection & Security Test)

`FORCE_TEST_MODE` and mode=`T` (max 200) block step 1 at 500 today — flip only after certification sign-off.

---

## Tests

```bash
npm test -- tests/core/masspost
```

Coverage includes excel, mapping, suggest-mapping, charset, build-request, pipeline, credentials, file-naming, parse-response, compare-sample. The suggest route is covered with a mocked AI call (`tests/app/api/masspost/suggest-mapping/`).

---

## Related scripts (not masspost product)

| Script | Purpose |
|--------|---------|
| `npm run seed` | Demo tenant for MCP multi-tenant path |
| `npm run generate:server-manifest` / `validate:server-manifest` | MCP registry manifest |
| `prebuild` → `extract-tool-metadata.ts` | MCP tool metadata for the app |

Those are out of scope for Contrapunt masspost automation.
