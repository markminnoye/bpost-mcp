[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / mailingRequestSchemaForVersion

# Function: mailingRequestSchemaForVersion()

> **mailingRequestSchemaForVersion**(`midVersion?`): `ZodType`\<\{ `Context`: \{ `dataset`: `"M037_MID"`; `receiver`: `"MID"`; `requestName`: `"MailingRequest"`; `sender`: `number`; `version`: `"0100"` \| `"0102"` \| `"0200"`; \}; `Header`: \{ `accountId`: `number`; `customerId`: `number`; `CustomerRefs?`: \{ `CustomerRef`: `object`[]; \}; `Files`: \{ `RequestProps`: \{ `customerFileRef`: `string`; \}; `ResponseProps?`: \{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \}; \}; `mode`: `"P"` \| `"T"` \| `"C"`; \}; `MailingCheck?`: `object`[]; `MailingCreate?`: `object`[]; `MailingDelete?`: `object`[]; `MailingReuse?`: `object`[]; \}, `unknown`, `$ZodTypeInternals`\<\{ `Context`: \{ `dataset`: `"M037_MID"`; `receiver`: `"MID"`; `requestName`: `"MailingRequest"`; `sender`: `number`; `version`: `"0100"` \| `"0102"` \| `"0200"`; \}; `Header`: \{ `accountId`: `number`; `customerId`: `number`; `CustomerRefs?`: \{ `CustomerRef`: `object`[]; \}; `Files`: \{ `RequestProps`: \{ `customerFileRef`: `string`; \}; `ResponseProps?`: \{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \}; \}; `mode`: `"P"` \| `"T"` \| `"C"`; \}; `MailingCheck?`: `object`[]; `MailingCreate?`: `object`[]; `MailingDelete?`: `object`[]; `MailingReuse?`: `object`[]; \}, `unknown`\>\>

XSD in repo is 0200-shaped; Contrapunt uses 0100 — no expectedDeliveryDate, no FileInfo on MailingCreate.

## Parameters

### midVersion?

[`MidProtocolVersion`](../type-aliases/MidProtocolVersion.md) = `'0100'`

Protocol version. `0100` and `0102` omit those two create fields. Default `0100`.

## Returns

`ZodType`\<\{ `Context`: \{ `dataset`: `"M037_MID"`; `receiver`: `"MID"`; `requestName`: `"MailingRequest"`; `sender`: `number`; `version`: `"0100"` \| `"0102"` \| `"0200"`; \}; `Header`: \{ `accountId`: `number`; `customerId`: `number`; `CustomerRefs?`: \{ `CustomerRef`: `object`[]; \}; `Files`: \{ `RequestProps`: \{ `customerFileRef`: `string`; \}; `ResponseProps?`: \{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \}; \}; `mode`: `"P"` \| `"T"` \| `"C"`; \}; `MailingCheck?`: `object`[]; `MailingCreate?`: `object`[]; `MailingDelete?`: `object`[]; `MailingReuse?`: `object`[]; \}, `unknown`, `$ZodTypeInternals`\<\{ `Context`: \{ `dataset`: `"M037_MID"`; `receiver`: `"MID"`; `requestName`: `"MailingRequest"`; `sender`: `number`; `version`: `"0100"` \| `"0102"` \| `"0200"`; \}; `Header`: \{ `accountId`: `number`; `customerId`: `number`; `CustomerRefs?`: \{ `CustomerRef`: `object`[]; \}; `Files`: \{ `RequestProps`: \{ `customerFileRef`: `string`; \}; `ResponseProps?`: \{ `compressed?`: `"N"` \| `"Y"`; `encrypted?`: `"N"` \| `"Y"`; `format?`: `"XML"` \| `"TXT"`; `transmissionMode?`: `"HTTP"` \| `"HTTPS"` \| `"FTP"` \| `"FTPS"`; \}; \}; `mode`: `"P"` \| `"T"` \| `"C"`; \}; `MailingCheck?`: `object`[]; `MailingCreate?`: `object`[]; `MailingDelete?`: `object`[]; `MailingReuse?`: `object`[]; \}, `unknown`\>\>

A Zod schema that still requires at least one mailing action.
