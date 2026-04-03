# Plan: Vercel Project Onboarding — bpost-mcp

**Datum:** 2026-04-03
**Status:** 🔄 Active
**Goal:** Create a new Vercel project, link the GitHub repository, and establish the environment needed to proceed with **Task 7b** (external services setup) of Sprint 1.

---

## Task A: Create and Link Vercel Project (Dashboard)

- [ ] **Step 1: Import Repository**
  1. Open [vercel.com/new](https://vercel.com/new).
  2. Log in with your GitHub account.
  3. Find and select the `markminnoye/bpost-mcp` repository.
  4. Click **Import**.

- [ ] **Step 2: Initial Configuration**
  1. **Project Name:** Ensure it is `bpost-mcp` (or your preferred name).
  2. **Framework Preset:** Verify it is set to **Next.js**.
  3. **Root Directory:** `./` (default).
  4. **Build & Output Settings:** Leave as default (Next.js automatically handles this).

- [ ] **Step 3: Skip Env Vars for now**
  1. Do not add any environment variables yet (we will do this in Task 7b via the Vercel Marketplace/CLI).
  2. Click **Deploy**.

- [ ] **Step 4: Verify First Build**
  1. The build will likely fail on the first run (Phase 2 code expects `DATABASE_URL` which isn't there yet).
  2. **This is normal and expected.** We just need the project record to exist on Vercel.

---

## Task B: Local Project Linking (CLI)

- [ ] **Step 1: Link in Terminal**
  1. Ensure the Vercel CLI is installed: `npm install -g vercel` (if not already).
  2. Log in: `vercel login`.
  3. Initialize linkage in project root:
     ```bash
     vercel link
     ```
  4. Answer **Yes** to search for the project you just created.
  5. Select the project `bpost-mcp`.

- [ ] **Step 2: Pull Environment State**
  1. Create a local environment template:
     ```bash
     vercel env pull .env.local
     ```
  2. Verify a `.vercel` folder and `.env.local` file (even if empty of custom vars) are created.

---

## Task C: Verification Checkpoint

- [ ] **Step 1: Project Domain Availability**
  1. Find your project's production domain (e.g., `bpost-mcp.vercel.app`) in the Vercel dashboard.
  2. **Copy this URL.** You will need it in Task 7b for the Google OAuth callback URI.

- [ ] **Step 2: Read Task 7b**
  1. Open [.agent/plans/2026-04-03-phase2-sprint1-implementation.md](.agent/plans/2026-04-03-phase2-sprint1-implementation.md) at line 737.
  2. You are now ready to begin **Task 7b: External service setup**.

---

## Status: Ready to Proceed
Once completed, return to the Sprint 1 implementation plan to provision Neon Postgres and Google OAuth.
