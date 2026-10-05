[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ABBREVIATIONS

# Variable: ABBREVIATIONS

> `const` **ABBREVIATIONS**: readonly [`Abbreviation`](../interfaces/Abbreviation.md)[]

Abbreviations tried, in this order, when a value is longer than 50 characters. Never applied to
the postcode and municipality (a municipality such as Sint-Niklaas must stay intact). Scoped per
block so that, for example, the family name "De Koning" is not shortened.
