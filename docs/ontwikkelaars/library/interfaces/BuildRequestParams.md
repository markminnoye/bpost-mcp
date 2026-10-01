[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BuildRequestParams

# Interface: BuildRequestParams

Inputs for a MailingCreate request. `mode` is ignored while `FORCE_TEST_MODE` is true, unless `allowNonTestMode` is set.

## Properties

### allowNonTestMode?

> `optional` **allowNonTestMode?**: `boolean`

CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route.

***

### customerFileRef

> **customerFileRef**: `string`

***

### expectedDeliveryDate

> **expectedDeliveryDate**: `string`

YYYY-MM-DD

***

### format

> **format**: `"Large"` \| `"Small"`

***

### genMID

> **genMID**: `"7"` \| `"9"` \| `"11"` \| `"N"`

***

### genPSC

> **genPSC**: `"N"` \| `"Y"`

***

### mailingRef

> **mailingRef**: `string`

***

### mode

> **mode**: `"P"` \| `"T"` \| `"C"`

Ignored while FORCE_TEST_MODE is true (see above) — every request is sent as Test.

***

### priority

> **priority**: `"P"` \| `"NP"`
