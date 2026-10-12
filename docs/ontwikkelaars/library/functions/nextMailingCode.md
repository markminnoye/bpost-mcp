[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / nextMailingCode

# Function: nextMailingCode()

> **nextMailingCode**(`prefix`, `year`, `existing`): `string`

The next code: prefix, year and the highest number of that year plus one (SR-112 decision 17).

## Parameters

### prefix

`string`

The tenant prefix (case-insensitive; the result is in capitals).

### year

`number`

The year.

### existing

readonly `string`[]

All codes in the store, archived ones included.

## Returns

`string`

A code like `CP-2026-15`.

## Example

```ts
nextMailingCode('CP', 2026, ['CP-2026-14']) // 'CP-2026-15'
```
