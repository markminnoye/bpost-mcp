[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / UNSTRUCTURED\_COMP\_CODES

# Variable: UNSTRUCTURED\_COMP\_CODES

> `const` **UNSTRUCTURED\_COMP\_CODES**: `object`

Column-to-Comp mapping using bpost's *unstructured* address fields, following the same
strategy Contrapunt's own tool already uses in production (see
docs/external/contrapunt-aft-converter/README.md, point 1). Comp codes 90-93 are documented
in docs/internal/e-masspost/docs/schemas/address-file-tool.md
("Mapping to MailingRequest Schema").

No street/house-number splitting is attempted — the user picks which source columns feed
each of the three (or four) unstructured blocks, and we join them with a space.

## Type Declaration

### companyDepartment

> `readonly` **companyDepartment**: `"91"` = `'91'`

### name

> `readonly` **name**: `"90"` = `'90'`

### postcodeCity

> `readonly` **postcodeCity**: `"93"` = `'93'`

### streetHouseBox

> `readonly` **streetHouseBox**: `"92"` = `'92'`
