### 🎯 Project Setup: BPost MCP Service
**Tech Stack:** Vercel (Next.js / API Routes), TypeScript, Zod.
**Purpose:** An MCP wrapper for BPost's mail sorting/delivery batch announcement service.
**Integration Target:** Langflow (Orchestration & Workflow delivery).

### 📚 Documentation Purpose (Dual Use)

The `docs/internal/bpost-guide/` documentation serves two roles:
1. **MCP service construction** — agents use it to build Zod schemas, HTTP/FTP client code, error handling, and barcode logic.
2. **Help chatbot knowledge base** — agents use it to assist end users (e.g. "how do I submit a deposit?", "what does error MID-3010 mean?"). The docs are written to be self-contained and readable by both humans and AI agents.

### 🎯 Context Routing

Before implementing or architecting, agents MUST read:
- 1. **Project Design:** `@docs/internal/project-design.md` for architectural decisions, constraints, and data flow.
- 2. **Vercel MCP Docs:** [Deploy MCP Servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- 3. **Vercel Next.js Template:** [MCP with Next.js](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- 4. **BPost Technical Guide:** Start at `@docs/internal/bpost-guide/index.md` — this is the agent-optimized entry point to the full BPost Data Exchange Technical Guide (203 pages). Read the index first, then drill into only the specific file(s) needed for your task:
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

When an agent discovers new insights, patterns, or corrections about the BPost API, file structures, or validation rules that are **not yet documented**, it should request to amend this file or the relevant markdown file in `@docs/internal/bpost-guide/`. Examples: undocumented error codes, edge cases in field validation, corrections to the guide, or reusable patterns discovered during implementation.

### ✅ Definition of Done (DoD)

1. **Lint:** Run `npm run lint:fix` on changed files.
2. **Type Check:** Run `npx tsc --noEmit` if working in `/src`.
3. **No Regressions:** Do not uncomment existing tests or skip suites.
