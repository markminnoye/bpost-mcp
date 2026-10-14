[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / parseBpostResponse

# Function: parseBpostResponse()

> **parseBpostResponse**(`xml`): [`BpostResponse`](../type-aliases/BpostResponse.md)

Reads any file bpost sends back: the acknowledgement (`RequestAck`, `_1AK`) or the result of a
MailingCheck or MailingCreate (`MailingResponse`, `_2RS`).

## Parameters

### xml

`string`

The file as text (decode the bytes as ISO-8859-1 first).

## Returns

[`BpostResponse`](../type-aliases/BpostResponse.md)

The response, with `kind` `ack`, `check` or `create`.

## Throws

NotABpostResponseError for anything else.

## Example

```ts
const r = parseBpostResponse(decodeLatin1(bytes))
if (r.kind === 'check') console.log(r.arr)
```
