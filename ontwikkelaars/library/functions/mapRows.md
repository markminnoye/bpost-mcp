[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / mapRows

# Function: mapRows()

> **mapRows**(`rows`, `mapping`): [`MappingResult`](../interfaces/MappingResult.md)

Maps parsed Excel rows onto the unstructured Comp fields, reporting every truncation and
 every empty required field instead of silently accepting or cutting them.

## Parameters

### rows

`Record`\<`string`, `unknown`\>[]

Records keyed by the Excel header, as returned by `parseExcelAddresses`.

### mapping

[`ColumnMapping`](../interfaces/ColumnMapping.md)

Source columns for the name, street, and postcode blocks.

## Returns

[`MappingResult`](../interfaces/MappingResult.md)

Mapped rows and warnings, in input order.

## Example

```ts
const { rows, warnings } = mapRows(parsed.rows, {
  name: ['Naam'],
  streetHouseBox: ['Straat'],
  postcodeCity: ['Postcode', 'Gemeente'],
})
```
