[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BuildCheckParams

# Interface: BuildCheckParams

Inputs for an OptiAddress MailingCheck. No format and no delivery date.

## Properties

### copyRequestItem?

> `optional` **copyRequestItem?**: `"N"` \| `"Y"`

Ask bpost to rewrite addresses into the response.

***

### customerFileRef

> **customerFileRef**: `string`

***

### mailingRef

> **mailingRef**: `string`

***

### mode

> **mode**: `"P"` \| `"T"` \| `"C"`

***

### priority

> **priority**: `"P"` \| `"NP"`

***

### suggestionsCount?

> `optional` **suggestionsCount?**: `number`

Max suggestions per address (0 = none).

***

### suggestionsMinScore?

> `optional` **suggestionsMinScore?**: `number`

Min Levenshtein score 1–100 for a suggestion to be returned.
