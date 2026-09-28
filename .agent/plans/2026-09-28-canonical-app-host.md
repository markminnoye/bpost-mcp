# Canonical host `bpost.sonicrocket.app`

## Status: Complete

Production is `https://bpost.sonicrocket.app`. Preview on `main` is `https://preview.bpost.sonicrocket.app`. `NEXT_PUBLIC_BASE_URL` is already the `.app` host in Vercel. No DNS or Vercel changes in this change.

## Tasks

- [x] Install prompt: `{{BASE_URL}}` filled from `NEXT_PUBLIC_BASE_URL` in `getInstallPromptMarkdown`
- [x] Replace stale `bpost.sonicrocket.be` in `server.json`, `README.md`, `MCP_REGISTRY_CANONICAL_ORIGIN`
- [x] Update `.env.example` and the `env.ts` comment off `.io`
- [x] Leave historical changelog, plans, and the 2026-04-13 session report unchanged
- [x] `AUTH_ACCEPTED_ISSUERS` defaults to `https://bpost.sonicrocket.io` for existing access tokens
- [x] Do not retarget token signing away from `getPublicOrigin` (discovery issuer must match the fetched URL)
- [x] Tests: `.app` accepted, `.io` accepted via the allowlist, unrelated issuer rejected

## Issuance

New access tokens stay signed with `getPublicOrigin(request)`. On `https://bpost.sonicrocket.app` that origin is the base URL. Forcing every token onto `NEXT_PUBLIC_BASE_URL` would disagree with OAuth discovery while a request still arrives on another host (preview URL or `.io` before the 308).
