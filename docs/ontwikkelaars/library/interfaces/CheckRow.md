[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / CheckRow

# Interface: CheckRow

One row of step 4. `field` is `address` for an address bpost did not find (or found several
times): one field "straat en nummer, postcode en gemeente", split into Comp 92 and 93 (decision 41).

## Properties

### base?

> `optional` **base?**: `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>

The values of the address before any correction (the mapped Excel row). A correction clears only
when the value returns to these; without them, what was sent counts as the starting point.

***

### codes

> **codes**: `string`[]

***

### field

> **field**: [`AddressField`](../type-aliases/AddressField.md) \| `"address"`

***

### group

> **group**: [`CheckGroupId`](../type-aliases/CheckGroupId.md)

***

### key

> **key**: `string`

`<seq>:<field>`, unique on the screen.

***

### note?

> `optional` **note?**: `string`

Explanation for a row without a proposal.

***

### options

> **options**: [`AddressOption`](AddressOption.md)[]

***

### original

> **original**: `string`

The value as sent.

***

### proposal?

> `optional` **proposal?**: `string`

The proposal of bpost, in the user's writing.

***

### sent

> **sent**: `Partial`\<`Record`\<[`AddressField`](../type-aliases/AddressField.md), `string`\>\>

***

### seq

> **seq**: `number`
