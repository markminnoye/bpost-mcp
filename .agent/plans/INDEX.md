# Plan Index — bpost-mcp

All implementation plans, design specs, and architecture decisions live here.
**This is the single source of truth for project plans.**

> Reference docs (vision, architecture overviews, decision logs) stay in `docs/internal/`.
> Plans that drive or drove implementation live here.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete |
| 🔄 | Active — in progress |
| ⏳ | Pending — approved, not started |
| ⬜ | Superseded — kept for reference |

---

## Phase 1 — MCP Server, Schemas, HTTP Client

| Plan | Status | Notes |
|---|---|---|
| [Phase 1 Skill Stack Design](2026-03-31-phase1-skill-stack-design.md) | ✅ | Skills installed, structure agreed |
| [Phase 1 Implementation Plan](2026-03-31-phase1-implementation.md) | ✅ | MCP route, BpostClient, XML layer, envelope schemas |
| [Phase 1 Schema Completion Design](2026-04-01-phase1-schema-completion-design.md) | ✅ | All action sub-schemas + response schemas from XSDs |

---

## Phase 2 — Hosted, Multi-Tenant Service

| Plan | Status | Notes |
|---|---|---|
| [Phase 2 Design Brainstorm](2026-04-01-phase2-design-brainstorm.md) | ⬜ | Initial brainstorm — superseded by architecture plan below |
| [Phase 2 Architecture](2026-04-03-phase2-architecture.md) | ✅ | Approved architecture |
| [Phase 2 Sprint 1 — Credential Layer, Auth & Multi-Tenant MCP](2026-04-03-phase2-sprint1-implementation.md) | 🔄 | Active — credential layer, bearer token auth, Google OAuth dashboard, seed script |

---

## Project Onboarding & Setup

| Plan | Status | Notes |
|---|---|---|
| [Vercel Project Onboarding](2026-04-03-vercel-onboarding.md) | 🔄 | Create project, link repo, ready credentials |

---

## Rules for Agents

1. **Before starting any multi-step task:** create a plan file here (`YYYY-MM-DD-short-name.md`) and add it to this index.
2. **Use checkboxes** (`- [ ]` / `- [x]`) inside plan files to track task-level progress.
3. **Update status in this index** when a plan moves from Active → Complete.
4. **Never delete superseded plans** — mark them ⬜ so history is preserved.
5. **On session handoff:** add a `## Status: Paused` section at the top of the active plan with current state and next actions.
6. **Reference docs** (vision.md, phase1-architecture.md, project-design.md) belong in `docs/internal/` — not here.
