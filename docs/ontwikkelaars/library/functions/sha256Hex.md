[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / sha256Hex

# Function: sha256Hex()

> **sha256Hex**(`bytes`): `Promise`\<`string`\>

SHA-256 of a file, as lowercase hex. Uses Web Crypto (browser and Node 20+).

## Parameters

### bytes

`ArrayBuffer`

The file contents.

## Returns

`Promise`\<`string`\>

64 hex characters.
