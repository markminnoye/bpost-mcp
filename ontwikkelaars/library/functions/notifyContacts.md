[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / notifyContacts

# Function: notifyContacts()

> **notifyContacts**(`email`, `lang?`): \{ `Contacts`: \{ `Contact`: `object`[]; \}; \} \| `undefined`

Builds the optional Contacts block for MailingCheck / MailingCreate.

## Parameters

### email

[`NotifyEmail`](../type-aliases/NotifyEmail.md)

Address to notify; blank means omit Contacts.

### lang?

`"nl"` \| `"fr"` \| `"de"`

Language of the mail from bpost (`nl` for Contrapunt).

## Returns

\{ `Contacts`: \{ `Contact`: `object`[]; \}; \} \| `undefined`

The Contacts object, or undefined when there is no address.
