# Plan: Phase 2 Sprint 3 — Self-Learning Tools & Feedback Loop

**Date:** 2026-04-10
**Status:** 🔄 Active
**Goal:** Implement the "Self-Learning" capabilities described in the Vision doc: Declarative Knowledge (protocol rules), Procedural Knowledge (auto-fixer scripts), and Feedback Loop (GitHub Issue reporting).

---

## Task A: Preparations & Versioning

- [ ] **Step 1: Align versioning**
  - Update `package.json` to `2.1.0` (from `0.1.1`).
  - Move `[Unreleased]` changes in `CHANGELOG.md` to `[2.1.0] - 2026-04-10`.
- [ ] **Step 2: Sync AGENTS.md and INDEX.md**
  - Ensure Sprint 2 is marked ✅ correctly and Sprint 3 is 🔄.

---

## Task B: Declarative Knowledge (Protocol Rules)

- [x] **Step 1: Create `add_protocol_rule` tool**
  - Tool to append a new rule to `docs/internal/e-masspost/learned_rules.md`.
  - Input: `rule` (string), `context` (string, e.g. "MID-4010").
  - Implementation: Append to file with timestamp and context.
- [x] **Step 2: Verify rule persistence**
  - Verify that the tool can write to the submodule path (even if not committed to submodule's origin yet).

---

## Task C: Procedural Knowledge (Auto-Fixer Scripts)

- [x] **Step 1: Create `create_fix_script` tool**
  - Tool to save a reusable TypeScript/JavaScript snippet for data cleaning.
  - Path: `src/lib/auto-fixers/`.
  - Input: `name` (string), `code` (string), `description` (string).
- [x] **Step 2: Create `apply_fix_script` tool**
  - Tool to run a saved script against a specific batch row in KV.

---

## Task D: Feedback Loop (Auto-Bug Report)

- [x] **Step 1: Create `report_issue` tool**
  - Tool to create a GitHub Issue via the GitHub API.
  - Target: Choose between `bpost-mcp` (server bug) or `bpost-e-masspost-skills` (protocol bug).
  - Input: `repo` ("mcp" | "skills"), `title`, `body`.
- [x] **Step 2: Configure GitHub Token**
  - Ensure `GITHUB_TOKEN` is available in `.env.local`.

---

## Status: Complete
- Implementation finished and verified with unit tests.
- Version bumped to 2.1.0.
