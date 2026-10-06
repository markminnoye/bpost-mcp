[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / missingTargets

# Function: missingTargets()

> **missingTargets**(`mapping`): (`"name"` \| `"companyDepartment"` \| `"streetHouseBox"` \| `"postcodeCity"`)[]

Required blocks without a source column: the check on the mapped columns.

## Parameters

### mapping

[`ColumnMapping`](../interfaces/ColumnMapping.md)

Column mapping chosen by the user.

## Returns

(`"name"` \| `"companyDepartment"` \| `"streetHouseBox"` \| `"postcodeCity"`)[]

Required blocks (`REQUIRED_FIELDS`) that have no column. Empty when the mapping is complete.

## Example

```ts
missingTargets({ name: ['Naam'], streetHouseBox: [], postcodeCity: ['Postcode'] }) // ['streetHouseBox']
```
