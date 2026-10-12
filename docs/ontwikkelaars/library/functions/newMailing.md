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

### modified

> **modified**: `object` = `stamp`

#### modified.at

> **at**: `string`

#### modified.by

> **by**: `string`

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
