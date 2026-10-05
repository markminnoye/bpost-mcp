[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / mapRows

# Function: mapRows()

> **mapRows**(`rows`, `mapping`, `options?`): [`MappingResult`](../interfaces/MappingResult.md)

Maps parsed Excel rows onto the unstructured Comp fields (and the country), reporting every
 truncation and every empty required field instead of silently accepting or cutting them.

## Parameters

### rows

`Record`\<`string`, `unknown`\>[]

Records keyed by the Excel header, as returned by `parseExcelAddresses`.

### mapping

[`ColumnMapping`](../interfaces/ColumnMapping.md)

Source columns for the name, street, postcode and optional company and country blocks.

### options?

[`MapRowsOptions`](../interfaces/MapRowsOptions.md) = `{}`

`rowNumbers` makes `seq` the spreadsheet row number. Without it, `seq` is 1, 2, 3, …

## Returns

[`MappingResult`](../interfaces/MappingResult.md)

Mapped rows and warnings, in input order.

## Example

```ts
const { rows, warnings } = mapRows(parsed.rows, {
  name: ['Naam'],
  streetHouseBox: ['Straat'],
  postcodeCity: ['Postcode', 'Gemeente'],
}, { rowNumbers: parsed.rowNumbers })
```
