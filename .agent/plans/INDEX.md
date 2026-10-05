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

## Phase 2 — Transparency & Reviewability

| Plan | Status | Notes |
|---|---|---|
| [Issue #15: MCP Knowledge Transparency Page](2026-04-14-issue15-transparency-page.md) | ✅ | Static `/reference` page + build-time MCP metadata extraction |
| [Reference Page: Floating Index UI](2026-04-14-floating-index.md) | ✅ | Sticky UI bar with scroll spy & compact tool cards |

---

## Phase 2 — MCP client compatibility & `serverInfo`

| Plan | Status | Notes |
|---|---|---|
| [Issue #29: MCP metadata compatibility](2026-04-14-issue29-mcp-metadata-compatibility.md) | ✅ | Full `initialize.serverInfo`, spec-correct `icons[].sizes`, compatibility matrix doc; removed `MCP_SERVERINFO_ENABLE_*` flags |

---

## Phase 2 — MCP Registry manifest & CI (issue #31)

| Plan | Status | Notes |
|---|---|---|
| [Issue #31: MCP validation, manifest & CI](2026-04-15-issue31-mcp-validation-manifest-ci.md) | ✅ | Root `server.json`, `validate:server-manifest`, `mcp-ci.yml`, tool annotations / `outputSchema`; docs in README + compatibility matrix |

---

## Address Proofing (Mailops REST)

| Plan | Status | Notes |
|---|---|---|
| [Address Proofing skill-integratie](2026-09-24-address-proofing-skill.md) | ✅ | Separate skill + protocol routing; Comp aliases → Table 46 |
| [Address Proofing MCP client](2026-09-24-address-proofing-mcp.md) | ⏳ | After freeze + API key; server-side PII strip; complement to `check_batch` |

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

## Bpost Library & Webapp (Contrapunt) — MCP in de ijskast

| Plan | Status | Notes |
|---|---|---|
| [Adressen klaarmaken voor bpost](2026-09-26-contrapunt-aft-address-prep.md) | ⬜ | Stub. Lokale AFT-skill afgevoerd 29/09. |
| [Bpost e-MassPost library + webapp](2026-09-28-bpost-library-web-app.md) | 🔄 | **Koers 29/09:** XML via **FTP**, validatie via **OptiAddress** (`MailingCheck` / 7001). Library staat; web UI en live FTP nog niet. |
| [SR-79 kolom-mapping suggestie](2026-09-29-sr-79-column-mapping-suggest.md) | ✅ | API: heuristics + optionele AI. Geen UI. Caller bevestigt. |
| [Masspost web-flow: ontwerp](2026-10-02-masspost-web-flow-design.md) | 🔄 | Brainstorm over de gebruikersflow, toestanden en statussen voor de webinterface (fase 2b). Besluitenlog en open vragen. |
| [POC formaatvalidatie](2026-10-05-masspost-poc-formaatvalidatie.md) | 🔄 | `/masspost/poc`: Excel inlezen, kolommen koppelen en formaatvalidatie, alles in de browser (exceljs, tot 150.000 adressen om te meten). Nieuwe library-module `format-check.ts`, losstaand bestand via `npm run build:poc`. Wacht op review van Mark. |
| [AI-kolommapping met gemaskeerde voorbeelddata](2026-10-05-masspost-ai-kolommapping.md) | 🔄 | Backend klaar (06/10): `mask.ts` (eerste letter + `X`/`x`, postcode met gemeente leesbaar), `POST /api/masspost/suggest-mapping` met nieuw contract (7 rollen, volgorde), `npm run eval:ai-mapping`. ADR 0006. Interface (06/10): schakelaar "AI-voorstel" bij *Gebruiken als*, ✦ in de keuzelijsten. Wacht op review. |
| [Masspost: volledige API, dan de website](2026-10-01-masspost-api-and-web.md) | 🔄 | **Vervolg op het plan van 28/09.** Fase 0 FTP-spike op Vercel · 0b protocoltests (Create/Delete/Reuse, modus C/P) · 1 toegang + library-fixes · 2 Postgres + routes onder `src/app/api/masspost/` · 2b schetsen · 3 Tailwind/shadcn + login, index, wizard (v0) · 4 docs. Fase 0 TLS-fix en `--mode`-tests staan klaar (01/10). |

---

## Release — Main Production

| Plan | Status | Notes |
|---|---|---|
| [Main release sync — squash merge develop to main](2026-04-15-main-squash-merge.md) | ✅ | Squash merge uitgevoerd (`850e5f0`), daarna `main` terug gemerged in `develop` voor branch alignment |
| [Canonical host bpost.sonicrocket.app](2026-09-28-canonical-app-host.md) | ✅ | Install prompt via `{{BASE_URL}}`, registry/README off `.be`, legacy JWT issuer allowlist for `.io` |

---

## Documentation

| Plan | Status | Notes |
|---|---|---|
| [Documentation standard](2026-09-30-documentation-standard.md) | ✅ | TSDoc + TypeDoc, OpenAPI 3.1 from Zod, agent rules, `docs:check` |

---

## Rules for Agents

1. **Before starting any multi-step task:** create a plan file here (`YYYY-MM-DD-short-name.md`) and add it to this index.
2. **Use checkboxes** (`- [ ]` / `- [x]`) inside plan files to track task-level progress.
3. **Update status in this index** when a plan moves from Active → Complete.
4. **Never delete superseded plans** — mark them ⬜ so history is preserved.
5. **On session handoff:** add a `## Status: Paused` section at the top of the active plan with current state and next actions.
6. **Reference docs** (vision.md, phase1-architecture.md, project-design.md) belong in `docs/internal/` — not here.
