[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / PrinterExportInput

# Interface: PrinterExportInput

Input for `buildPrinterExport`.

## Properties

### excludedRowNumbers

> **excludedRowNumbers**: `ReadonlySet`\<`number`\>

Row numbers of the rows left out of the mailing.

***

### parsed

> **parsed**: [`ParsedExcel`](ParsedExcel.md)

The same workbook as read by `parseExcelAddresses`: which rows hold an address.

***

### source?

> `optional` **source?**: `ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>

The customer's original workbook. Without it, the sheet is rebuilt from `parsed`.
