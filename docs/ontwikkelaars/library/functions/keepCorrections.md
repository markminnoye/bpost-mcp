[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / keepCorrections

# Function: keepCorrections()

> **keepCorrections**(`corrections`, `before`, `after`): `Record`\<`string`, `string`\>

The corrections that stay valid after the mapping changed: those of a field (address block) whose
columns stayed the same, in the same order. A correction hangs on `<row>:<field>`; when the columns
of that field change, its original value changes too, so the correction no longer fits (Mark, 13/10;
before, every mapping change dropped all corrections).

## Parameters

### corrections

`Readonly`\<`Record`\<`string`, `string`\>\>

The corrections, by `<row>:<field>`.

### before

[`ColumnMapping`](../interfaces/ColumnMapping.md)

The mapping the corrections were made on.

### after

[`ColumnMapping`](../interfaces/ColumnMapping.md)

The new mapping.

## Returns

`Record`\<`string`, `string`\>

The corrections of the fields that did not change.

## Example

```ts
keepCorrections({ '134:streetHouseBox': 'Kerkstraat 1 bus 1' }, before, { ...before, name: ['Naam'] })
// { '134:streetHouseBox': 'Kerkstraat 1 bus 1' }
```
