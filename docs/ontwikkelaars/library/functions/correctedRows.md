[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / correctedRows

# Function: correctedRows()

> **correctedRows**(`rows`, `corrections`, `excludedRows`): [`MappedRow`](../interfaces/MappedRow.md)[]

The rows that go to bpost: excluded rows left out, corrections (by `<seq>:<field>`) applied.

## Parameters

### rows

readonly [`MappedRow`](../interfaces/MappedRow.md)[]

Output of `mapRows` with the spreadsheet row numbers.

### corrections

`Readonly`\<`Record`\<`string`, `string`\>\>

Corrected values by `<seq>:<field>` (steps 3 and 4 share them).

### excludedRows

readonly `number`[]

Row numbers left out of the mailing.

## Returns

[`MappedRow`](../interfaces/MappedRow.md)[]

New rows; the input is not changed.

## Example

```ts
correctedRows(rows, { '2:streetHouseBox': 'Kerkstraat 1 bus 2' }, [977])
```
