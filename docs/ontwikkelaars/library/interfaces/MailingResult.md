[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / MailingResult

# Interface: MailingResult

The result of a MailingCheck or MailingCreate (`_2RS`).

## Properties

### arr

> **arr**: `number` \| `null`

Address Recognition Rate in percent (`MID-4040`, `compliancyRateAtBuildingLevel`).

***

### items

> **items**: [`ItemResult`](ItemResult.md)[]

***

### kind

> **kind**: `"check"` \| `"create"`

***

### mailingRef

> **mailingRef**: `string`

***

### messages

> **messages**: [`BpostMessage`](BpostMessage.md)[]

Messages about the file or the action, not about one address.

***

### requestFileName

> **requestFileName**: `string`

Name of the request file this answers (`Header/Files/RequestProps/@fileName`).

***

### statusCode

> **statusCode**: `string`

`Status/@code`: 100 accepted, 998/999 refused; empty when the action is missing.
