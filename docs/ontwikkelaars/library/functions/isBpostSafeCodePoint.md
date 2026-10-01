[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / isBpostSafeCodePoint

# Function: isBpostSafeCodePoint()

> **isBpostSafeCodePoint**(`cp`): `boolean`

True when bpost accepts the code point: HT/LF/CR, printable ASCII, and Latin-1 0xA0–0xFF.
 Control characters (incl. DEL and the C1 range 0x80–0x9F) are not supported.

## Parameters

### cp

`number`

Unicode code point.

## Returns

`boolean`

`true` for tab, LF, CR, printable ASCII, and Latin-1 0xA0–0xFF.
