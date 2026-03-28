# Design: XSD Flow Split — Remove Inline Embeds, Add Explicit Routing

**Date:** 2026-03-28
**Status:** Approved

---

## Problem

The 4 large XSD files were embedded inline in their corresponding schema docs as part of the previous resource-embedding task. This creates token-heavy docs unsuitable for agent consumption:

| Doc | Lines before | Lines after embed | XSD lines added |
|-----|-------------|-------------------|-----------------|
| `schemas/deposit-request.md` | ~300 | 1,756 | 1,455 |
| `schemas/deposit-response.md` | ~300 | ~1,100 | 797 |
| `schemas/mailing-request.md` | ~300 | ~944 | 644 |
| `schemas/mailing-response.md` | ~300 | ~1,073 | 773 |
| **Total XSD lines embedded** | | | **3,669** |

`RequestAck.xsd` (38 lines) is trivial and stays inline.

The existing markdown field tables already cover what agents need for Zod schema building and user-facing help. The raw XSD adds value only for XML validation use cases.

---

## Decision: Approach B — Explicit Flow Split

### Two flows

| Flow | Entry point | Use case |
|------|-------------|----------|
| **Text flow** | `schemas/*.md` | Zod schema building, chatbot help, field lookup |
| **XML flow** | `resources/*.xsd` via `resources/index.md` | Formal XML validation, strict type constraints |

### Changes

#### 1. Strip XSD embeds from 4 large schema docs

Remove the `## XML Schema (XSD)` sections (the full embedded code blocks) from:
- `schemas/deposit-request.md`
- `schemas/deposit-response.md`
- `schemas/mailing-request.md`
- `schemas/mailing-response.md`

Keep the `## XML Schema (XSD)` section in `schemas/deposit-acknowledgement.md` — `RequestAck.xsd` is only 38 lines and poses no token cost.

Keep the link-only section in `schemas/mailing-acknowledgement.md` unchanged.

#### 2. Replace each removed embed with a short `## XML Validation` section

In place of the removed `## XML Schema (XSD)` section in each of the 4 schema docs, add this compact routing section. Use the file-specific link for each doc:

| Doc | Link line |
|-----|-----------|
| `schemas/deposit-request.md` | `[DepositRequest.xsd](../resources/DepositRequest.xsd)` |
| `schemas/deposit-response.md` | `[DepositResponse.xsd](../resources/DepositResponse.xsd)` |
| `schemas/mailing-request.md` | `[MailingRequest.xsd](../resources/MailingRequest.xsd)` |
| `schemas/mailing-response.md` | `[MailingResponse.xsd](../resources/MailingResponse.xsd)` |

Template (substitute the correct filename and link):

```markdown
---

## XML Validation

For formal XML validation, use the XSD schema directly:

**Download:** [DepositRequest.xsd](../resources/DepositRequest.xsd)

The XSD defines precise type constraints, fixed values, and cardinality rules. All field descriptions and Zod-relevant specs are in the tables above.
```

#### 3. Update `index.md` navigation

Keep the existing `### Downloadable Resources` heading unchanged (it correctly covers XSD schemas, AFT templates, and the status codes spreadsheet — not XSD only).

Add a two-flow orientation note as the first line inside the `## Navigation — Find the Right File for Your Task` section, before the first `###` subsection:

```markdown
> **Two flows:** For field specs, Zod schemas, and chatbot help — use the `schemas/` files below. For formal XML validation — go to [`resources/index.md`](resources/index.md).
```

#### 4. Update `resources/index.md`

In the `## XML Schema Definitions (XSD)` section, the current description reads:
> "They are also embedded inline in the corresponding schema docs for agent convenience."

This is now stale — the embeds are being removed. Replace that sentence. The full updated paragraph should read:

```markdown
These are the formal XML schemas for validating bpost request/response files. Use these when you need formal XML validation or precise type constraints. For field descriptions, Zod schemas, and chatbot help, use the corresponding `schemas/*.md` docs instead.
```

---

## Out of scope

- Modifying the XSD files themselves
- Changing `transport/compression-and-encoding.md` (already has XSD links)
- Changing `schemas/deposit-acknowledgement.md` or `schemas/mailing-acknowledgement.md`
- Any changes outside `docs/internal/bpost-guide/`
