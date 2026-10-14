[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / splitAddress

# Function: splitAddress()

> **splitAddress**(`text`): \{ `postcodeCity`: `string`; `streetHouseBox`: `string`; \} \| `null`

Splits "straat en nummer, postcode en gemeente" into Comp 92 and 93: on the last comma, or before the
last postcode of four digits followed by a place name. A house or box number of four digits stays
with the street.

## Parameters

### text

`string`

What the user typed or chose.

## Returns

\{ `postcodeCity`: `string`; `streetHouseBox`: `string`; \} \| `null`

Both parts, or null when there is no postcode.

## Example

```ts
splitAddress('Kerkstraat 1234 9300 Aalst') // { streetHouseBox: 'Kerkstraat 1234', postcodeCity: '9300 Aalst' }
```
