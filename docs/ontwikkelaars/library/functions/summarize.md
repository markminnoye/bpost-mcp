[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / summarize

# Function: summarize()

> **summarize**(`m`): [`MailingSummary`](../interfaces/MailingSummary.md)

The fields of a mailing the list needs.

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

## Returns

[`MailingSummary`](../interfaces/MailingSummary.md)

Its summary.
