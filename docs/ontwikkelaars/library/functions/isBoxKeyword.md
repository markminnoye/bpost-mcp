[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isBoxKeyword

# Function: isBoxKeyword()

> **isBoxKeyword**(`word`): `boolean`

True when `word` is a known box word, accent- and case-insensitive, whole word only.
"bussen" is not a box word; "BOÎTE" is.

## Parameters

### word

`string`

One word, e.g. the token before a box number in the street block.

## Returns

`boolean`

`true` for "bus", "boîte"/"boite" and "bte" in any case or accent spelling.

## Example

```ts
isBoxKeyword('bte') // true
isBoxKeyword('bussen') // false
```
