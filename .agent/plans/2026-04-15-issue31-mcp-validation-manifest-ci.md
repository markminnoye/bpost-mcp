# Issue #31: MCP validation, registry manifest & CI

## Status: Complete

## Goal

Close gaps for MCP distribution quality: a root **MCP Registry** manifest (`server.json`), consistent **tool metadata** (`annotations` / `outputSchema`) on the MCP route, **CI** that validates the manifest and runs project DoD checks, and operator-facing documentation.

GitHub: [#31](https://github.com/markminnoye/bpost-mcp/issues/31).

## Outcome

- **Manifest:** Root [`server.json`](../../server.json) — `$schema` 2025-12-11, `streamable-http` remote to `/api/mcp`, documented `Authorization` header, icons, repository link. Regenerated on `prebuild` via [`scripts/generate-server-manifest.ts`](../../scripts/generate-server-manifest.ts) so version and public URL stay aligned with [`src/lib/app-version.ts`](../../src/lib/app-version.ts) / [`src/lib/mcp/server-info.ts`](../../src/lib/mcp/server-info.ts) conventions (not hand-edited drift).
- **Validation:** [`scripts/validate-server-manifest.ts`](../../scripts/validate-server-manifest.ts) — Zod checks, `version` parity with `package.json`, remote URL must end with `/api/mcp`. Run locally: `npm run validate:server-manifest`.
- **CI:** [`.github/workflows/mcp-ci.yml`](../../.github/workflows/mcp-ci.yml) — on `push` to `main` and `pull_request`: install, ESLint, `tsc --noEmit`, tests, manifest validation. Optional **`workflow_dispatch`** job **MCP registry publish (manual stub)** — placeholder only; no automatic registry publish (release freeze / operator control).
- **MCP route:** All `registerTool` entries carry `annotations` where appropriate and `outputSchema` where success payloads are stable; see [`src/app/api/mcp/route.ts`](../../src/app/api/mcp/route.ts).
- **Operational probes:** `/health`, `/ready`, `/version` (tracked alongside issue [#35](https://github.com/markminnoye/bpost-mcp/issues/35) where relevant).
- **Docs:** [`README.md`](../../README.md) (manifest + CI usage), [`docs/internal/mcp-client-compatibility-matrix.md`](../../docs/internal/mcp-client-compatibility-matrix.md) (registry vs `initialize.serverInfo`).

## Completed checklist

- [x] Root `server.json` + generation script + `validate:server-manifest`
- [x] CI workflow + manual publish stub
- [x] Tool `annotations` / `outputSchema` coverage in MCP route
- [x] README + compatibility matrix: manifest and workflow usage
- [x] This plan registered in [`.agent/plans/INDEX.md`](INDEX.md)

## Notes

- **Runtime vs registry:** Clients still receive live metadata via MCP `initialize` (`serverInfo`). `server.json` is for **registry / distribution** and should stay consistent with `package.json.version` (enforced by the validator).
