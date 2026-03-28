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
- 1. **Project Design:** `@docs/internal/project-design.md` for architectural decisions, constraints, and data flow.
- 2. **Vercel MCP Docs:** [Deploy MCP Servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- 3. **Vercel Next.js Template:** [MCP with Next.js](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- 4. **Official MCP Examples:** [Claude AI MCP Servers](https://github.com/anthropics/claude-ai-mcp) — reference for tool definitions.
- 5. **BPost Technical Guide (Skills):** Start at `@docs/internal/e-masspost/skills/e-masspost-protocol/index.md` — this is the agent-optimized entry point for the protocol. Read the index first, then drill into specific files:
  - `schemas/` — Field specs, types, lengths, rules for building Zod schemas
  - `flows/` — Business logic, sequence diagrams, master/slave relationships
  - `transport/` — HTTP/FTP protocol details for client code
  - `errors/` — MPW-xxxx and MID-xxxx error codes for response handling
  - `barcode/` — Barcode structure, printing constraints, Code 128 encoding
  - `reference/` — Addressing rules, character restrictions, processing times
- 5. **Raw PDF & Page Images:** Original PDF at `@docs/external/Mail-ID Data_Exchange_Technical_Guide.pdf`. Page images at `@docs/external/pdf-pages/page-NNN.jpg` (200 DPI) — use these when you need to verify table data or see diagrams not captured in markdown.
- **Example Payloads:** Consult `@docs/samples/` (JSON/XML) for building unit tests inside `@tests/`.
- **Validation:** Write Zod schemas inside `@src/schemas/` mirroring the structure in `@docs/internal/bpost-guide/schemas/`.

### 🧠 Continuous Learning

When an agent discovers new insights, patterns, or corrections about the BPost API, file structures, or validation rules that are **not yet documented**, it should request to amend this file or the relevant markdown file in the skills submodule. Examples: undocumented error codes, edge cases in field validation, corrections to the guide, or reusable patterns discovered during implementation.

- **Documentation Audit (2026-03-28):** A systematic audit (BUG-001) identified several casing and naming inconsistencies between the e-MassPost Markdown files and the source XSDs. Key fixes included lowercase attribute names for `<Context>` tags and mapping `fieldToPrint1-3` to `distributionOffice/routeName/routeSeq` in responses. Always prioritize `.xsd` files in `resources/` as the absolute source of truth.

### ✅ Definition of Done (DoD)

1. **Lint:** Run `npm run lint:fix` on changed files.
2. **Type Check:** Run `npx tsc --noEmit` if working in `/src`.
3. **No Regressions:** Do not uncomment existing tests or skip suites.
