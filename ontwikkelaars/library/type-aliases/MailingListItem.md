[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / MailingListItem

# Type Alias: MailingListItem

> **MailingListItem** = \{ `ok`: `true`; `summary`: [`MailingSummary`](../interfaces/MailingSummary.md); \} \| \{ `code?`: `string`; `id`: `string`; `ok`: `false`; \}

A row of the list, or a mailing that cannot be read (shown as "Kan deze mailing niet lezen"). An
unreadable mailing still gives its `code` when that field is readable: the code stays taken.
