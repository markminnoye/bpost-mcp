[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / proposeFieldValue

# Function: proposeFieldValue()

> **proposeFieldValue**(`value`, `field`): `string` \| `undefined`

Proposes a value that passes `checkFieldValue`. Removes `|`, tabs and line breaks, swaps
characters via `normalizeForBpost`, collapses spaces, writes `12/3` as `12 bus 3` in the street
block, and abbreviates (`ABBREVIATIONS`) when the value is too long. The proposal is for the user
to confirm; nothing is applied here.

## Parameters

### value

`string`

Current value of the block.

### field

[`AddressField`](../type-aliases/AddressField.md)

Unstructured block the value is sent in.

## Returns

`string` \| `undefined`

The proposal, or `undefined` when no safe fix exists or the value is already fine.

## Example

```ts
proposeFieldValue('Jan ’t Hooft', 'name') // "Jan 't Hooft"
```
