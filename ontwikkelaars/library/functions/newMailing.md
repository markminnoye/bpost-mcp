[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / newMailing

# Function: newMailing()

> **newMailing**(`id`, `input`, `by`, `now`): `object`

A new mailing as stored: status `uploaded`, revision 1, one log entry.

## Parameters

### id

`string`

Store id.

### input

[`NewMailing`](../interfaces/NewMailing.md)

Details, source and number of addresses.

### by

`string`

E-mail of the user.

### now

`Date`

The time.

## Returns

The mailing.

### archived

> **archived**: `boolean`

### arr

> **arr**: `number` \| `null`

### code

> **code**: `string`

### corrections

> **corrections**: `Record`\<`string`, `string`\>

Corrected values, keyed `<seq>:<field>` as in the format step.

### counts

> **counts**: `object`

#### counts.addresses

> **addresses**: `number`

#### counts.check?

> `optional` **check?**: `object`

Addresses per group of the last address check (design 13/10, part 2).

#### counts.check.multiple

> **multiple**: `number`

#### counts.check.noAddress

> **noAddress**: `number`

#### counts.check.note

> **note**: `number`

#### counts.check.ok

> **ok**: `number`

#### counts.check.proposal

> **proposal**: `number`

#### counts.foreign?

> `optional` **foreign?**: `number` \| `null`

Addresses outside Belgium, as the step bar counts them. Absent or null: not counted yet.

#### counts.formatIssuesOpen

> **formatIssuesOpen**: `number` \| `null`

### created

> **created**: `object` = `stamp`

#### created.at

> **at**: `string`

#### created.by

> **by**: `string`

### customer

> **customer**: `object`

#### customer.crmId

> **crmId**: `string` \| `null`

#### customer.name

> **name**: `string`

### exchanges?

> `optional` **exchanges?**: `object`[]

Files sent to bpost and their state (design 13/10, part 2).

### excludedRows

> **excludedRows**: `number`[]

Excluded rows, by `seq` (the Excel row number).

### expectedDeliveryDate

> **expectedDeliveryDate**: `string`

### format

> **format**: `"Large"` \| `"Small"`

### genMID

> **genMID**: `"7"` \| `"9"` \| `"11"` \| `"N"`

### genPSC

> **genPSC**: `"N"` \| `"Y"`

### id

> **id**: `string`

### log

> **log**: `object`[]

### mapping

> **mapping**: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`

### mode?

> `optional` **mode?**: `"P"` \| `"T"` \| `"C"`

Mode at e-MassPost: Test, Certification or Production (design 13/10, decision 14). Absent: Production.

### modified

> **modified**: `object` = `stamp`

#### modified.at

> **at**: `string`

#### modified.by

> **by**: `string`

### notifyEmail?

> `optional` **notifyEmail?**: `string`

E-mail for the Contacts block so e-MassPost can mail when a check or create is done.
Absent or empty: no Contacts in the XML. Max 100 characters (bpost).

### priority

> **priority**: `"P"` \| `"NP"`

### revision

> **revision**: `number`

### roundAndSequence

> **roundAndSequence**: `boolean`

### schemaVersion

> **schemaVersion**: `1`

### source

> **source**: `object`

#### source.name

> **name**: `string`

#### source.sha256

> **sha256**: `string`

#### source.size

> **size**: `number`

### status

> **status**: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`

### title

> **title**: `string`
