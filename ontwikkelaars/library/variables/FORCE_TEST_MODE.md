[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / FORCE\_TEST\_MODE

# Variable: FORCE\_TEST\_MODE

> `const` **FORCE\_TEST\_MODE**: `true` = `true`

SAFETY GUARD (temporary): Contrapunt is not yet certified for Production or Certification
mode, so this library refuses to build anything other than a Test request for now — see
`buildMailingRequest` below, which ignores `params.mode` and always forces 'T'.
Remove FORCE_TEST_MODE (and go back to honoring `params.mode`) only after explicit sign-off
once Contrapunt has gone through bpost's certification process. See
.agent/plans/2026-09-28-bpost-library-web-app.md.
