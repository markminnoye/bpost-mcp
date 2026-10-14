[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / addressFileBaseName

# Function: addressFileBaseName()

> **addressFileBaseName**(`fileName`): `string`

The file name without its address-list extension, e.g. for a title or an export name.

## Parameters

### fileName

`string`

The name of the chosen file.

## Returns

`string`

The name without `.xlsx`, `.xlsm`, `.xls` or `.ods`; other names unchanged.

## Example

```ts
addressFileBaseName('Nieuwsbrief december.xlsm') // 'Nieuwsbrief december'
```
