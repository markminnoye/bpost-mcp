[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BuildDeleteParams

# Interface: BuildDeleteParams

Inputs for a MailingDelete.

## Properties

### allowNonTestMode?

> `optional` **allowNonTestMode?**: `boolean`

Escape hatch for the FORCE_TEST_MODE guard: the CLI, and the web app after an explicit choice per mailing (ADR 0010). Never from a route.

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
