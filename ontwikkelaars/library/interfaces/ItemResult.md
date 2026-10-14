[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ItemResult

# Interface: ItemResult

What bpost says about one address, by `seq` (the row number in the Excel).

## Properties

### candidates

> **candidates**: `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>[]

Candidates of `Suggestions` (may be empty: never seen live yet).

***

### messages

> **messages**: [`BpostMessage`](BpostMessage.md)[]

***

### midNum?

> `optional` **midNum?**: `string`

Mail ID (`MID-4030`, `midNum`), in a MailingCreate result.

***

### sent

> **sent**: `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>

The address as sent (`RequestItem`, with `copyRequestItem="Y"`).

***

### seq

> **seq**: `number`

***

### suggestions

> **suggestions**: [`AddressSuggestion`](AddressSuggestion.md)[]

Corrections (`7001` / `MID-7001` with `compCode` and `compCorrection`).
