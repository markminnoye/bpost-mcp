### Project Setup: BPost MCP Service

**Stack:** Vercel (Next.js), TypeScript, Zod.
**Goal:** MCP wrapper for BPost e-MassPost protocol for Langflow orchestration.

**Build order (locked):** (1) reusable library / API in `src/core/masspost/` first — Excel → mapping → validate → XML → transport; (2) only then a thin interface on top (web now; later possibly MCP again). Do not build UI before the API surface exists. Prefer minimal code for easy maintenance.

### Documentation & Skills

Uses [BPost e-MassPost Skills Library](https://github.com/markminnoye/bpost-e-masspost-skills) (git submodule).
1. **Construction:** Build Zod schemas, client code, and validation.
2. **Distribution:** Packaged as versioned .zip skills for Claude/Gemini, built from the library's `docs/` folder (also published on GitBook).

### Context Routing (Read Order)

1. **Vision:** `@docs/internal/vision.md` (Roadmap)
2. **Design:** `@docs/internal/project-design.md` (Architecture)
3. **External:** [Vercel MCP](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel), [Claude MCP Examples](https://github.com/anthropics/claude-ai-mcp)
4. **BPost Protocol:** `@docs/internal/e-masspost/docs/README.md`
   - `schemas/`: Field specs & Zod rules
   - `flows/`: Business logic & sequence diagrams
   - `transport/`: HTTP/FTP protocol
   - `errors/`: MPW/MID error codes
5. **Raw Source:** `@docs/external/Mail-ID Data_Exchange_Technical_Guide.pdf` (Verify table data/diagrams)
6. **Samples:** `@docs/samples/` (Use for `@tests/`)
7. **Masspost library / CLI:** `@docs/internal/masspost-library.md` (scripts `generate:mailing-xml`, `test:transport`, module map) + `@docs/internal/masspost-test-env.md` (credentials)

### Continuous Learning

Request amendments to this file or the submodule when discovering new BPost API insights (undocumented codes, edge cases). See `CHANGELOG.md` (v1.1.0) for historical audit details.

### Definition of Done (DoD)

1. `npm run lint:fix`
2. `npx tsc --noEmit` (in `/src`)
3. No regressions in existing test suites.

### Environment & Configuration

- **Zero Hardcoding**: Never hardcode production fallback URLs (like `.vercel.app`) in components or logic.
- **Centralized Config**: All environment variables must be accessed via `src/lib/config/env.ts`. This file uses Zod to validate the environment on startup.
- **Fail Fast**: If a critical environment variable is missing or invalid, the application should throw a clear validation error at boot time.

### Deployment

**Preflight:** `vercel --version` | `vercel link` | `git status`
**Deploy:** Preview (`vercel`) | Production (`vercel --prod`) ⚠️ *Main branch only*
**Verify:** `vercel inspect <url>` | `vercel logs <url> --level error`

### Plan Management

Plans live in `.agent/plans/`.
- **Index:** `.agent/plans/INDEX.md` (Status: ✅ / 🔄 / ⏳ / ⬜)
- **New Task:** Create `YYYY-MM-DD-name.md` and register in Index.
- **Handoff:** Add `## Status: Paused` to active plan with current state.

### Issue Management

When an implementation task is complete:
- **Do NOT close the GitHub issue.** Set the issue's **Status** on the GitHub Project board to **In review** (single select field on the project — not a GitHub issue label).
- This gives you the opportunity to review the implementation before final closure.
- Only close the issue after you have explicitly reviewed and approved it.

### Commit & Changelog Discipline

- **Mandatory before every commit:** update `CHANGELOG.md` under `## [Unreleased]` for user-visible or behavior-impacting changes.
- **Bundle related work:** when multiple small commits belong to the same fix/feature, merge them into one coherent changelog entry instead of duplicating bullets.
- **Structure:** keep entries grouped as `Nieuw`, `Aanpassingen`, `Oplossingen` (NL summary) and `Added/Changed/Fixed` (EN audit), with issue links where relevant.
- **No stale releases:** if a release heading is accidentally removed or malformed during merges, restore it before committing.

### Active Work

See `.agent/plans/INDEX.md` for details.
- **Phase 1 & Phase 2 Sprint 1 & 2:** ✅ Complete.
- **Phase 2 Sprint 3:** ✅ Complete (declarative, procedural, escalation tools; `check_batch`, `submit_ready_batch`, barcode strategy).
- **MCP tooling: paused (28/09/2026).** No new MCP feature work. Public endpoint is `/mcp` (`src/app/mcp`); `/api/mcp` is a legacy alias. Do not scope-expand MCP.
- **New focus:** a reusable library (`src/core/masspost/`) for the bpost e-MassPost integration, with a **web interface** (not MCP) for Contrapunt. See [Bpost e-MassPost library + webapp](.agent/plans/2026-09-28-bpost-library-web-app.md). **API/library first, UI second** — never the reverse. Interfaces stay thin and replaceable.
- **MAIL ID protocol (locked 28/09/2026):** Contrapunt default **version 2.00 (`0200`)** — live portal Status 100. Dual-support `0100`/`0102` via `midVersion`.
- **Path (locked 29/09/2026):** send `MailingRequest` XML over **FTP**; validate addresses with **OptiAddress** (`MailingCheck`, corrections as message 7001). Do not build the local AFT skill in `.agent/plans/2026-09-26-contrapunt-aft-address-prep.md` (stub). Living plan: `.agent/plans/2026-09-28-bpost-library-web-app.md`.
- **How to run / extend the library:** `docs/internal/masspost-library.md`.

### Available Agent Skills

Invoke relevant skill from `.agent/skills/` before matching tasks.

| Skill | Use Case |
|---|---|
| `mcp-builder` | Tool/server structure |
| `zod-validation-expert` | Zod schemas |
| `typescript-pro` | Advanced TS/Generics |
| `tdd-workflow` | Red-Green-Refactor |
| `systematic-debugging` | Bugs/Failures |
| `brainstorming` | Design/Architecture |
| `architecture(-patterns)` | ADRs, Clean Arch, DDD |
| `api-design-principles` | REST/Naming |
| `error-handling-patterns` | Resilient strategies |
| `code-reviewer` | PR/Feature review |
| `code-simplifier` | Refactoring |
| `lint-and-validate` | Final validation |
| `concise-planning` | Checklists |
| `kaizen` / `codex-review` | Quality / Changelogs |
| `mermaid-expert` | Diagrams |
| `markdown-token-optimizer` | Token efficiency |
| `NotebookLM-WrapUp` | Session handoff |

### Customer-facing copy (Vlaams, niet-technisch)

Wanneer je **klantgerichte** code of teksten wijzigt (UI, user-visible errors, onboarding, e-mails, help):

1. Laad expliciet: `@.agent/prompts/customer-facing-agent.md`
2. Pas die regels **alleen** toe op user-facing output; MCP-toolbeschrijvingen en developer-docs blijven technisch (zie eerdere secties).

**Chat via MCP:** het model krijgt bij connect ook `instructions` uit `src/lib/mcp/server-instructions.ts` (Vlaams naar de gebruiker, geen jargon). Wijzig die tekst daar als de gewenste chat-toon aangepast wordt.

**Cursor:** voor `dashboard`, `install`, `page.tsx` en `layout.tsx` wordt `.cursor/rules/bpost-customer-facing.mdc` automatisch meegenomen; breid globs daar uit als nieuwe klantpagina’s bijkomen.

### Cross-Agent Collaboration

1. **Shared Logic:** Use `.agent/skills/` and `.agent/workflows/`.
2. **Implementation:** Update plans in `.agent/plans/` + `INDEX.md`.
3. **Tracking:** Use checkboxes. Add `## Status: Paused` if interrupted.
4. **Handoff:** Update active plan before finishing turn.
