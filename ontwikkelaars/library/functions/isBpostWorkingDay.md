[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isBpostWorkingDay

# Function: isBpostWorkingDay()

> **isBpostWorkingDay**(`date`): `boolean`

Whether bpost takes a deposit on this day: Monday to Friday, not a Belgian public holiday. bpost
refuses a deposit date that is not a working day (MPW-1043); the guide does not list those days,
so this is our reading of it.

## Parameters

### date

`string`

The day as `YYYY-MM-DD`.

## Returns

`boolean`

True on a working day.

## Example

```ts
isBpostWorkingDay('2026-10-24') // false: a Saturday
```
