[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / FormatIssue

# Interface: FormatIssue

One block of one row that fails a format rule.

## Properties

### context

> **context**: `Record`\<`string`, `string`\>

Non-empty values of the context columns of this row.

***

### field

> **field**: [`AddressField`](../type-aliases/AddressField.md)

***

### fields

> **fields**: `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>

Raw values of every mapped block of this row, to show the whole address.

***

### kind

> **kind**: [`FormatIssueKind`](../type-aliases/FormatIssueKind.md)

***

### message

> **message**: `string`

***

### original

> **original**: `string`

Raw joined value, before any fix.

***

### proposal?

> `optional` **proposal?**: `string`

***

### rowNumber

> **rowNumber**: `number`

Row number in the spreadsheet, for the user to find the address.

***

### seq

> **seq**: `number`

The number sent to bpost for this row, as in `mapRows`: the row number when given, else 1, 2, 3, …
