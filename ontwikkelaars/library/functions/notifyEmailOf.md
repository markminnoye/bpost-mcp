[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / notifyEmailOf

# Function: notifyEmailOf()

> **notifyEmailOf**(`m`, `tenantDefault?`): `string`

E-mail used for the Contacts notification: the one on the mailing when that field exists
(also when empty: the user cleared it), otherwise the tenant default.

## Parameters

### m

`Pick`\<[`Mailing`](../type-aliases/Mailing.md), `"notifyEmail"`\>

The mailing (may omit `notifyEmail`).

### tenantDefault?

`string` = `''`

From Instellingen; empty when none is set.

## Returns

`string`

A trimmed address, or empty when neither is set.
