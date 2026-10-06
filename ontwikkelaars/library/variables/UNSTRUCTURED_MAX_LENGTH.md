[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / UNSTRUCTURED\_MAX\_LENGTH

# Variable: UNSTRUCTURED\_MAX\_LENGTH

> `const` **UNSTRUCTURED\_MAX\_LENGTH**: `50` = `50`

Official max length for the unstructured Comp fields (AFT columns U-X). Confirmed 50
 (Linear SR-82): Table 46 of the Mail-ID Data Exchange Technical Guide lists 50 for Comp
 90-93, and so does the blank AFT template (columns U-X). The 42 belongs to the structured
 fields (First/Last Name, Company) — Contrapunt's own tool used 42 without documented reason.
 We use the documented limit and report truncation instead of silently cutting text off. If
 bpost's own validation ever says 42, that wins and this goes back to 42.
