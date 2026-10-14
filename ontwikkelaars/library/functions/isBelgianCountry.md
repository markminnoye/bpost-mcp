[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isBelgianCountry

# Function: isBelgianCountry()

> **isBelgianCountry**(`value`): `boolean`

True when the country value means Belgium (België, Belgique, Belgien, Belgium or BE, any case).
A Belgian address is sent without a country, as before the country was supported.

## Parameters

### value

`string`

Country as written in the source column.

## Returns

`boolean`

`true` for Belgium, `false` for anything else, including an empty value.

## Example

```ts
isBelgianCountry('België') // true
```
