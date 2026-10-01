[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BuildDeleteParams

# Interface: BuildDeleteParams

Inputs for a MailingDelete.

## Properties

### allowNonTestMode?

> `optional` **allowNonTestMode?**: `boolean`

CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route.

***

### customerFileRef

> **customerFileRef**: `string`

***

### mailingRef

> **mailingRef**: `string`

`mailingRef` of the mailing list to delete.

***

### mode

> **mode**: `"P"` \| `"T"` \| `"C"`
