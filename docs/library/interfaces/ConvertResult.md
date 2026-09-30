[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ConvertResult

# Interface: ConvertResult

Excel-to-XML result. `xml` is omitted when validation fails.

## Properties

### itemCount

> **itemCount**: `number`

***

### sourceItemCount

> **sourceItemCount**: `number`

Total mapped rows before maxItems cap (if any).

***

### validation

> **validation**: [`ValidationResult`](ValidationResult.md)

***

### warnings

> **warnings**: [`MappingWarning`](MappingWarning.md)[]

***

### xml?

> `optional` **xml?**: `string`

Only set when validation passed.
