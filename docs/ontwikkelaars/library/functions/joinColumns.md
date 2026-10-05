[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / joinColumns

# Function: joinColumns()

> **joinColumns**(`row`, `columns`): `string`

Joins the non-empty, trimmed values of `columns` with a space, in the given order.

## Parameters

### row

`Record`\<`string`, `unknown`\>

One record keyed by the Excel header.

### columns

readonly `string`[]

Source columns of one unstructured block.

## Returns

`string`

The raw block value, before any character fix or length cap.

## Example

```ts
joinColumns({ Postcode: 9340, Gemeente: 'Lede' }, ['Postcode', 'Gemeente']) // '9340 Lede'
```
