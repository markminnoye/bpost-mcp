[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildMailingRequest

# Function: buildMailingRequest()

> **buildMailingRequest**(`items`, `params`, `credentials`): `object`

Assembles the full MailingRequest object (Context + Header + MailingCreate/Items).

## Parameters

### items

`object`[]

Items from `rowsToItems`.

### params

[`BuildRequestParams`](../interfaces/BuildRequestParams.md)

Create parameters. Delivery date and file info are included only for protocol `0200`.

### credentials

Customer and account ids, plus an optional MID version (default `0200`).

#### accountId

`string`

#### customerId

`string`

#### midVersion?

[`MidProtocolVersion`](../type-aliases/MidProtocolVersion.md)

## Returns

`object`

A plain object suitable for `validateMailingRequest`.

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

### MailingCreate

> **MailingCreate**: `Record`\<`string`, `unknown`\>[]
