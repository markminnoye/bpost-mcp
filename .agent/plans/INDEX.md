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
| [Phase 2 Sprint 1 — Credential Layer, Auth & Multi-Tenant MCP](2026-04-03-phase2-sprint1-implementation.md) | ✅ | Complete — credential layer, bearer token auth, Google OAuth dashboard, seed script |
| [Phase 2 Sprint 2 — Review Fixes](2026-04-04-sprint2-review-fixes.md) | ✅ | All critical and important review findings fixed |
| [Phase 2 Sprint 3 — Self-Learning & Feedback Loop](2026-04-10-phase2-sprint3-self-learning.md) | ✅ | Complete — implementing declarative, procedural, and escalation tools |
| [v2.1.0 Code Review Bug Fixes](2026-04-10-bugfix-v2.1.0-code-review.md) | ✅ | Fix 7 issues from code review: failing test, hardcoded URLs, slug typo, path traversal, heuristic, env default, minor polish |

---

## Phase 2 — Install Page

| Plan | Status | Notes |
|---|---|---|
| [Install Page — /install connection guide](2026-04-10-install-page.md) | ✅ | Public install guide: OAuth + Bearer Token setup |

---

## Phase 2 — Batch Pipeline Fixes

| Plan | Status | Notes |
|---|---|---|
| [Issue #10: Comps Mapping + seq Auto-Generation](2026-04-11-issue10-mapping-comps-seq.md) | ✅ | Fix Comps aggregation, seq auto-gen, error hints |
| [submit_ready_batch BPost XML Dispatch](2026-04-12-submit-ready-batch.md) | ✅ | Replace stub with real MailingCreate dispatch |
| [Issue #13: check_batch (OptiAddress pre-validation)](2026-04-12-check-batch.md) | ✅ | MailingCheck service, BpostValidation on BatchRow, updated get_batch_errors |
| [Barcode Strategy Configuration](2026-04-12-barcode-strategy.md) | ✅ | Tenant barcode strategy, MCP generation, dashboard UI |

---

## Superpowers — Afgeronde plannen

Deze plannen zijn uitgevoerd als onderdeel van de superpowers-iteraties en stonden oorspronkelijk in `docs/superpowers/plans/`.

| Plan | Status | Notes |
|---|---|---|
| [OAuth 2.0 MCP Integration](2026-04-07-oauth-mcp-integration.md) | ✅ | OAuth / OIDC auth flows voor MCP |
| [Batch Pipeline Hardening](2026-04-08-batch-pipeline-hardening.md) | ✅ | 7 code-review fixes in batch pipeline |
| [Token Revocation UI](2026-04-10-token-revocation-ui.md) | ✅ | Revoke-token modal + server action |

---

## Project Onboarding & Setup

| Plan | Status | Notes |
|---|---|---|
| [Vercel Project Onboarding](2026-04-03-vercel-onboarding.md) | ⬜ | Superseded — project already deployed and running on Vercel |

---

## Release — Main Production

| Plan | Status | Notes |
|---|---|---|
| [Main Release Vandaag](2026-04-13-main-release-readiness.md) | 🔄 | Scope lock + validatie voor productiedeploy |
| [Stap 3 Validatie Checklist](2026-04-13-step3-validatie-checklist.md) | 🔄 | Test assets + functionele regressie + manueel sign-off |

---

## Rules for Agents

1. **Before starting any multi-step task:** create a plan file here (`YYYY-MM-DD-short-name.md`) and add it to this index.
2. **Use checkboxes** (`- [ ]` / `- [x]`) inside plan files to track task-level progress.
3. **Update status in this index** when a plan moves from Active → Complete.
4. **Never delete superseded plans** — mark them ⬜ so history is preserved.
5. **On session handoff:** add a `## Status: Paused` section at the top of the active plan with current state and next actions.
6. **Reference docs** (vision.md, phase1-architecture.md, project-design.md) belong in `docs/internal/` — not here.
