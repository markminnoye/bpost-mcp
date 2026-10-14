[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / sortMailings

# Function: sortMailings()

> **sortMailings**(`items`, `sort`): [`MailingSummary`](../interfaces/MailingSummary.md)[]

Sorts the list. `status`: action needed, then waiting, then done (submitted before done), then the
earliest delivery date. `date`: earliest first. `modified`: most recent first. `code`: newest first.
`title`: A–Z. Returns a new array.

## Parameters

### items

readonly [`MailingSummary`](../interfaces/MailingSummary.md)[]

The rows.

### sort

[`MailingSort`](../type-aliases/MailingSort.md)

The order.

## Returns

[`MailingSummary`](../interfaces/MailingSummary.md)[]

The sorted rows.

## Example

```ts
sortMailings(rows, 'status')
```
