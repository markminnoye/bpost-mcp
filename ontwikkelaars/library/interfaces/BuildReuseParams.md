[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BuildReuseParams

# Interface: BuildReuseParams

Inputs for a MailingReuse.

## Properties

### allowNonTestMode?

> `optional` **allowNonTestMode?**: `boolean`

CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route.

***

### customerFileRef

> **customerFileRef**: `string`

***

### depositIdentifier

> **depositIdentifier**: `string`

Deposit the new mailing is attached to. Required by the XSD.

***

### depositIdentifierType?

> `optional` **depositIdentifierType?**: `"depositRef"` \| `"tmpDepositNr"`

***

### mailingRef

> **mailingRef**: `string`

`mailingRef` of the new mailing.

***

### mode

> **mode**: `"P"` \| `"T"` \| `"C"`

***

### sourceMailingRef

> **sourceMailingRef**: `string`

`mailingRef` of the existing mailing list to reuse.
