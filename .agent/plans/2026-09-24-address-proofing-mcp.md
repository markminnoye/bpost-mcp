# Plan: Address Proofing MCP client (deferred)

**Date:** 2026-09-24
**Status:** Pending — approved direction, **do not implement during release freeze**

**Blocked on:** production freeze (blockers/fixes only); `x-api-key` from addressvalidation@bpost.be; env via `src/lib/config/env.ts`.

---

## Why later

This is a new outbound integration (Mailops REST), not a Mail ID bugfix. `check_batch` (OptiAddress) stays the mailing-list step.

## When unblocked

- [ ] Tenant-vault + `env.ts` for API key and base URL (no hardcoded `.vercel.app` / host fallbacks)
- [ ] REST-only client: `validateAddresses`, `formatAddresses`
- [ ] **Server-side PII strip** (tested): drop Comp 1–5, 70–79, 90; drop `MaileeIndividualIdentification` and supplementary dispatch info; keep 6–8, 9, 12–19, 91–93; never `AddressBlockLines`
- [ ] MCP tools `validate_addresses` / optional `format_addresses` (max 100, labels without addressee)
- [ ] Do **not** replace `check_batch`; hybrid: Proofing for small chat fixes, OptiAddress for full batch

Skill source of truth: `docs/internal/e-masspost/skills/bpost-address-proofing/`.
