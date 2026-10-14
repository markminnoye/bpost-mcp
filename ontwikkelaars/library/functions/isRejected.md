[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isRejected

# Function: isRejected()

> **isRejected**(`r`): `boolean`

Whether bpost refused the file or the action: a `FATAL` or `ERROR` message on the file, status
998 or 999, or a result without an action.

## Parameters

### r

[`BpostResponse`](../type-aliases/BpostResponse.md)

A parsed response.

## Returns

`boolean`

True when refused.
