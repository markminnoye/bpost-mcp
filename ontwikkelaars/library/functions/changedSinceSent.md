[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / changedSinceSent

# Function: changedSinceSent()

> **changedSinceSent**(`exchange`, `fingerprint`): `boolean`

Whether the list changed since the file was sent.

## Parameters

### exchange

The exchange.

#### arr?

`number` \| `null` = `...`

#### excluded

`number`[] = `...`

Rows excluded when it was sent (for the estimate).

#### fileName

`string` = `...`

Canonical name of the request, `…_0RQ.XML`; responses name it in `RequestProps`/`FileReceived`.

#### fingerprint

`string` = `...`

`itemsFingerprint` of what was sent: shows a change after sending.

#### items

`number` = `...`

Addresses in the file.

#### kind

`"check"` \| `"create"` = `...`

#### mailingRef

`string` = `...`

#### mode

`"P"` \| `"T"` \| `"C"` = `...`

#### problem?

`string` = `...`

Codes of bpost when refused, e.g. `MID-2040`.

#### receivedAt?

`string` \| `null` = `...`

#### responseFile?

`string` = `...`

Name of the result file (`_2RS`) once processed.

#### sentAt

`string` = `...`

#### sentBy

`string` = `...`

#### state

`"sent"` \| `"received"` \| `"processed"` \| `"rejected"` = `...`

sent → received (acknowledgement) → processed, or rejected.

#### statusCode?

`string` = `...`

### fingerprint

`string`

`itemsFingerprint` of the rows that go along now.

## Returns

`boolean`

True when different.
