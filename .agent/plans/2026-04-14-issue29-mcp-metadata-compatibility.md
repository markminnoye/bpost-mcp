# Issue #29: MCP metadata compatibility (`serverInfo`)

## Status: Complete

## Goal

Ship richer MCP `initialize.serverInfo` without breaking strict clients, document client-specific pitfalls, and retire the phased `MCP_SERVERINFO_ENABLE_*` env flags once behaviour was validated.

GitHub: [#29](https://github.com/markminnoye/bpost-mcp/issues/29) (closed).

## Outcome

- **`serverInfo` is always full** in code: `name`, `version`, `title`, `description`, `websiteUrl`, `icons` (see `src/app/api/mcp/route.ts`, `src/lib/mcp/server-info.ts`).
- **`icons[].sizes`** is a **string array** per MCP spec (2025-11-25 `Icon` schema) — `src/lib/app-version.ts`.
- **Docs:** `docs/internal/mcp-client-compatibility-matrix.md` — preview vs production, Neon `oauth_clients`, Google redirect URIs, Le Chat `integrations.create` note.
- **Env:** `MCP_SERVERINFO_ENABLE_*` removed from `src/lib/config/env.ts`; obsolete Preview (`develop`) values removed from Vercel.

## Completed checklist

- [x] Compatibility matrix doc (no per-field env rollout tables; troubleshooting retained)
- [x] Full `serverInfo` composition + tests (`initialize` in `tests/app/api/mcp/route.test.ts`)
- [x] Spec-correct `Icon.sizes` arrays
- [x] Remove feature-flag env vars from codebase and Vercel Preview where present
- [x] Close related issues [#25](https://github.com/markminnoye/bpost-mcp/issues/25), [#29](https://github.com/markminnoye/bpost-mcp/issues/29)

## Notes

Issue #29 originally proposed **progressive reintroduction behind flags**; product decision superseded that with **always-on full metadata** and operator-focused docs instead of staged env toggles.
