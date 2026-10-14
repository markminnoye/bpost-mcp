[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ManualMailbox

# Class: ManualMailbox

The mailbox for now: sending saves the file in the browser (download); a response is what the user
drops in step 4. Later `DriveMailbox` does both by itself, behind the same interface.

## Example

```ts
const box = new ManualMailbox((file) => saveFile(file.bytes, { name: file.name, mime: 'application/xml' }))
```

## Implements

- [`Mailbox`](../interfaces/Mailbox.md)

## Constructors

### Constructor

> **new ManualMailbox**(`download`): `ManualMailbox`

#### Parameters

##### download

(`file`) => `void`

Saves a file in the browser.

#### Returns

`ManualMailbox`

## Properties

### kind

> `readonly` **kind**: `"manual"`

#### Implementation of

[`Mailbox`](../interfaces/Mailbox.md).[`kind`](../interfaces/Mailbox.md#kind)

## Methods

### receive()

> **receive**(`file`): `void`

A response file the user dropped.

#### Parameters

##### file

[`MailboxFile`](../interfaces/MailboxFile.md)

The file.

#### Returns

`void`

***

### remove()

> **remove**(`name`): `Promise`\<`void`\>

Takes a processed response out of the mailbox.

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Mailbox`](../interfaces/Mailbox.md).[`remove`](../interfaces/Mailbox.md#remove)

***

### responses()

> **responses**(): `Promise`\<[`MailboxFile`](../interfaces/MailboxFile.md)[]\>

Response files (`_1AK`, `_2RS`) waiting to be processed.

#### Returns

`Promise`\<[`MailboxFile`](../interfaces/MailboxFile.md)[]\>

#### Implementation of

[`Mailbox`](../interfaces/Mailbox.md).[`responses`](../interfaces/Mailbox.md#responses)

***

### send()

> **send**(`file`): `Promise`\<`void`\>

Puts a request in the mailbox.

#### Parameters

##### file

[`MailboxFile`](../interfaces/MailboxFile.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`Mailbox`](../interfaces/Mailbox.md).[`send`](../interfaces/Mailbox.md#send)
