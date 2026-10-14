[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / explainRefusal

# Function: explainRefusal()

> **explainRefusal**(`problem`): `string`

The refusal of e-MassPost in plain language, one sentence per code, each with its code.

## Parameters

### problem

`string`

The `problem` of a rejected exchange: codes separated by commas, or `status 998`.

## Returns

`string`

Sentences for the user (Vlaams).

## Example

```ts
explainRefusal('MID-2040') // 'Het bestand bevat een fout in de opbouw (MID-2040).'
```
