# Plan: Address Proofing skill-integratie

**Date:** 2026-09-24
**Status:** Complete (docs + alias fix). MCP Mailops client: see [2026-09-24-address-proofing-mcp.md](2026-09-24-address-proofing-mcp.md) (⏳).

---

## Context

bpost Address Formatting & Validation API (Mailops REST/SOAP, CEN/UPU S42) is a **different product** from OptiAddress/`MailingCheck`. Document it as a separate skill; route from `e-masspost-protocol`. Proofing calls never send person names or other PII; company name allowed.

## Done

- [x] Protocol routing + Comp ↔ S42 + addressing-rules (do not rewrite OptiAddress flows)
- [x] Skill `bpost-address-proofing` + privacy-redaction + redacted samples
- [x] Submodule CHANGELOG / README / ZIP workflow for a second artifact
- [x] `BPOST_ALIASES` + mapping hints + tests → Table 46
- [x] Deferred MCP plan (no Mailops client during release freeze)
