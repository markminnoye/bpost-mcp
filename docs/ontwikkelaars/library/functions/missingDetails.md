[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / missingDetails

# Function: missingDetails()

> **missingDetails**(`draft`, `today`): [`MissingDetail`](../type-aliases/MissingDetail.md)[]

What is still missing at step 1, in form order. Format and priority always have a value.

## Parameters

### draft

The fields that can be empty or wrong, and whether a file was read without error.

#### code

`string`

#### expectedDeliveryDate

`string`

#### hasFile

`boolean`

#### title

`string`

### today

`string`

Today as `YYYY-MM-DD`; the delivery date may not be earlier.

## Returns

[`MissingDetail`](../type-aliases/MissingDetail.md)[]

The missing items; empty when "Verder" may be enabled.
