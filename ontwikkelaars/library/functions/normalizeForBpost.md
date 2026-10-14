[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / normalizeForBpost

# Function: normalizeForBpost()

> **normalizeForBpost**(`text`): [`NormalizedText`](../interfaces/NormalizedText.md)

Replaces what can be replaced safely: typographic quotes/dashes/ellipsis → ASCII,
 exotic spaces, and accented letters outside Latin-1 (ő → o) by dropping the accent.
 Anything else (ł, Cyrillic, emoji…) is left untouched so that validation can report it.

## Parameters

### text

`string`

Raw address text.

## Returns

[`NormalizedText`](../interfaces/NormalizedText.md)

Normalized text and the characters that were replaced. Unsupported characters stay in `text`.

## Example

```ts
normalizeForBpost('\u2019s-Hertogenbosch')
// { text: "'s-Hertogenbosch", replaced: ['\u2019'] }
```
