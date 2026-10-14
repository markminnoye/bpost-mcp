[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / modeOf

# Function: modeOf()

> **modeOf**(`m`): `"P"` \| `"T"` \| `"C"`

The mode a submission of the mailing goes in: the stored one, or Production for a mailing saved
before the mode existed (design 13/10, decision 14; ADR 0010).

## Parameters

### m

`Pick`\<[`Mailing`](../type-aliases/Mailing.md), `"mode"`\>

The mailing.

## Returns

`"P"` \| `"T"` \| `"C"`

`T`, `C` or `P`.
