[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / groupCheckResult

# Function: groupCheckResult()

> **groupCheckResult**(`result`, `sentItems`, `base?`): [`CheckView`](../interfaces/CheckView.md)

The rows of step 4 from a MailingCheck result. A proposal that only differs in capitals counts as
in order (decision 37 of 02/10). Addresses without a reply from bpost are in order.

## Parameters

### result

[`MailingResult`](../interfaces/MailingResult.md)

The parsed `_2RS`.

### sentItems

`number`

Number of addresses in the request (the reply may skip addresses without remarks).

### base?

`ReadonlyMap`\<`number`, `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>\>

The uncorrected values per row number (the mapped Excel rows), so a change in step 4
  keeps the corrections of step 3 (`valueChanges`).

## Returns

[`CheckView`](../interfaces/CheckView.md)

Rows, counts per group (addresses, not rows) and unknown codes.
