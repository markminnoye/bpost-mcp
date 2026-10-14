[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / readRequestItems

# Function: readRequestItems()

> **readRequestItems**(`xml`): `Map`\<`number`, `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>\>

The addresses as they stand in a request file (what bpost got announced), by `seq`.

## Parameters

### xml

`string`

A MailingRequest (`…_0RQ.XML`), decoded.

## Returns

`Map`\<`number`, `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>\>

Address fields per row number.

## Example

```ts
readRequestItems(decodeLatin1(file.bytes)).get(5) // { name, streetHouseBox, postcodeCity }
```
