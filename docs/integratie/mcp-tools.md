# MCP-tools

De MCP-server staat op **`/mcp`** (streamable HTTP). `/api/mcp` blijft werken als legacy-alias. Alle tools vragen een geldig token, zie [Authenticatie](authenticatie.md). MCP zit niet in de [HTTP-API-spec](http-api.md).

Bron van deze pagina: de `registerTool`-aanroepen in `src/app/mcp/route.ts`. `npm run build` leest die uit naar `src/generated/tool-registry.json`.

## Batch-pipeline (CSV-mailings)

Voor een CSV-bestand loop je de stappen in deze volgorde door.

| Stap | Tool | Parameters |
|---|---|---|
| 1 | `upload_batch_file` | `fileName` (eindigt op `.csv`), `fileContentBase64` (UTF-8) |
| 1 (alternatief) | `get_upload_instructions` | geen. Geeft een `curl`-voorbeeld voor `POST /api/batches/upload` |
| 2 | `get_raw_headers` | `batchId` |
| 3 | `apply_mapping_rules` | `batchId`, `mapping` (kolomtitel → veldnaam) |
| 4 | `get_batch_errors` | `batchId`, `limit` (standaard 10) |
| 4b | `check_batch` | `batchId`, optioneel `mailingRef` (max 20), `mode` (`P`/`T`/`C`, standaard `T`), `customerFileRef` (max 10), `copyRequestItem`, `suggestionsCount` (0–9999, standaard 5), `suggestionsMinScore` (1–100, standaard 60), `pdpInResponse`, `allRecordInResponse` |
| 5 | `apply_row_fix` | `batchId`, `rowIndex` (vanaf 0), `correctedData` |
| 6 | `submit_ready_batch` | zie hieronder |

`check_batch` wijzigt niets aan de batch. Je mag hem herhalen.

### `submit_ready_batch`

Verplicht: `batchId`, `expectedDeliveryDate` (`YYYY-MM-DD`), `format` (`Large` of `Small`).

Optioneel: `mailingRef` (max 20), `priority` (`P` of `NP`, standaard `NP`), `mode` (`P`, `T`, `C`, standaard `T`), `customerFileRef` (max 10), `barcodeStrategy` (`bpost-generates`, `customer-provides`, `mcp-generates`; zonder waarde geldt de dashboardinstelling), `barcodeLength` (`7`, `9`, `11`; standaard 7; alleen bij `bpost-generates`), `genPSC` (`Y`/`N`, standaard `N`).

De batch moet `MAPPED` zijn zonder fouten. Na een geslaagde verzending staat hij op `SUBMITTED` en is hij vergrendeld. Rijen met fouten worden overgeslagen en in het antwoord vermeld.

`mode` en `priority` zijn verschillende dingen. `mode=P` is productie, `priority=P` is levering na één werkdag.

## Herstelscripts en kennis

| Tool | Parameters |
|---|---|
| `create_fix_script` | `name` (kebab-case: `a-z`, `0-9`, `-`), `code`, `description` |
| `apply_fix_script` | `batchId`, `rowIndex`, `scriptName` |
| `add_protocol_rule` | `rule`, `context` |
| `report_issue` | `title`, `body`. Maakt een GitHub-issue aan, of geeft een vooringevulde link als de server geen GitHub-token heeft |
| `get_service_info` | geen. Geeft naam en versie |

## Directe bpost-aanroepen

Niet bedoeld voor CSV-bestanden: die horen in de pipeline.

- `bpost_announce_mailing`: stuurt een kant-en-klare `MailingRequest`.
- `bpost_announce_deposit`: stuurt een `DepositRequest` (Create, Update, Delete of Validate). Een deposit koppel je aan een mailing via master/slave: is de deposit master, zet dan `depositRef` en laat `mailingRef` leeg.

## Resources en prompts

Resources: `bpost://guides/mapping-glossary`, `bpost://guides/mode-priority-matrix`, `bpost://guides/common-error-guidance`.

Prompts: `batch_onboarding_flow`, `batch_error_triage_fix_loop`, `submit_preflight_confirmation`.

## Mapping-doelen

`apply_mapping_rules` accepteert vriendelijke namen of `Comps.<code>`. Zie [Comp-codes en aliassen](comp-codes.md).
