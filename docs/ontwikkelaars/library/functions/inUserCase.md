[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / inUserCase

# Function: inUserCase()

> **inUserCase**(`correction`, `sent`): `string`

A correction of bpost in the writing of the user: words the user wrote keep the user's form, new
words get a capital (the box word `bus` stays small). When the user writes in capitals, so does
the result.

## Parameters

### correction

`string`

The correction of bpost (capitals).

### sent

`string`

What the user sent.

## Returns

`string`

The proposal.

## Example

```ts
inUserCase('MOLENBEEKSESTRAAT 184 BUS 35', 'Molenbeeksestraat 184 35') // 'Molenbeeksestraat 184 bus 35'
```
