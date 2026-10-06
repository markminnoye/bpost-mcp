[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / proposeFieldValue

# Function: proposeFieldValue()

> **proposeFieldValue**(`value`, `field`): `string` \| `undefined`

Proposes a value that passes `checkFieldValue`. Removes `|`, tabs, line breaks and emoji, swaps
characters via `normalizeForBpost`, collapses spaces, splits `12/3` into `12 bus 3` in the
street block (the slash split writes the canonical box word `BOX_CANONICAL`, whatever the
address language; French "bte" and "boîte" stay untouched), and abbreviates (`ABBREVIATIONS`)
when the value is too long. The proposal is for the user to confirm; nothing is applied here.

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
