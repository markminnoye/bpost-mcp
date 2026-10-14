[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / HttpCredentials

# Interface: HttpCredentials

HTTP Basic Auth credentials plus the ids a MailingRequest must repeat.

## Properties

### accountId

> **accountId**: `string`

PBC account id — Header/@accountId.

***

### barcodeCustomerId?

> `optional` **barcodeCustomerId?**: `string`

Mail ID barcode program id (5 digits), optional until you generate MID numbers.

***

### customerFileRef

> **customerFileRef**: `string`

RequestProps customerFileRef and filename NNNNNNNNNN token (exactly 10 chars after normalize).

***

### customerId

> **customerId**: `string`

PRS id — Context/@sender and Header/@customerId (same value).

***

### midVersion

> **midVersion**: [`MidProtocolVersion`](../type-aliases/MidProtocolVersion.md)

MID file version in Context and filename. Contrapunt: locked to 0200 (v2.00).

***

### password

> **password**: `string`

***

### username

> **username**: `string`
