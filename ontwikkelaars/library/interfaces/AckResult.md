[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / AckResult

# Interface: AckResult

The acknowledgement (`_1AK`): bpost received the file.

## Properties

### kind

> **kind**: `"ack"`

***

### messages

> **messages**: [`BpostMessage`](BpostMessage.md)[]

***

### receivedAt

> **receivedAt**: `string` \| `null`

`FileReceived/@timeStamp`, as written by bpost (local time, no zone).

***

### requestFileName

> **requestFileName**: `string`
