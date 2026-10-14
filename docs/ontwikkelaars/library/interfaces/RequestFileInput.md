[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / RequestFileInput

# Interface: RequestFileInput

Input for `buildRequestFile`.

## Properties

### create?

> `optional` **create?**: `object`

The details of step 1, for a submission.

#### expectedDeliveryDate

> **expectedDeliveryDate**: `string`

#### format

> **format**: `"Large"` \| `"Small"`

#### genMID

> **genMID**: `"7"` \| `"9"` \| `"11"` \| `"N"`

#### genPSC

> **genPSC**: `"N"` \| `"Y"`

***

### ids

> **ids**: [`BpostIds`](BpostIds.md)

***

### kind

> **kind**: `"check"` \| `"create"`

***

### mailingRef

> **mailingRef**: `string`

***

### mode

> **mode**: [`BpostMode`](../type-aliases/BpostMode.md)

Mode of a submission. A check is always `T` (ADR 0010).

***

### now

> **now**: `Date`

Time in the file name.

***

### priority

> **priority**: `"P"` \| `"NP"`

***

### rows

> **rows**: readonly [`MappedRow`](MappedRow.md)[]

The rows that go along, corrected (`correctedRows`).
