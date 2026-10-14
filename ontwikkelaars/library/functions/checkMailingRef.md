[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / checkMailingRef

# Function: checkMailingRef()

> **checkMailingRef**(`code`, `n`): `string`

`mailingRef` of the n-th address check of a mailing: bpost wants a new one for every check.

## Parameters

### code

`string`

The code of the mailing.

### n

`number`

1 for the first check.

## Returns

`string`

At most 20 characters, e.g. `CP-2026-15-C2`.
