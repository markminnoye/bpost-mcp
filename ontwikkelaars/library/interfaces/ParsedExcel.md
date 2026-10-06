[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ParsedExcel

# Interface: ParsedExcel

First worksheet of an address workbook: header titles and one record per data row.

## Properties

### headers

> **headers**: `string`[]

***

### rowNumbers

> **rowNumbers**: `number`[]

Spreadsheet row number of each entry in `rows` (the header is row 1, blank rows are skipped).

***

### rows

> **rows**: `Record`\<`string`, `unknown`\>[]
