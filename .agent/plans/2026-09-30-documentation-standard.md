# Documentation standard

Minimal, reusable docs setup. Generated output is committed so GitBook Git Sync can read Markdown and one OpenAPI file. No docs app to host.

## Status: Done

- [x] TSDoc on public exports of `src/core/masspost/index.ts` where it was missing
- [x] TypeDoc Markdown → `docs/api-reference/library/` (`npm run docs:code`)
- [x] OpenAPI 3.1 from Zod schemas the handler already parses (`npm run docs:api`)
- [x] Rules in `AGENTS.md` and `.cursor/rules/documentation.mdc` (`CLAUDE.md` already points at `AGENTS.md`)
- [x] ADR template + ADR 0001
- [x] `docs/README.md` for GitBook / other readers
- [x] `npm run docs:check` in CI, separate step after the existing checks

## Out of scope

- MCP routes, and any route that does not parse a Zod schema (listed in `docs/README.md`, not invented)
- `POST /api/masspost/suggest-mapping` (draft PR #38; not on this branch)
- `eslint-plugin-tsdoc` (would be a second lint pass; staleness check is the gate)
- Merging or deploying
