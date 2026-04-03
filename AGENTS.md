### 🎯 Project Setup: BPost MCP Service
**Tech Stack:** Vercel (Next.js / API Routes), TypeScript, Zod.
**Purpose:** An MCP wrapper for BPost's mail sorting/delivery batch announcement service.
**Integration Target:** Langflow (Orchestration & Workflow delivery).

### 📚 Documentation & Skills

This project uses the [BPost e-MassPost Skills Library](https://github.com/markminnoye/bpost-e-masspost-skills) (linked as a git submodule).
The documentation serves two roles:
1. **MCP service construction** — agents use it to build Zod schemas, client code, and validation logic.
2. **Distributable AI Skills** — the documentation is packaged as versioned .zip skills for Claude/Gemini, allowing customers to use the same logic in their own workflows.

### 🎯 Context Routing

Before implementing or architecting, agents MUST read:
- 1. **Project Vision:** `@docs/internal/vision.md` for the long-term roadmap and phase definitions.
- 2. **Project Design:** `@docs/internal/project-design.md` for architectural decisions, constraints, and data flow.
- 3. **Vercel MCP Docs:** [Deploy MCP Servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- 4. **Vercel Next.js Template:** [MCP with Next.js](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- 5. **Official MCP Examples:** [Claude AI MCP Servers](https://github.com/anthropics/claude-ai-mcp) — reference for tool definitions.
- 6. **BPost Technical Guide (Skills):** Start at `@docs/internal/e-masspost/skills/e-masspost-protocol/index.md` — this is the agent-optimized entry point for the protocol. Read the index first, then drill into specific files:
  - `schemas/` — Field specs, types, lengths, rules for building Zod schemas
  - `flows/` — Business logic, sequence diagrams, master/slave relationships
  - `transport/` — HTTP/FTP protocol details for client code
  - `errors/` — MPW-xxxx and MID-xxxx error codes for response handling
  - `barcode/` — Barcode structure, printing constraints, Code 128 encoding
  - `reference/` — Addressing rules, character restrictions, processing times
- 7. **Raw PDF & Page Images:** Original PDF at `@docs/external/Mail-ID Data_Exchange_Technical_Guide.pdf`. Page images at `@docs/external/pdf-pages/page-NNN.jpg` (200 DPI) — use these when you need to verify table data or see diagrams not captured in markdown.
- **Example Payloads:** Consult `@docs/samples/` (JSON/XML) for building unit tests inside `@tests/`.
- **Validation:** Write Zod schemas inside `@src/schemas/` mirroring the structure in `@docs/internal/bpost-guide/schemas/`.

### 🧠 Continuous Learning

When an agent discovers new insights, patterns, or corrections about the BPost API, file structures, or validation rules that are **not yet documented**, it should request to amend this file or the relevant markdown file in the skills submodule. Examples: undocumented error codes, edge cases in field validation, corrections to the guide, or reusable patterns discovered during implementation.

- **Documentation Audit (2026-03-28):** A systematic audit (BUG-001) identified several casing and naming inconsistencies between the e-MassPost Markdown files and the source XSDs. Key fixes included lowercase attribute names for `<Context>` tags and mapping `fieldToPrint1-3` to `distributionOffice/routeName/routeSeq` in responses. Always prioritize `.xsd` files in `resources/` as the absolute source of truth.

### ✅ Definition of Done (DoD)

1. **Lint:** Run `npm run lint:fix` on changed files.
2. **Type Check:** Run `npx tsc --noEmit` if working in `/src`.
3. **No Regressions:** Do not uncomment existing tests or skip suites.

### 🚧 Active Work

- **Phase 1 Skill Stack Design:** `@docs/superpowers/specs/2026-03-31-phase1-skill-stack-design.md`
  Status: **Complete.**

- **Phase 1 — Afwerken:** Alle action sub-schemas zijn volledig uitgewerkt vanuit de XSD bronnen. Response schemas toegevoegd.
  Status: **Complete.**

- **Phase 2 Design:** `@docs/internal/phase2-design.md`
  Brainstorm afgerond. Open vragen (credential storage, auth, self-learning storage, deployment) worden besproken met de architect vóór implementatie start.
  Status: **Wacht op architect review.**

### 🛠️ Available Agent Skills

The following skills are available in `.agent/skills/`. Invoke the relevant skill **before** starting any matching task — do not skip this even for simple tasks.

| Skill | When to use |
|---|---|
| `mcp-builder` | Building or extending MCP tools and server structure |
| `zod-validation-expert` | Writing or debugging Zod schemas |
| `typescript-pro` | Advanced TypeScript types, generics, strict patterns |
| `tdd-workflow` | Any feature or bugfix — RED-GREEN-REFACTOR cycle |
| `systematic-debugging` | Any bug, test failure, or unexpected behavior |
| `brainstorming` | Before designing features, APIs, or architecture |
| `architecture` | Architecture decisions, trade-off evaluation, ADRs |
| `architecture-patterns` | Clean/Hexagonal architecture, DDD patterns |
| `api-design-principles` | REST API design, endpoint naming, request/response shapes |
| `error-handling-patterns` | Resilient error handling and failure strategies |
| `code-reviewer` | After completing a feature or PR |
| `code-simplifier` | Refactoring for clarity and maintainability |
| `lint-and-validate` | After every code change — run validation before finishing |
| `concise-planning` | Multi-step tasks — generate an actionable checklist first |
| `kaizen` | Process improvements, standardization, quality reviews |
| `mermaid-expert` | Creating diagrams (flowcharts, sequences, ERDs) |
| `codex-review` | Code review with CHANGELOG generation |

### 🤝 Cross-Agent Collaboration (Antigravity & Claude)

To ensure consistency when switching between Antigravity (IDE) and Claude (CLI):

1. **Shared Capabilities:** All agents MUST reference `.agent/skills/` for domain-specific logic and `.agent/workflows/` for standard operating procedures (e.g., `/finalize-and-push`).
2. **Implementation Plans:** Before starting any multi-step task, agents MUST create or update a structured plan in `.agent/plans/task-name.md`.
    - Use checkboxes to track progress.
    - If tasking is interrupted, provide a "Status: Paused" section at the top for the next agent.
3. **Session Handoff:** When finished with a turn, update the active plan in `.agent/plans/` so the next agent (regardless of which one it is) has immediate context on the "Current State" and "Next Actions."
