[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / MailingStore

# Interface: MailingStore

Where mailings live. v1: IndexedDB in the browser; later Google Drive (ADR 0007), behind the same
interface. Every write raises `revision`; `update` with an older revision is refused.

## Methods

### archive()

> **archive**(`id`, `by`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Moves the mailing to the archive.

#### Parameters

##### id

`string`

##### by

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

***

### create()

> **create**(`input`, `file`, `by`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Creates the mailing with its Excel file. Throws `CodeTakenError` when the code exists.

#### Parameters

##### input

[`NewMailing`](NewMailing.md)

##### file

`Blob`

##### by

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

***

### findByCode()

> **findByCode**(`code`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

The mailing with this code (case-insensitive), or null.

#### Parameters

##### code

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

***

### get()

> **get**(`id`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

One mailing, or null when unknown. Throws `UnreadableMailingError` when it fails the schema.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

***

### getFile()

> **getFile**(`id`, `path`): `Promise`\<`Blob` \| `null`\>

A file of the mailing, or null.

#### Parameters

##### id

`string`

##### path

`string`

#### Returns

`Promise`\<`Blob` \| `null`\>

***

### getSourceFile()

> **getSourceFile**(`id`): `Promise`\<`Blob` \| `null`\>

The Excel file of the mailing, or null.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`Blob` \| `null`\>

***

### list()

> **list**(): `Promise`\<[`MailingListItem`](../type-aliases/MailingListItem.md)[]\>

All mailings, archived ones included, unsorted.

#### Returns

`Promise`\<[`MailingListItem`](../type-aliases/MailingListItem.md)[]\>

***

### listFiles()

> **listFiles**(`id`, `prefix`): `Promise`\<`string`[]\>

Paths of the files of the mailing that start with `prefix`, sorted.

#### Parameters

##### id

`string`

##### prefix

`string`

#### Returns

`Promise`\<`string`[]\>

***

### restore()

> **restore**(`id`, `by`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Takes the mailing out of the archive.

#### Parameters

##### id

`string`

##### by

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

***

### saveFile()

> **saveFile**(`id`, `path`, `file`): `Promise`\<`void`\>

Saves a file of the mailing under a path (e.g. `e-masspost/…_0RQ.XML`); overwrites. Throws `MailingNotFoundError`.

#### Parameters

##### id

`string`

##### path

`string`

##### file

`Blob`

#### Returns

`Promise`\<`void`\>

***

### update()

> **update**(`id`, `change`, `expectedRevision`, `by`, `event`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Applies a change. Throws `RevisionConflictError` when `expectedRevision` is not the current one.

#### Parameters

##### id

`string`

##### change

[`MailingChange`](../type-aliases/MailingChange.md)

##### expectedRevision

`number`

##### by

`string`

##### event

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `check?`: \{ `multiple`: `number`; `noAddress`: `number`; `note`: `number`; `ok`: `number`; `proposal`: `number`; \}; `foreign?`: `number` \| `null`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `exchanges?`: `object`[]; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `mode?`: `"P"` \| `"T"` \| `"C"`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>
