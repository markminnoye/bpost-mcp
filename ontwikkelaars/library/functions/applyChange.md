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

\{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \} = `...`

#### counts.addresses

`number` = `...`

#### counts.check?

\{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \} = `...`

Addresses per group of the last address check (design 13/10, part 2).

#### counts.check.multiple

`number` = `...`

#### counts.check.noAddress

`number` = `...`

#### counts.check.note

`number` = `...`

#### counts.check.ok

`number` = `...`

#### counts.check.proposal

`number` = `...`

#### counts.foreign?

`number` \| `null` = `...`

Addresses outside Belgium, as the step bar counts them. Absent or null: not counted yet.

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

#### exchanges?

`object`[] = `...`

Files sent to bpost and their state (design 13/10, part 2).

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

#### mode?

`"P"` \| `"T"` \| `"C"` = `...`

Mode at e-MassPost: Test, Certification or Production (design 13/10, decision 14). Absent: Production.

#### modified

\{ `at`: `string`; `by`: `string`; \} = `stamp`

#### modified.at

`string` = `...`

#### modified.by

`string` = `...`

#### notifyEmail?

`string` = `...`

E-mail for the Contacts block so e-MassPost can mail when a check or create is done.
Absent or empty: no Contacts in the XML. Max 100 characters (bpost).

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

`Partial`\<`Pick`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `notifyEmail?`: `string`; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}, `"format"` \| `"priority"` \| `"mode"` \| `"expectedDeliveryDate"` \| `"genMID"` \| `"genPSC"` \| `"title"` \| `"customer"` \| `"roundAndSequence"` \| `"notifyEmail"` \| `"status"` \| `"mapping"` \| `"corrections"` \| `"excludedRows"` \| `"counts"` \| `"arr"` \| `"exchanges"`\>\> & `object`

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
