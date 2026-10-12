[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isAddressFileName

# Function: isAddressFileName()

> **isAddressFileName**(`fileName`): `boolean`

Whether a file name has one of the [ADDRESS\_FILE\_EXTENSIONS](../variables/ADDRESS_FILE_EXTENSIONS.md).

## Parameters

### fileName

`string`

The name of the chosen file.

## Returns

`boolean`

`true` for e.g. `adressen.xlsx` or `Adressen.ODS`.

## Example

```ts
isAddressFileName('leden.ods') // true
```
