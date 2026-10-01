[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / MappedField

# Interface: MappedField

One unstructured field after join, length cap, and character normalization.

## Properties

### originalLength

> **originalLength**: `number`

***

### replacedChars

> **replacedChars**: `string`[]

Characters swapped for an ASCII/Latin-1 equivalent (e.g. ’ → ').

***

### truncated

> **truncated**: `boolean`

***

### unsupportedChars

> **unsupportedChars**: `string`[]

Characters bpost (ISO-8859-1) does not accept and that could not be swapped.

***

### value

> **value**: `string`
