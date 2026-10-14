[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / ProcessOutcome

# Type Alias: ProcessOutcome

> **ProcessOutcome** = \{ `change`: [`MailingChange`](MailingChange.md); `event`: `string`; `outcome`: `"applied"`; `response`: [`BpostResponse`](BpostResponse.md); \} \| \{ `outcome`: `"duplicate"` \| `"older"`; `response`: [`BpostResponse`](BpostResponse.md); \} \| \{ `mailingRef`: `string` \| `null`; `outcome`: `"foreign"`; \} \| \{ `outcome`: `"invalid"`; \}

What a response file does to a mailing.
