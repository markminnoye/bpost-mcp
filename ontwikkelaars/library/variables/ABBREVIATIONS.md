[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ABBREVIATIONS

# Variable: ABBREVIATIONS

> `const` **ABBREVIATIONS**: readonly [`Abbreviation`](../interfaces/Abbreviation.md)[]

Abbreviations tried, in this order, when a value is longer than 50 characters. Never applied to
the postcode and municipality (a municipality such as Sint-Niklaas must stay intact). Scoped per
block so that, for example, the family name "De Koning" is not shortened.

Sources (do not invent entries outside these):
- Existing Contrapunt/web-flow set already in this list (NL titles and name forms).
- docs/internal/e-masspost/docs/reference/addressing-rules.md Table 80 (street type
  abbreviations FR/NL). German column omitted (SR-83 focuses on FR + NL where relevant).
- Saint → St. mirrors NL Sint → St. (same short form; FR counterpart called out for SR-83).
- Roi (FR) is the counterpart of Koning but is already three letters like Kon.; no short form
  is listed in Table 80, so there is no Roi entry. Zone Industrielle → Z.I. is multi-word and
  skipped (abbreviation matcher is whole single words only).
