[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BuildCheckParams

# Interface: BuildCheckParams

Inputs for an OptiAddress MailingCheck. No format and no delivery date.

## Properties

### allowNonTestMode?

> `optional` **allowNonTestMode?**: `boolean`

Escape hatch for the FORCE_TEST_MODE guard: the CLI, and the web app after an explicit choice per mailing (ADR 0010). Never from a route.

***

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

### notifyEmail?

> `optional` **notifyEmail?**: [`NotifyEmail`](../type-aliases/NotifyEmail.md)

Optional: e-mail when e-MassPost has finished (Contacts).

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
