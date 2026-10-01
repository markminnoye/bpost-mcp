[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / extractMailingResponseMessages

# Function: extractMailingResponseMessages()

> **extractMailingResponseMessages**(`xml`): [`MailingResponseMessage`](../interfaces/MailingResponseMessage.md)[]

Reads file-level Replies from a MailingResponse (2RS) XML string.

## Parameters

### xml

`string`

Response XML.

## Returns

[`MailingResponseMessage`](../interfaces/MailingResponseMessage.md)[]

Messages that have a code. Missing reply blocks yield an empty array.
