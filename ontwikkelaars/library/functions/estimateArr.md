[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / estimateArr

# Function: estimateArr()

> **estimateArr**(`input`): `number` \| `null`

The ARR bpost would give now, as a light "phantom" line (decision 39 of 02/10): bpost's rate, plus the
addresses not found that you changed, minus what you left out since. An estimate; only bpost decides.

## Parameters

### input

The ARR of bpost, the number sent, the rows, corrections, exclusions now and at sending.

#### arr

`number` \| `null`

#### excluded

`Readonly`\<`Record`\<`number`, `true`\>\>

#### excludedAtSend

readonly `number`[]

#### rows

readonly [`CheckRow`](../interfaces/CheckRow.md)[]

#### sentItems

`number`

#### values

`Readonly`\<`Record`\<`string`, `string`\>\>

## Returns

`number` \| `null`

A percentage with one decimal, or null without an ARR.
