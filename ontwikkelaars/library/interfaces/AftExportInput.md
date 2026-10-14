[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / AftExportInput

# Interface: AftExportInput

Input for `buildAftExport`.

## Properties

### corrections?

> `optional` **corrections?**: `ReadonlyMap`\<`number`, `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>\>

Values the user corrected during the format validation, per row number and block. They
 replace the value from the mapped columns.

***

### excludedRowNumbers?

> `optional` **excludedRowNumbers?**: `ReadonlySet`\<`number`\>

Row numbers left out of the mailing: they do not appear in the file.

***

### mapping

> **mapping**: [`ColumnMapping`](ColumnMapping.md)

***

### priority?

> `optional` **priority?**: [`AftPriority`](../type-aliases/AftPriority.md)

Default `NP`, as Contrapunt sends today.

***

### rowNumbers

> **rowNumbers**: readonly `number`[]

Spreadsheet row number per row (`ParsedExcel.rowNumbers`). Becomes `SEQ` (web-flow decision 49).

***

### rows

> **rows**: `Record`\<`string`, `unknown`\>[]

Rows as read by `parseExcelAddresses`.
