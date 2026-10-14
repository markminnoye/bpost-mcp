[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / findFormatIssues

# Function: findFormatIssues()

> **findFormatIssues**(`rows`, `mapping`, `options?`): [`FormatIssue`](../interfaces/FormatIssue.md)[]

Checks every mapped block of every row and returns the problems, with a proposal where one is
safe. Unmapped blocks are skipped; use `missingTargets` for required blocks without a column.

## Parameters

### rows

readonly `Record`\<`string`, `unknown`\>[]

Records keyed by the Excel header (`ParsedExcel.rows`).

### mapping

[`ColumnMapping`](../interfaces/ColumnMapping.md)

Source columns per unstructured block.

### options?

[`FindFormatIssuesOptions`](../interfaces/FindFormatIssuesOptions.md) = `{}`

Spreadsheet row numbers and context columns.

## Returns

[`FormatIssue`](../interfaces/FormatIssue.md)[]

Problems ordered by row, then by block (90, 91, 92, 93, country).

## Example

```ts
const issues = findFormatIssues(parsed.rows, mapping, { rowNumbers: parsed.rowNumbers })
```
