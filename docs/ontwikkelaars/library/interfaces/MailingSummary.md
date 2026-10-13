[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / MailingSummary

# Interface: MailingSummary

One row in the list. Later the same fields go into Drive `appProperties`.

## Properties

### addresses

> **addresses**: `number`

***

### archived

> **archived**: `boolean`

***

### arr

> **arr**: `number` \| `null`

***

### code

> **code**: `string`

***

### customer

> **customer**: `string`

***

### excluded

> **excluded**: `number`

Rows left out of the mailing (`addresses` counts every row of the file).

***

### expectedDeliveryDate

> **expectedDeliveryDate**: `string`

***

### foreign

> **foreign**: `number` \| `null`

Addresses outside Belgium; null: not counted yet.

***

### formatIssuesOpen

> **formatIssuesOpen**: `number` \| `null`

***

### id

> **id**: `string`

***

### modifiedAt

> **modifiedAt**: `string`

***

### status

> **status**: `"format"` \| `"uploaded"` \| `"mapped"` \| `"checked"` \| `"submitted"` \| `"overdue"` \| `"done"` \| `"withdrawn"`

***

### title

> **title**: `string`
