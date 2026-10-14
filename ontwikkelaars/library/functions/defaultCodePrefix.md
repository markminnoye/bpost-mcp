[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / defaultCodePrefix

# Function: defaultCodePrefix()

> **defaultCodePrefix**(`tenantName`): `string`

Prefix for codes when the tenant has none set: the first letters of the first two words, or the
first two letters of a single word, in capitals.

## Parameters

### tenantName

`string`

The tenant name.

## Returns

`string`

The prefix, `M` when the name has no letters.

## Example

```ts
defaultCodePrefix('Sonic Rocket') // 'SR'
```
