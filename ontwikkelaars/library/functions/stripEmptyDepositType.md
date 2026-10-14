[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / stripEmptyDepositType

# Function: stripEmptyDepositType()

> **stripEmptyDepositType**(`data`): `void`

Removes `depositIdentifierType` from actions without a `depositIdentifier`: bpost refuses the
attribute on its own.

## Parameters

### data

A validated MailingRequest; changed in place.

#### Context

\{ `dataset`: `"M037_MID"`; `receiver`: `"MID"`; `requestName`: `"MailingRequest"`; `sender`: `number`; `version`: `"0100"` \| `"0102"` \| `"0200"`; \} = `MailingContextSchema`

#### Context.dataset

`"M037_MID"` = `...`

#### Context.receiver

`"MID"` = `...`

#### Context.requestName

`"MailingRequest"` = `...`

#### Context.sender

`number` = `...`

#### Context.version

`"0100"` \| `"0102"` \| `"0200"` = `...`

#### Header

\{ `accountId`: `number`; `customerId`: `number`; `CustomerRefs?`: \{ `CustomerRef`: `object`[]; \}; `Files`: \{ `RequestProps`: \{ `customerFileRef`: `string`; \}; `ResponseProps?`: \{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \}; \}; `mode`: `"P"` \| `"T"` \| `"C"`; \} = `HeaderSchema`

#### Header.accountId

`number` = `...`

#### Header.customerId

`number` = `...`

#### Header.CustomerRefs?

\{ `CustomerRef`: `object`[]; \} = `...`

#### Header.CustomerRefs.CustomerRef

`object`[] = `...`

#### Header.Files

\{ `RequestProps`: \{ `customerFileRef`: `string`; \}; `ResponseProps?`: \{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \}; \} = `...`

#### Header.Files.RequestProps

\{ `customerFileRef`: `string`; \} = `RequestPropsSchema`

#### Header.Files.RequestProps.customerFileRef

`string` = `...`

XSD: minLength=1 (within StringType10)

#### Header.Files.ResponseProps?

\{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \} = `...`

#### Header.Files.ResponseProps.compressed?

`"N"` \| `"Y"` = `...`

#### Header.Files.ResponseProps.encrypted?

`"N"` \| `"Y"` = `...`

#### Header.Files.ResponseProps.format?

`"XML"` \| `"TXT"` = `...`

#### Header.Files.ResponseProps.transmissionMode?

`"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"` = `...`

#### Header.mode

`"P"` \| `"T"` \| `"C"` = `...`

#### MailingCheck?

`object`[] = `...`

#### MailingCreate?

`object`[] = `...`

#### MailingDelete?

`object`[] = `...`

#### MailingReuse?

`object`[] = `...`

## Returns

`void`
