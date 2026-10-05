[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / CHARACTER\_REPLACEMENTS

# Variable: CHARACTER\_REPLACEMENTS

> `const` **CHARACTER\_REPLACEMENTS**: `Readonly`\<`Record`\<`string`, `string`\>\>

Characters bpost does not accept that have one safe replacement: typographic quotes, dashes and
ellipsis from Excel/Word, letters without a Unicode decomposition (ł, đ, œ, ı) and the bullet.
Letters with an accent outside Latin-1 (ő, ź, …) are not listed: `normalizeForBpost` drops the
accent. The customer documentation lists every entry (`docs/documentatie/webapp/formaatvalidatie.md`).
