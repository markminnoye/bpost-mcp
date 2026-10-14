[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / suggestColumnMapping

# Function: suggestColumnMapping()

> **suggestColumnMapping**(`input`): [`SuggestColumnMappingResult`](../interfaces/SuggestColumnMappingResult.md)

Suggests which columns feed each address block, from the column titles only. A known layout
(bpost's Address File Tool) is recognised exactly and reported in `preset`; other files go
through NL/FR/EN synonyms with a little tolerance for typos.

## Parameters

### input

[`SuggestColumnMappingInput`](../interfaces/SuggestColumnMappingInput.md)

Column titles and optional language hints.

## Returns

[`SuggestColumnMappingResult`](../interfaces/SuggestColumnMappingResult.md)

The mapping, how sure it is, why, the unused titles, and whether AI could help.

## Example

```ts
const { mapping, preset } = suggestColumnMapping({ headers: parsed.headers })
```
