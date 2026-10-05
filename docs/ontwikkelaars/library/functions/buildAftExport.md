[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildAftExport

# Function: buildAftExport()

> **buildAftExport**(`input`): `Uint8Array`

Builds the file to upload in the Address File Tool: the 39 template columns in their fixed order
(sheet `Sheet0`), with `SEQ`, the unstructured name, company, street and postcode blocks, the
country for an address outside Belgium (`ISO_COUNTRY_CODE` for a two-letter code, otherwise
`COUNTRY_NAME`) and `PRIORITY`. Excluded rows are left out; corrections replace mapped values.
The other columns stay empty: bpost forbids mixing structured and unstructured within one group.

## Parameters

### input

[`AftExportInput`](../interfaces/AftExportInput.md)

Parsed rows with their row numbers, the column mapping, corrections and exclusions.

## Returns

`Uint8Array`

The workbook as Excel 97-2003 (.xls) bytes.

## Example

```ts
const bytes = buildAftExport({ rows: parsed.rows, rowNumbers: parsed.rowNumbers, mapping })
```
