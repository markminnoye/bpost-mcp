[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / FORCE\_TEST\_MODE

# Variable: FORCE\_TEST\_MODE

> `const` **FORCE\_TEST\_MODE**: `true` = `true`

SAFETY GUARD (precaution): by default this library builds only Test requests — every builder
ignores `params.mode` and forces 'T', so nothing reaches production by accident.
Contrapunt is already certified (Mark, 01/10/2026) and bpost accepted a Production Create
(no MID-1020), so this is no longer a certification rule. It stays until Mark decides when the
app may send in `C` or `P`.
Exception (01/10/2026, Mark): a caller may set `allowNonTestMode` to build a `C` or `P` file
for a deliberate protocol test through the portal upload tool. Only `scripts/generate-mailing-xml.ts`
does that, and it sends nothing. HTTP routes and the web app must never set it.
Remove FORCE_TEST_MODE (and go back to honoring `params.mode`) only after explicit sign-off
once the `C`/`P` tests (see .agent/plans/2026-10-01-masspost-api-and-web.md, phase 0b) are done.
