[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / encodeLatin1

# Function: encodeLatin1()

> **encodeLatin1**(`text`): `Uint8Array`

Text as ISO-8859-1 bytes, the encoding of every bpost file.

## Parameters

### text

`string`

Text with only Latin-1 characters (`validateMailingRequest` checks that first).

## Returns

`Uint8Array`

One byte per character.

## Throws

Error when a character is outside ISO-8859-1.
