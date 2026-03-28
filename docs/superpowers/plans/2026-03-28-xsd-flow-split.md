# XSD Flow Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ~3,600 lines of inline XSD embeds from 4 schema docs, replace each with a short routing section, and add explicit two-flow orientation to `index.md` and `resources/index.md`.

**Architecture:** Pure markdown editing. Each schema doc has a `## XML Schema (XSD)` section appended at the bottom — strip it and replace with a compact `## XML Validation` section. Update the two navigation docs to clarify the text flow vs. XML flow split.

**Tech Stack:** Markdown only — no code, no build steps.

---

## File Map

**Modify (strip XSD embed + add routing section):**
- `docs/internal/bpost-guide/schemas/deposit-request.md` — remove `## XML Schema (XSD)` section, add `## XML Validation`
- `docs/internal/bpost-guide/schemas/deposit-response.md` — same
- `docs/internal/bpost-guide/schemas/mailing-request.md` — same
- `docs/internal/bpost-guide/schemas/mailing-response.md` — same

**Modify (navigation updates):**
- `docs/internal/bpost-guide/index.md` — add two-flow orientation note inside `## Navigation`
- `docs/internal/bpost-guide/resources/index.md` — fix stale "embedded inline" sentence in XSD section

**Do NOT touch:**
- `schemas/deposit-acknowledgement.md` — `RequestAck.xsd` (38 lines) stays embedded
- `schemas/mailing-acknowledgement.md` — link-only section is correct, leave as-is
- `transport/compression-and-encoding.md` — already has XSD links, no change needed
- Any `.xsd` files in `resources/`

---

## Conventions

The `## XML Schema (XSD)` section in each schema doc was appended at the very end, preceded by a `---` horizontal rule. The full pattern to remove looks like:

```
\n---\n\n## XML Schema (XSD)\n\n[download link]\n\n```xml\n...\n```\n
```

The replacement `## XML Validation` section goes in the same position (end of file), also preceded by `---`.

---

## Task 1: Strip deposit-request.md and add routing section

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/deposit-request.md`

- [ ] **Step 1: Find where the XSD section starts**

Read `docs/internal/bpost-guide/schemas/deposit-request.md` from the end — find the line containing `## XML Schema (XSD)`. The `---` immediately before it and everything after (to end of file) must be removed.

- [ ] **Step 2: Remove the XSD section**

Delete from the `---` preceding `## XML Schema (XSD)` to the end of the file. The file should end after the last human-readable content (field tables, notes, etc.).

- [ ] **Step 3: Append the replacement section**

Append exactly this to the end of the file:

```markdown

---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [DepositRequest.xsd](../resources/DepositRequest.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
```

- [ ] **Step 4: Verify**

Read the last 15 lines of the file. Confirm:
- The file ends with the `## XML Validation` section
- No `xs:` or `<?xml` content remains
- The download link points to `../resources/DepositRequest.xsd`

- [ ] **Step 5: Commit**

```bash
git add docs/internal/bpost-guide/schemas/deposit-request.md
git commit -m "docs: replace inline DepositRequest.xsd embed with XML Validation routing section"
```

---

## Task 2: Strip deposit-response.md and add routing section

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/deposit-response.md`

- [ ] **Step 1: Find where the XSD section starts**

Read `docs/internal/bpost-guide/schemas/deposit-response.md` from the end — find the `## XML Schema (XSD)` heading and the `---` immediately before it.

- [ ] **Step 2: Remove the XSD section**

Delete from the `---` preceding `## XML Schema (XSD)` to the end of the file.

- [ ] **Step 3: Append the replacement section**

```markdown

---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [DepositResponse.xsd](../resources/DepositResponse.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
```

- [ ] **Step 4: Verify**

Read the last 15 lines. Confirm no `xs:` content remains and the link points to `../resources/DepositResponse.xsd`.

- [ ] **Step 5: Commit**

```bash
git add docs/internal/bpost-guide/schemas/deposit-response.md
git commit -m "docs: replace inline DepositResponse.xsd embed with XML Validation routing section"
```

---

## Task 3: Strip mailing-request.md and add routing section

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/mailing-request.md`

- [ ] **Step 1: Find where the XSD section starts**

Read `docs/internal/bpost-guide/schemas/mailing-request.md` from the end — find the `## XML Schema (XSD)` heading and the `---` immediately before it.

- [ ] **Step 2: Remove the XSD section**

Delete from the `---` preceding `## XML Schema (XSD)` to the end of the file.

- [ ] **Step 3: Append the replacement section**

```markdown

---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [MailingRequest.xsd](../resources/MailingRequest.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
```

- [ ] **Step 4: Verify**

Read the last 15 lines. Confirm no `xs:` content remains and the link points to `../resources/MailingRequest.xsd`.

- [ ] **Step 5: Commit**

```bash
git add docs/internal/bpost-guide/schemas/mailing-request.md
git commit -m "docs: replace inline MailingRequest.xsd embed with XML Validation routing section"
```

---

## Task 4: Strip mailing-response.md and add routing section

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/mailing-response.md`

- [ ] **Step 1: Find where the XSD section starts**

Read `docs/internal/bpost-guide/schemas/mailing-response.md` from the end — find the `## XML Schema (XSD)` heading and the `---` immediately before it.

- [ ] **Step 2: Remove the XSD section**

Delete from the `---` preceding `## XML Schema (XSD)` to the end of the file.

- [ ] **Step 3: Append the replacement section**

```markdown

---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [MailingResponse.xsd](../resources/MailingResponse.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
```

- [ ] **Step 4: Verify**

Read the last 15 lines. Confirm no `xs:` content remains and the link points to `../resources/MailingResponse.xsd`.

- [ ] **Step 5: Commit**

```bash
git add docs/internal/bpost-guide/schemas/mailing-response.md
git commit -m "docs: replace inline MailingResponse.xsd embed with XML Validation routing section"
```

---

## Task 5: Add two-flow orientation note to index.md

**Files:**
- Modify: `docs/internal/bpost-guide/index.md`

- [ ] **Step 1: Read the Navigation section**

Read `docs/internal/bpost-guide/index.md`. Find the `## Navigation — Find the Right File for Your Task` heading. The orientation note goes immediately after this heading, before the first `###` subsection.

- [ ] **Step 2: Insert the orientation note**

Insert this blockquote immediately after the `## Navigation — Find the Right File for Your Task` heading line (and its following blank line):

```markdown
> **Two flows:** For field specs, Zod schemas, and chatbot help — use the `schemas/` files below. For formal XML validation — go to [`resources/index.md`](resources/index.md).
```

Leave the existing `### Building Zod Schemas / Validating File Structure` subsection and all other subsections unchanged.

- [ ] **Step 3: Verify**

Read lines around the Navigation heading. Confirm:
- The blockquote appears after `## Navigation — Find the Right File for Your Task`
- The first `###` subsection follows after the blockquote
- No other content was changed

- [ ] **Step 4: Commit**

```bash
git add docs/internal/bpost-guide/index.md
git commit -m "docs: add two-flow orientation note to index.md navigation"
```

---

## Task 6: Fix stale sentence in resources/index.md

**Files:**
- Modify: `docs/internal/bpost-guide/resources/index.md`

- [ ] **Step 1: Read the XSD section**

Read `docs/internal/bpost-guide/resources/index.md`. Find the `## XML Schema Definitions (XSD)` section. The current description paragraph reads:

> "These are the formal XML schemas for validating bpost request/response files. They are also embedded inline in the corresponding schema docs for agent convenience."

- [ ] **Step 2: Replace the stale paragraph**

Replace the entire two-sentence paragraph with:

```
These are the formal XML schemas for validating bpost request/response files. Use these when you need formal XML validation or precise type constraints. For field descriptions, Zod schemas, and chatbot help, use the corresponding `schemas/*.md` docs instead.
```

- [ ] **Step 3: Verify**

Read the XSD section back. Confirm:
- The phrase "embedded inline" no longer appears
- The new paragraph contains the routing guidance to `schemas/*.md`
- The table of 5 XSD files below is unchanged

- [ ] **Step 4: Commit**

```bash
git add docs/internal/bpost-guide/resources/index.md
git commit -m "docs: fix stale embedded-inline reference in resources/index.md XSD section"
```
