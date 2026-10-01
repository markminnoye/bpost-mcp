[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildMailingReuseRequest

# Function: buildMailingReuseRequest()

> **buildMailingReuseRequest**(`params`, `credentials`): `object`

MailingRequest with only MailingReuse: a new mailing built on an existing list.
bpost answers MID-3061 when the source does not exist and MID-3062 when it was created manually.

## Parameters

### params

[`BuildReuseParams`](../interfaces/BuildReuseParams.md)

New and source `mailingRef`, plus the deposit identifier. `mode` is ignored while `FORCE_TEST_MODE` is true.

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

A MailingRequest that contains only `MailingReuse`.

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

### MailingReuse

> **MailingReuse**: `object`[]
