[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildMailingCheckRequest

# Function: buildMailingCheckRequest()

> **buildMailingCheckRequest**(`items`, `params`, `credentials`): `object`

OptiAddress: MailingRequest with only MailingCheck (no Format/FileInfo/expectedDeliveryDate).
Ask for suggestions via suggestionsCount + copyRequestItem.

## Parameters

### items

`object`[]

Items from `rowsToItems`. Each item gets `lang: "nl"` when language is missing.

### params

[`BuildCheckParams`](../interfaces/BuildCheckParams.md)

Check parameters. Defaults: `copyRequestItem` Y, 5 suggestions, minimum score 60.

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

A MailingRequest that contains only `MailingCheck`.

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

### MailingCheck

> **MailingCheck**: `object`[]
