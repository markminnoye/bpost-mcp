# Documentation standard

Minimal, reusable docs setup. Generated output is committed so GitBook Git Sync can read Markdown and one OpenAPI file. No docs app to host.

## Status: Done

- [x] TSDoc on public exports of `src/core/masspost/index.ts` where it was missing
- [x] TypeDoc Markdown → `docs/library/` (`npm run docs:code`)
- [x] OpenAPI 3.1 → `docs/service-api/openapi.yaml` (`npm run docs:api`)
- [x] `docs/mcp/README.md` only; MCP stays out of the service spec (official URL `/mcp`, `/api/mcp` legacy alias)
- [x] Publish workflow force-pushes `docs/` to branch `docs` and does not commit to `main`
- [x] Rules in `AGENTS.md` and `.cursor/rules/documentation.mdc` (`CLAUDE.md` already points at `AGENTS.md`)
- [x] ADR template + ADR 0001
- [x] `docs/README.md` for GitBook / other readers
- [x] `npm run docs:check` in CI, separate step after the existing checks

## Out of scope

- MCP tool surface (frozen). Only a README under `docs/mcp/`.
- `POST /api/masspost/suggest-mapping` (draft PR #38; not on this branch)
- `eslint-plugin-tsdoc` (would be a second lint pass; staleness check is the gate)
- Merging or deploying
