[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / convertExcelToMailingCheck

# Function: convertExcelToMailingCheck()

> **convertExcelToMailingCheck**(`file`, `mapping`, `params`, `credentials`): `Promise`\<[`ConvertResult`](../interfaces/ConvertResult.md)\>

OptiAddress: Excel → MailingCheck-only request (suggestions + optional rewritten addresses).
Same file naming as Mail ID (`MID_…_0RQ.XML`); do not combine with MailingCreate in one file.

## Parameters

### file

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

Workbook bytes.

### mapping

[`ColumnMapping`](../interfaces/ColumnMapping.md)

Column mapping for the unstructured address blocks.

### params

[`BuildCheckParams`](../interfaces/BuildCheckParams.md)

Check parameters (reference and suggestion settings).

### credentials

[`ConvertOptions`](../interfaces/ConvertOptions.md)

Customer id, account id, optional MID version, and optional row cap.

## Returns

`Promise`\<[`ConvertResult`](../interfaces/ConvertResult.md)\>

Same shape as `convertExcelToMailingRequest`, with MailingCheck XML when validation passed.
