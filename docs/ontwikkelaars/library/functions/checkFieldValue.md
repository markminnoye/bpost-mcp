[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / checkFieldValue

# Function: checkFieldValue()

> **checkFieldValue**(`value`, `field`): [`FieldCheck`](../type-aliases/FieldCheck.md)

Checks one block value against the bpost format rules: required, character set (ISO-8859-1,
no `|`, tab or line break), no `/` in the street and postcode blocks, at most 50 characters
(42 for the country, which is optional).
Leading and trailing spaces are ignored. Returns the first rule that fails.

## Parameters

### value

`string`

Current value of the block (raw or edited by the user).

### field

[`AddressField`](../type-aliases/AddressField.md)

Unstructured block the value is sent in.

## Returns

[`FieldCheck`](../type-aliases/FieldCheck.md)

`{ ok: true }`, or the failing rule with a customer-facing message.

## Example

```ts
checkFieldValue('Kerkstraat 12/3', 'streetHouseBox')
// { ok: false, kind: 'slash', message: 'Gebruik geen schuine streep (/). …' }
```
