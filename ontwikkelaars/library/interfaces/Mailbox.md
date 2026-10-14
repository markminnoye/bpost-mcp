[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / Mailbox

# Interface: Mailbox

The mailbox of a tenant.

## Properties

### kind

> `readonly` **kind**: [`MailboxKind`](../type-aliases/MailboxKind.md)

## Methods

### remove()

> **remove**(`name`): `Promise`\<`void`\>

Takes a processed response out of the mailbox.

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`void`\>

***

### responses()

> **responses**(): `Promise`\<[`MailboxFile`](MailboxFile.md)[]\>

Response files (`_1AK`, `_2RS`) waiting to be processed.

#### Returns

`Promise`\<[`MailboxFile`](MailboxFile.md)[]\>

***

### send()

> **send**(`file`): `Promise`\<`void`\>

Puts a request in the mailbox.

#### Parameters

##### file

[`MailboxFile`](MailboxFile.md)

#### Returns

`Promise`\<`void`\>
