[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isWaiting

# Function: isWaiting()

> **isWaiting**(`m`): `boolean`

Whether the mailing waits for bpost: its last exchange was sent or acknowledged, not answered.

## Parameters

### m

The mailing.

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

## Returns

`boolean`

True while waiting.
