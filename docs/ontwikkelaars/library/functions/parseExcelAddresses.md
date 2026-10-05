[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / parseExcelAddresses

# Function: parseExcelAddresses()

> **parseExcelAddresses**(`input`): `Promise`\<[`ParsedExcel`](../interfaces/ParsedExcel.md)\>

Reads a raw customer address list (.xlsx, or .xls from Excel 97-2003). The first row must
contain column titles; every other row is one address. Blank rows are skipped. A column with
an empty title is ignored. Other formats (such as CSV) are refused rather than guessed at.

Deliberately does not attempt to split "street + number" or similar composite columns —
see docs/external/contrapunt-aft-converter/README.md point 1: Contrapunt's own tool maps
source columns straight into unstructured bpost fields, which is also this library's
default strategy (src/core/masspost/mapping.ts).

Runs in Node and in the browser. Values come back as strings, numbers or booleans; dates as
ISO strings; empty cells as `''`.

## Parameters

### input

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\> \| `Uint8Array`\<`ArrayBufferLike`\>

Workbook bytes (`Buffer`, or the `ArrayBuffer` of a browser `File`).

## Returns

`Promise`\<[`ParsedExcel`](../interfaces/ParsedExcel.md)\>

Column titles from row 1, the non-empty data rows and their spreadsheet row numbers.

## Example

```ts
const { headers, rows } = await parseExcelAddresses(fileBuffer)
```
