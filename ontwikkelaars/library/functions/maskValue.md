[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / maskValue

# Function: maskValue()

> **maskValue**(`value`, `options?`): `string`

Masks a cell value so that its shape survives but the person does not. Every word keeps its
first letter; the other letters become `X` (upper case) or `x`. A postcode followed by a place
name stays readable, as do street types, box words, legal forms, name particles, titles,
countries and the extension of an e-mail address. Up to 6 digits per value stay; a longer
run of digits (phone, account number) becomes `9`.

Idempotent with the default options, so the server can mask what the browser already masked.

## Parameters

### value

`string`

Cell value as text.

### options?

[`MaskOptions`](../interfaces/MaskOptions.md) = `{}`

Only for evaluation: without initials, or other replacement characters.

## Returns

`string`

The masked value.

## Example

```ts
maskValue('Jan Peeters')         // 'Jxx Pxxxxxx'
maskValue('Kerkstraat 12 bus 3') // 'Kxxxstraat 12 bus 3'
maskValue('1020 Brussel')        // '1020 Brussel'
maskValue('0475 12 34 56')       // '9999 99 99 99'
```
