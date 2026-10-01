[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ValidationResult

# Interface: ValidationResult

Outcome of `validateMailingRequest`. `data` is set only when `valid` is true.

## Properties

### data?

> `optional` **data?**: `object`

#### Context

> **Context**: `object` = `MailingContextSchema`

##### Context.dataset

> **dataset**: `"M037_MID"`

##### Context.receiver

> **receiver**: `"MID"`

##### Context.requestName

> **requestName**: `"MailingRequest"`

##### Context.sender

> **sender**: `number`

##### Context.version

> **version**: `"0100"` \| `"0102"` \| `"0200"`

#### Header

> **Header**: `object` = `HeaderSchema`

##### Header.accountId

> **accountId**: `number`

##### Header.customerId

> **customerId**: `number`

##### Header.CustomerRefs?

> `optional` **CustomerRefs?**: `object`

##### Header.CustomerRefs.CustomerRef

> **CustomerRef**: `object`[]

##### Header.Files

> **Files**: `object`

##### Header.Files.RequestProps

> **RequestProps**: `object` = `RequestPropsSchema`

##### Header.Files.RequestProps.customerFileRef

> **customerFileRef**: `string`

XSD: minLength=1 (within StringType10)

##### Header.Files.ResponseProps?

> `optional` **ResponseProps?**: `object`

##### Header.Files.ResponseProps.compressed?

> `optional` **compressed?**: `"N"` \| `"Y"`

##### Header.Files.ResponseProps.encrypted?

> `optional` **encrypted?**: `"N"` \| `"Y"`

##### Header.Files.ResponseProps.format?

> `optional` **format?**: `"XML"` \| `"TXT"`

##### Header.Files.ResponseProps.transmissionMode?

> `optional` **transmissionMode?**: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`

##### Header.mode

> **mode**: `"P"` \| `"T"` \| `"C"`

#### MailingCheck?

> `optional` **MailingCheck?**: `object`[]

#### MailingCreate?

> `optional` **MailingCreate?**: `object`[]

#### MailingDelete?

> `optional` **MailingDelete?**: `object`[]

#### MailingReuse?

> `optional` **MailingReuse?**: `object`[]

***

### issues

> **issues**: [`ValidationIssue`](ValidationIssue.md)[]

***

### valid

> **valid**: `boolean`
