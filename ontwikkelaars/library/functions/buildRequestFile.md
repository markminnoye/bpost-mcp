[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / buildRequestFile

# Function: buildRequestFile()

> **buildRequestFile**(`input`): `Promise`\<[`RequestFile`](../interfaces/RequestFile.md)\>

Builds the MailingCheck or MailingCreate file of a mailing, validated, with its canonical name.

## Parameters

### input

[`RequestFileInput`](../interfaces/RequestFileInput.md)

Kind, rows, reference, mode, priority, bpost numbers, time and (for a submission) the details.

## Returns

`Promise`\<[`RequestFile`](../interfaces/RequestFile.md)\>

The file and its summary.

## Throws

RequestInvalidError when the request fails validation.

## Example

```ts
const file = await buildRequestFile({ kind: 'check', rows, mailingRef: checkMailingRef(code, 1), mode: 'T', priority: 'NP', ids, now: new Date() })
```
