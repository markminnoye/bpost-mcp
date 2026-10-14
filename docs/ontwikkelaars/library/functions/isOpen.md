[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isOpen

# Function: isOpen()

> **isOpen**(`row`, `values`, `excluded`): `boolean`

Whether a row still asks for something: an address not found, several found, or a proposal, as
long as the value is the one sent and the row is not excluded. Notes never block.

## Parameters

### row

[`CheckRow`](../interfaces/CheckRow.md)

The row.

### values

`Readonly`\<`Record`\<`string`, `string`\>\>

Corrections.

### excluded

`Readonly`\<`Record`\<`number`, `true`\>\>

Excluded rows by seq.

## Returns

`boolean`

True while open.
