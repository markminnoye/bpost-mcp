[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / convertExcelToMailingRequest

# Function: convertExcelToMailingRequest()

> **convertExcelToMailingRequest**(`file`, `mapping`, `params`, `credentials`): `Promise`\<[`ConvertResult`](../interfaces/ConvertResult.md)\>

End-to-end: Excel → mapped rows → MailingCreate → validated → XML.

## Parameters

### file

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

Workbook bytes.

### mapping

[`ColumnMapping`](../interfaces/ColumnMapping.md)

Column mapping for the unstructured address blocks.

### params

[`BuildRequestParams`](../interfaces/BuildRequestParams.md)

Create parameters (reference, format, priority, mode).

### credentials

[`ConvertOptions`](../interfaces/ConvertOptions.md)

Customer id, account id, optional MID version, and optional row cap.

## Returns

`Promise`\<[`ConvertResult`](../interfaces/ConvertResult.md)\>

Counts, mapping warnings, validation, and XML when validation passed.

## Example

```ts
const result = await convertExcelToMailingRequest(buffer, mapping, params, {
  customerId: '00000000',
  accountId: '00000000',
})
if (result.validation.valid) console.log(result.xml)
```
