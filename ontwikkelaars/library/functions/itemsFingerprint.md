[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / itemsFingerprint

# Function: itemsFingerprint()

> **itemsFingerprint**(`rows`, `priority`): `Promise`\<`string`\>

A fingerprint of what goes to bpost: the same rows give the same value. Shows that the list changed
after it was sent (design 13/10, decision 3).

## Parameters

### rows

readonly [`MappedRow`](../interfaces/MappedRow.md)[]

The rows that go along (`correctedRows`).

### priority

`"P"` \| `"NP"`

Priority of the items.

## Returns

`Promise`\<`string`\>

64 hex characters.
