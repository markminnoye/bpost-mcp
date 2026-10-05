[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / maskExamples

# Function: maskExamples()

> **maskExamples**(`values`): `string`[]

Masks sample values for one column, removes the duplicates that masking creates and sorts the
result. Sorting breaks the link between columns: the first example of the name column no longer
belongs to the same row as the first example of the street column.

## Parameters

### values

readonly `string`[]

Raw sample values of one column.

## Returns

`string`[]

Masked, distinct, sorted values. The input is not changed.

## Example

```ts
maskExamples(['Peeters', 'Pauwels', 'Jan']) // ['Jxx', 'Pxxxxxx']
```
