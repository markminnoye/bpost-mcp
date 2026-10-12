[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / applyChange

# Function: applyChange()

> **applyChange**(`m`, `change`, `by`, `event`, `now`): `object`

Applies a change: raises the revision, sets `modified` and adds a log entry. Does not check the
revision; the store does that.

## Parameters

### m

The current mailing.

#### archived

`boolean` = `...`

#### arr

`number` \| `null` = `...`

#### code

`string` = `...`

#### corrections

`Record`\<`string`, `string`\> = `...`

Corrected values, keyed `<seq>:<field>` as in the format step.

#### counts

\{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \} = `...`

#### counts.addresses

`number` = `...`

#### counts.formatIssuesOpen

`number` \| `null` = `...`

#### created

\{ `at`: `string`; `by`: `string`; \} = `stamp`

#### created.at

`string` = `...`

#### created.by

`string` = `...`

#### customer

\{ `crmId`: `string` \| `null`; `name`: `string`; \} = `...`

#### customer.crmId

`string` \| `null` = `...`

#### customer.name

`string` = `...`

#### excludedRows

`number`[] = `...`

Excluded rows, by `seq` (the Excel row number).

#### expectedDeliveryDate

`string` = `...`

#### format

`"Large"` \| `"Small"` = `...`

#### genMID

`"7"` \| `"9"` \| `"11"` \| `"N"` = `...`

#### genPSC

`"N"` \| `"Y"` = `...`

#### id

`string` = `...`

#### log

`object`[] = `...`

#### mapping

\{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null` = `...`

#### modified

\{ `at`: `string`; `by`: `string`; \} = `stamp`

#### modified.at

`string` = `...`

#### modified.by

`string` = `...`

#### priority

`"P"` \| `"NP"` = `...`

#### revision

`number` = `...`

#### roundAndSequence

`boolean` = `...`

#### schemaVersion

`1` = `...`

#### source

\{ `name`: `string`; `sha256`: `string`; `size`: `number`; \} = `...`

#### source.name

`string` = `...`

#### source.sha256

`string` = `...`

#### source.size

`number` = `...`

#### status

`"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"` = `...`

#### title

`string` = `...`

### change

`Partial`\<`Pick`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}, `"format"` \| `"priority"` \| `"expectedDeliveryDate"` \| `"genMID"` \| `"genPSC"` \| `"title"` \| `"customer"` \| `"roundAndSequence"` \| `"status"` \| `"mapping"` \| `"corrections"` \| `"excludedRows"` \| `"counts"` \| `"arr"`\>\> & `object`

The fields to change.

### by

`string`

E-mail of the user.

### event

`string`

Log event, e.g. `mapped`.

### now

`Date`

The time.

## Returns

The new mailing.

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
