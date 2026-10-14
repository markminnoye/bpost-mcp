[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / rowsToItems

# Function: rowsToItems()

> **rowsToItems**(`rows`, `priority`): `object`[]

Turns mapped rows into `Item`s using the unstructured Comp codes (90/91/92/93), plus the
 country for an address outside Belgium: Comp 17 for a two-letter code, Comp 18 for a name.

## Parameters

### rows

[`MappedRow`](../interfaces/MappedRow.md)[]

Output of `mapRows`.

### priority

`"P"` \| `"NP"`

Item priority written on every item (`NP` or `P`).

## Returns

`object`[]

Items in the same order. `seq` is copied from the mapped row.
