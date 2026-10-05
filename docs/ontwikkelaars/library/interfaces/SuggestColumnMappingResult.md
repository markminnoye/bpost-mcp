[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / SuggestColumnMappingResult

# Interface: SuggestColumnMappingResult

## Properties

### confidence

> **confidence**: [`MappingConfidence`](../type-aliases/MappingConfidence.md)

***

### mapping

> **mapping**: [`ColumnMapping`](ColumnMapping.md)

***

### needsAi

> **needsAi**: `boolean`

***

### preset?

> `optional` **preset?**: [`MappingPresetId`](../type-aliases/MappingPresetId.md)

Set when the titles match a known layout: Contrapunt's export or bpost's Address File Tool.

***

### rationale

> **rationale**: `Record`\<`string`, `string`\>

Why each Comp target (90, 91, 92, 93, and 18 for the country) was chosen.

***

### unmatchedHeaders

> **unmatchedHeaders**: `string`[]
