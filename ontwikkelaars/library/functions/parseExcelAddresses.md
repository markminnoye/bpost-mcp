[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / parseExcelAddresses

# Function: parseExcelAddresses()

> **parseExcelAddresses**(`input`): `Promise`\<[`ParsedExcel`](../interfaces/ParsedExcel.md)\>

Reads a raw customer address list (.xlsx). The first row must contain column titles;
every other row is one address. Blank rows are skipped.

Deliberately does not attempt to split "street + number" or similar composite columns —
see docs/external/contrapunt-aft-converter/README.md point 1: Contrapunt's own tool maps
source columns straight into unstructured bpost fields, which is also this library's
default strategy (src/core/masspost/mapping.ts).

## Parameters

### input

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

Workbook bytes (`Buffer` or `ArrayBuffer`).

## Returns

`Promise`\<[`ParsedExcel`](../interfaces/ParsedExcel.md)\>

Column titles from row 1 and the non-empty data rows.

## Example

```ts
const { headers, rows } = await parseExcelAddresses(fileBuffer)
```
