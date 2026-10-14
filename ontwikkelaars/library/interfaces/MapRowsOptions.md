[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / MapRowsOptions

# Interface: MapRowsOptions

Extra row information for `mapRows`.

## Properties

### rowNumbers?

> `optional` **rowNumbers?**: readonly `number`[]

Spreadsheet row number per row (`ParsedExcel.rowNumbers`). Becomes `seq`, so the number
 bpost sends back points at the same row, even when rows are left out (web-flow decision 49).
