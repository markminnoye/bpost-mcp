[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildPrinterExport

# Function: buildPrinterExport()

> **buildPrinterExport**(`input`): `Uint8Array`

Builds the export for the printer: the original first sheet with two columns added at the end
("Meesturen" and "Volgnummer bpost"). No row is removed or moved, blank rows included, so the
original file, our data, the XML for bpost and bpost's answer stay linked row by row.
Other sheets are kept. Cell styling is not (SheetJS Community Edition writes data only).

## Parameters

### input

[`PrinterExportInput`](../interfaces/PrinterExportInput.md)

The original workbook (optional), the parsed rows and the excluded row numbers.

## Returns

`Uint8Array`

The .xlsx bytes.

## Example

```ts
const bytes = buildPrinterExport({ source: fileBytes, parsed, excludedRowNumbers: new Set([977]) })
```
