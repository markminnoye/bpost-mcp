[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / valueChanges

# Function: valueChanges()

> **valueChanges**(`row`, `value`): `object`[]

The corrections a new value of a row gives. For an address: street and postcode apart. A value that
equals the uncorrected one clears its correction (`undefined`); any other value is written, also when
it equals what was sent, so a correction of step 3 stays. Call only with a value `splitAddress` accepts.

## Parameters

### row

[`CheckRow`](../interfaces/CheckRow.md)

The row.

### value

`string`

The new value.

## Returns

`object`[]

Changes by key.
