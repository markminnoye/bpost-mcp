# Sprint 2 Code Review Fixes

**Date:** 2026-04-04
**Branch:** develop
**Trigger:** Code review of Phase 2 Sprint 2 (batch pipeline) found 4 critical issues, 5 important issues, 3 minor suggestions.

---

## Scope

All fixes are in `src/app/api/mcp/route.ts` and `src/lib/kv/client.ts`.

---

## Tasks

### Task 1 — Trivial Zod input schema fixes (CRIT-4, IMP-2)
- [x] `rowIndex` in `apply_row_fix`: change `z.number()` → `z.number().int().min(0)`
- [x] `limit` in `get_batch_errors`: change `z.number().optional().default(10)` → `z.number().int().min(1).default(10)`

### Task 2 — State integrity & stub message (CRIT-2, IMP-4)
- [x] Fix fabricated `"MPW-200 OK"` string in `submit_ready_batch` to a clear `[STUB]` message
- [x] Add double-submission guard (`status === 'SUBMITTED'` check before proceeding)
- [x] Add MAPPED-only guard (`status !== 'MAPPED'` → reject with clear error)

### Task 3 — Source column validation (IMP-5)
- [x] In `apply_mapping_rules`, validate that every `sourceCol` key in `mapping` exists in `state.headers`
- [x] Return `isError: true` with a descriptive message listing unrecognised column names

### Task 4 — Wire Zod row validation in `apply_mapping_rules` (CRIT-1, IMP-1)
- [x] Define or extract a per-row Zod validation schema (from `MailingRequestSchema` sub-schemas)
- [x] After building `mapped` objects, run validation against each row
- [x] Populate `row.validationErrors` (typed as `z.ZodIssue[]`) for failing rows
- [x] Validate that target column names (mapping values) are known schema fields (IMP-1)

### Task 5 — Re-validate after `apply_row_fix` (CRIT-3)
- [x] After merging `correctedData` into `row.mapped`, re-run the per-row Zod validation (from Task 4)
- [x] Set `row.validationErrors = undefined` ONLY if validation passes; otherwise store new errors

### Task 6 — Minor cleanup (SUG-1, SUG-2, SUG-3, IMP-3)
- [x] Extract bearer token logic into `src/lib/auth/extract-token.ts` and use it in both routes (SUG-1)
- [x] Type `BatchRow.validationErrors` as `z.ZodIssue[]` instead of `any[]` in `src/lib/kv/client.ts` (SUG-2)
- [x] Replace hardcoded `https://bpost.sonicrocket.io/api/batches/upload` with `process.env.NEXT_PUBLIC_BASE_URL ?? ''` (SUG-3)
- [x] Register this plan in `INDEX.md` (IMP-3)

---

## Dependencies

- Task 5 depends on Task 4 (needs the per-row validation function)
- All other tasks are independent
