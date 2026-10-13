[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / RevisionConflictError

# Class: RevisionConflictError

Someone else saved the mailing in the meantime. `current` is the stored version.

## Extends

- `Error`

## Constructors

### Constructor

> **new RevisionConflictError**(`current`): `RevisionConflictError`

#### Parameters

##### current

###### archived

`boolean` = `...`

###### arr

`number` \| `null` = `...`

###### code

`string` = `...`

###### corrections

`Record`\<`string`, `string`\> = `...`

Corrected values, keyed `<seq>:<field>` as in the format step.

###### counts

\{ `addresses`: `number`; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \} = `...`

###### counts.addresses

`number` = `...`

###### counts.foreign?

`number` \| `null` = `...`

Addresses outside Belgium, as the step bar counts them. Absent or null: not counted yet.

###### counts.formatIssuesOpen

`number` \| `null` = `...`

###### created

\{ `at`: `string`; `by`: `string`; \} = `stamp`

###### created.at

`string` = `...`

###### created.by

`string` = `...`

###### customer

\{ `crmId`: `string` \| `null`; `name`: `string`; \} = `...`

###### customer.crmId

`string` \| `null` = `...`

###### customer.name

`string` = `...`

###### excludedRows

`number`[] = `...`

Excluded rows, by `seq` (the Excel row number).

###### expectedDeliveryDate

`string` = `...`

###### format

`"Large"` \| `"Small"` = `...`

###### genMID

`"7"` \| `"9"` \| `"11"` \| `"N"` = `...`

###### genPSC

`"N"` \| `"Y"` = `...`

###### id

`string` = `...`

###### log

`object`[] = `...`

###### mapping

\{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null` = `...`

###### modified

\{ `at`: `string`; `by`: `string`; \} = `stamp`

###### modified.at

`string` = `...`

###### modified.by

`string` = `...`

###### priority

`"P"` \| `"NP"` = `...`

###### revision

`number` = `...`

###### roundAndSequence

`boolean` = `...`

###### schemaVersion

`1` = `...`

###### source

\{ `name`: `string`; `sha256`: `string`; `size`: `number`; \} = `...`

###### source.name

`string` = `...`

###### source.sha256

`string` = `...`

###### source.size

`number` = `...`

###### status

`"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"` = `...`

###### title

`string` = `...`

#### Returns

`RevisionConflictError`

#### Overrides

`Error.constructor`

## Properties

### current

> `readonly` **current**: `object`

#### archived

> **archived**: `boolean`

#### arr

> **arr**: `number` \| `null`

#### code

> **code**: `string`

#### corrections

> **corrections**: `Record`\<`string`, `string`\>

Corrected values, keyed `<seq>:<field>` as in the format step.

#### counts

> **counts**: `object`

##### counts.addresses

> **addresses**: `number`

##### counts.foreign?

> `optional` **foreign?**: `number` \| `null`

Addresses outside Belgium, as the step bar counts them. Absent or null: not counted yet.

##### counts.formatIssuesOpen

> **formatIssuesOpen**: `number` \| `null`

#### created

> **created**: `object` = `stamp`

##### created.at

> **at**: `string`

##### created.by

> **by**: `string`

#### customer

> **customer**: `object`

##### customer.crmId

> **crmId**: `string` \| `null`

##### customer.name

> **name**: `string`

#### excludedRows

> **excludedRows**: `number`[]

Excluded rows, by `seq` (the Excel row number).

#### expectedDeliveryDate

> **expectedDeliveryDate**: `string`

#### format

> **format**: `"Large"` \| `"Small"`

#### genMID

> **genMID**: `"7"` \| `"9"` \| `"11"` \| `"N"`

#### genPSC

> **genPSC**: `"N"` \| `"Y"`

#### id

> **id**: `string`

#### log

> **log**: `object`[]

#### mapping

> **mapping**: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`

#### modified

> **modified**: `object` = `stamp`

##### modified.at

> **at**: `string`

##### modified.by

> **by**: `string`

#### priority

> **priority**: `"P"` \| `"NP"`

#### revision

> **revision**: `number`

#### roundAndSequence

> **roundAndSequence**: `boolean`

#### schemaVersion

> **schemaVersion**: `1`

#### source

> **source**: `object`

##### source.name

> **name**: `string`

##### source.sha256

> **sha256**: `string`

##### source.size

> **size**: `number`

#### status

> **status**: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`

#### title

> **title**: `string`
