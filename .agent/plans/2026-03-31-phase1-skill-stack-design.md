# Phase 1 Skill Stack Design
**Date:** 2026-03-31
**Project:** bpost-mcp
**Scope:** Phase 1 — MCP server, Zod schemas, BPost HTTP client
**Status:** DRAFT — pending skill installation (see Section 6)

---

## 1. Context

The bpost-mcp project is a hosted MCP service that wraps BPost's e-MassPost batch announcement API. Phase 1 delivers three backend layers:

- **`src/app/api/mcp/`** — MCP tool definitions and Next.js route
- **`src/schemas/`** — Zod validation schemas derived from BPost XSDs
- **`src/client/`** — HTTP/FTP wrapper authenticating and dispatching to BPost

This spec defines the six skills selected from the antigravity-awesome-skills library to support Phase 1 development.

---

## 2. Selected Skills

| Skill | Source Path | Layer |
|---|---|---|
| `mcp-builder` | `antigravity-awesome-skills/skills/mcp-builder/SKILL.md` | MCP server |
| `zod-validation-expert` | `antigravity-awesome-skills/skills/zod-validation-expert/SKILL.md` | Schemas |
| `typescript-pro` | `antigravity-awesome-skills/skills/typescript-pro/SKILL.md` | All layers |
| `api-design-principles` | `antigravity-awesome-skills/skills/api-design-principles/SKILL.md` | HTTP client |
| `error-handling-patterns` | `antigravity-awesome-skills/skills/error-handling-patterns/SKILL.md` | HTTP client |
| `tdd-workflow` | `antigravity-awesome-skills/skills/tdd-workflow/SKILL.md` | Tests |

---

## 3. Layer Mapping

```
/bpost-mcp
├── src/app/api/mcp/          ← mcp-builder
│   └── route.ts                 Tool definitions, naming, agent-facing descriptions
│
├── src/schemas/              ← zod-validation-expert + typescript-pro
│   └── *.ts                     XSD → Zod schemas, z.infer<> types, .refine() rules
│
├── src/client/               ← api-design-principles + error-handling-patterns
│   └── bpost.ts                 HTTP/FTP wrapper, request/response contract,
│                                BPost auth, MPW/MID error parsing, retry logic
│
└── tests/                    ← tdd-workflow
    └── *.test.ts                Fixtures from docs/samples/, RED-GREEN-REFACTOR cycle
```

`typescript-pro` is horizontal — strict typing enforced across all three layers.

---

## 4. Development Workflow

Build order is schema-first. Schemas drive tool descriptions and client types.

```
1. SCHEMA FIRST  (zod-validation-expert + typescript-pro)
   Read BPost XSD in resources/ → define Zod schemas in src/schemas/
   Get z.infer<> types → reuse across MCP tools and client

2. TEST FIXTURES  (tdd-workflow)
   Before writing any implementation code in src/schemas/ or src/client/:
   convert docs/samples/*.json / *.xml → test fixtures, write the failing
   test first (RED phase), then implement to make it pass (GREEN phase)

3. MCP TOOLS  (mcp-builder)
   Define tool names: bpost_announce_batch, bpost_validate_address, etc.
   Write agent-facing descriptions using Zod types as input schemas

4. HTTP CLIENT  (api-design-principles + error-handling-patterns)
   Design src/client/ interface contract first
   Choose and document XML parsing library (e.g. fast-xml-parser or xml2js)
   for both serializing requests and deserializing BPost XML responses —
   document this decision in docs/internal/project-design.md before coding
   (create this file if it does not yet exist)
   Note: api-design-principles covers HTTP idioms; for FTP-specific concerns
   (connection lifecycle, passive mode, file naming) consult
   docs/internal/e-masspost/skills/e-masspost-protocol/transport/ftp-protocol.md
   Implement BPost HTTP/FTP calls
   Map MPW-xxxx / MID-xxxx codes → structured errors returned to agent

5. GREEN  (tdd-workflow)
   Make all fixtures pass → ship
```

---

## 5. Skill Invocation Triggers

| Skill | Invoke when... |
|---|---|
| `zod-validation-expert` | Opening any file in `src/schemas/` or working with XSD field specs |
| `mcp-builder` | Working on `src/app/api/mcp/route.ts` or defining tool names/descriptions |
| `api-design-principles` | Designing or modifying the `src/client/bpost.ts` interface |
| `error-handling-patterns` | Mapping MPW/MID error codes, implementing retry/circuit-breaker |
| `tdd-workflow` | Before writing any implementation code in `src/schemas/` or `src/client/` — write the failing test first (RED), then implement |
| `typescript-pro` | Any time strict typing or complex type inference is needed |

---

## 6. Installation

**Current state:** The five skills below are not yet present in `.agent/skills/`. Install them before implementation begins. (`mcp-builder` is already installed; other skills unrelated to Phase 1 may also be present in the directory.)

Source: `/Users/markminnoye/Library/Mobile Documents/com~apple~CloudDocs/AI_tools/skills/antigravity-awesome-skills/skills/`
*(Note: this is a machine-specific iCloud path — adjust if working from a different machine)*

Copy into `.agent/skills/`:

```
.agent/skills/
├── mcp-builder/             ← already installed
├── zod-validation-expert/   ← copy from source
├── error-handling-patterns/ ← copy from source
├── api-design-principles/   ← copy from source
├── tdd-workflow/            ← copy from source
└── typescript-pro/          ← copy from source
```

No implementation should begin until all six skills are on disk.

---

## 7. Out of Scope (Phase 1)

The following skills were considered and deferred to later phases:

| Skill | Deferred reason |
|---|---|
| `secrets-management` | Phase 2 — Vault/credential abstraction not needed for Phase 1 env vars |
| `nextjs-app-router-patterns` | MCP transport and route handler patterns are covered by `mcp-builder`; generic App Router patterns not needed for Phase 1 |
| `api-documentation-generator` | Nice-to-have, not a Phase 1 blocker |
| `gdpr-data-handling` | Phase 2 — data minimization layer not yet in scope |
| `agent-memory-systems` | Phase 2 — self-learning knowledge base |

---

## 8. Non-Goals

- No frontend UI
- No credential vault or BPost login session management
- No self-learning / auto-bug-report tooling
- No n8n/Zapier integration nodes
