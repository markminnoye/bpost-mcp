[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / processResponse

# Function: processResponse()

> **processResponse**(`m`, `fileName`, `xml`, `now`): [`ProcessOutcome`](../type-aliases/ProcessOutcome.md)

Processes a file bpost sent back: links it to the request by file name and gives the change.
An acknowledgement marks the exchange received; a result marks it processed (check: status
`checked`, ARR and counts; submission: `submitted`), or rejected without changing the status.

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

### fileName

`string`

Name of the response file.

### xml

`string`

Its text (ISO-8859-1 decoded).

### now

`Date`

The time.

## Returns

[`ProcessOutcome`](../type-aliases/ProcessOutcome.md)

`applied` with the change, or why nothing changes.

## Example

```ts
const r = processResponse(mailing, file.name, decodeLatin1(file.bytes), new Date())
if (r.outcome === 'applied') await store.update(mailing.id, r.change, mailing.revision, user, r.event)
```
