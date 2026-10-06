[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildMailingDeleteRequest

# Function: buildMailingDeleteRequest()

> **buildMailingDeleteRequest**(`params`, `credentials`): `object`

MailingRequest with only MailingDelete. bpost's way to correct a mailing: delete it,
then create a new one under a new `mailingRef` (the barcodes change; only the latest are valid).

## Parameters

### params

[`BuildDeleteParams`](../interfaces/BuildDeleteParams.md)

Mailing to delete. `mode` is ignored while `FORCE_TEST_MODE` is true.

### credentials

Customer and account ids, plus an optional MID version.

#### accountId

`string`

#### customerId

`string`

#### midVersion?

[`MidProtocolVersion`](../type-aliases/MidProtocolVersion.md)

## Returns

`object`

A MailingRequest that contains only `MailingDelete`.

### Context

> **Context**: `object`

#### Context.dataset

> **dataset**: `"M037_MID"`

#### Context.receiver

> **receiver**: `"MID"`

#### Context.requestName

> **requestName**: `"MailingRequest"`

#### Context.sender

> **sender**: `number` = `customerId`

#### Context.version

> **version**: [`MidProtocolVersion`](../type-aliases/MidProtocolVersion.md) = `midVersion`

### Header

> **Header**: `object`

#### Header.accountId

> **accountId**: `number`

#### Header.customerId

> **customerId**: `number`

#### Header.Files

> **Files**: `object`

#### Header.Files.RequestProps

> **RequestProps**: `object`

#### Header.Files.RequestProps.customerFileRef

> **customerFileRef**: `string` = `params.customerFileRef`

#### Header.mode

> **mode**: `"P"` \| `"T"` \| `"C"` = `effectiveMode`

### MailingDelete

> **MailingDelete**: `object`[]
