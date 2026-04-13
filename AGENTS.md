### Project Setup: BPost MCP Service

**Stack:** Vercel (Next.js), TypeScript, Zod.
**Goal:** MCP wrapper for BPost e-MassPost protocol for Langflow orchestration.

### Documentation & Skills

Uses [BPost e-MassPost Skills Library](https://github.com/markminnoye/bpost-e-masspost-skills) (git submodule).
1. **Construction:** Build Zod schemas, client code, and validation.
2. **Distribution:** Packaged as versioned .zip skills for Claude/Gemini.

### Context Routing (Read Order)

1. **Vision:** `@docs/internal/vision.md` (Roadmap)
2. **Design:** `@docs/internal/project-design.md` (Architecture)
3. **External:** [Vercel MCP](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel), [Claude MCP Examples](https://github.com/anthropics/claude-ai-mcp)
4. **BPost Protocol:** `@docs/internal/e-masspost/skills/e-masspost-protocol/index.md`
   - `schemas/`: Field specs & Zod rules
   - `flows/`: Business logic & sequence diagrams
   - `transport/`: HTTP/FTP protocol
   - `errors/`: MPW/MID error codes
5. **Raw Source:** `@docs/external/Mail-ID Data_Exchange_Technical_Guide.pdf` (Verify table data/diagrams)
6. **Samples:** `@docs/samples/` (Use for `@tests/`)

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

### Active Work

See `.agent/plans/INDEX.md` for details.
- **Phase 1 & Phase 2 Sprint 1 & 2:** ✅ Complete.
- **Phase 2 Sprint 3:** ✅ Complete (declarative, procedural, escalation tools; `check_batch`, `submit_ready_batch`, barcode strategy).
- **Release Freeze:** 🔄 Active — Main release to production in progress. Only blockers/fixes; no scope expansion.

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
