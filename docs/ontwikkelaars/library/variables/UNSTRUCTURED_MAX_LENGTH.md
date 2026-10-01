[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / UNSTRUCTURED\_MAX\_LENGTH

# Variable: UNSTRUCTURED\_MAX\_LENGTH

> `const` **UNSTRUCTURED\_MAX\_LENGTH**: `50` = `50`

Official max length for the unstructured Comp fields (AFT columns U-X). Contrapunt's own
 tool used 42 without documented reason — we use the documented limit and report truncation
 instead of silently cutting text off.
