[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / createMailingRef

# Function: createMailingRef()

> **createMailingRef**(`code`, `n`): `string`

`mailingRef` of the n-th submission: the code itself the first time (decision 17 of 11/10), then
`<code>-2`, `-3`… (e.g. Production after Test).

## Parameters

### code

`string`

The code of the mailing.

### n

`number`

1 for the first submission.

## Returns

`string`

At most 20 characters.
