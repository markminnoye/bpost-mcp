[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / RequestFile

# Interface: RequestFile

The file to put in the mailbox, and what the mailing remembers of it.

## Properties

### bytes

> **bytes**: `Uint8Array`

The XML as ISO-8859-1.

***

### fileName

> **fileName**: `string`

Canonical bpost name, `MID_0200_<sender>_REFERENCE0_<time>_0RQ.XML`.

***

### fingerprint

> **fingerprint**: `string`

***

### items

> **items**: `number`

Number of addresses in the file.

***

### kind

> **kind**: `"check"` \| `"create"`

***

### mailingRef

> **mailingRef**: `string`

***

### mode

> **mode**: [`BpostMode`](../type-aliases/BpostMode.md)
