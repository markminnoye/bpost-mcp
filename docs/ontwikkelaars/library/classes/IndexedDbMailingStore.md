[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / IndexedDbMailingStore

# Class: IndexedDbMailingStore

`MailingStore` in the browser's IndexedDB (v1, SR-112 v1 decision 2). Stays on this device only.
A write reads, checks the revision and writes in one transaction, so two tabs cannot overwrite
each other.

## Implements

- [`MailingStore`](../interfaces/MailingStore.md)

## Constructors

### Constructor

> **new IndexedDbMailingStore**(`options?`): `IndexedDbMailingStore`

#### Parameters

##### options?

`indexedDB` (default `globalThis.indexedDB`), database `name` (default
`bpost-e-masspost`), and `now`/`newId` for tests.

###### indexedDB?

`IDBFactory`

###### name?

`string`

###### newId?

() => `string`

###### now?

() => `Date`

#### Returns

`IndexedDbMailingStore`

## Methods

### archive()

> **archive**(`id`, `by`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Moves the mailing to the archive.

#### Parameters

##### id

`string`

##### by

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`archive`](../interfaces/MailingStore.md#archive)

***

### create()

> **create**(`input`, `file`, `by`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Creates the mailing with its Excel file. Throws `CodeTakenError` when the code exists.

#### Parameters

##### input

[`NewMailing`](../interfaces/NewMailing.md)

##### file

`Blob`

##### by

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`create`](../interfaces/MailingStore.md#create)

***

### findByCode()

> **findByCode**(`code`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

The mailing with this code (case-insensitive), or null.

#### Parameters

##### code

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`findByCode`](../interfaces/MailingStore.md#findbycode)

***

### get()

> **get**(`id`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

One mailing, or null when unknown. Throws `UnreadableMailingError` when it fails the schema.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \} \| `null`\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`get`](../interfaces/MailingStore.md#get)

***

### getSourceFile()

> **getSourceFile**(`id`): `Promise`\<`Blob` \| `null`\>

The Excel file of the mailing, or null.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`Blob` \| `null`\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`getSourceFile`](../interfaces/MailingStore.md#getsourcefile)

***

### list()

> **list**(): `Promise`\<[`MailingListItem`](../type-aliases/MailingListItem.md)[]\>

All mailings, archived ones included, unsorted.

#### Returns

`Promise`\<[`MailingListItem`](../type-aliases/MailingListItem.md)[]\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`list`](../interfaces/MailingStore.md#list)

***

### restore()

> **restore**(`id`, `by`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

Takes the mailing out of the archive.

#### Parameters

##### id

`string`

##### by

`string`

#### Returns

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`restore`](../interfaces/MailingStore.md#restore)

***

### update()

> **update**(`id`, `change`, `expectedRevision`, `by`, `event`): `Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

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

`Promise`\<\{ `archived`: `boolean`; `arr`: `number` \| `null`; `code`: `string`; `corrections`: `Record`\<`string`, `string`\>; `counts`: \{ `addresses`: `number`; `formatIssuesOpen`: `number` \| `null`; \}; `created`: \{ `at`: `string`; `by`: `string`; \}; `customer`: \{ `crmId`: `string` \| `null`; `name`: `string`; \}; `excludedRows`: `number`[]; `expectedDeliveryDate`: `string`; `format`: `"Large"` \| `"Small"`; `genMID`: `"7"` \| `"9"` \| `"11"` \| `"N"`; `genPSC`: `"N"` \| `"Y"`; `id`: `string`; `log`: `object`[]; `mapping`: \{ `order`: `string`[]; `roles`: `Record`\<`string`, `string`\>; \} \| `null`; `modified`: \{ `at`: `string`; `by`: `string`; \}; `priority`: `"P"` \| `"NP"`; `revision`: `number`; `roundAndSequence`: `boolean`; `schemaVersion`: `1`; `source`: \{ `name`: `string`; `sha256`: `string`; `size`: `number`; \}; `status`: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`; `title`: `string`; \}\>

#### Implementation of

[`MailingStore`](../interfaces/MailingStore.md).[`update`](../interfaces/MailingStore.md#update)
