# Design: bpost-guide Resource Embedding & Referencing

**Date:** 2026-03-28
**Status:** Approved
**Author:** Brainstorming session

---

## Context

The `docs/internal/bpost-guide/resources/` directory contains 9 files that were moved from `docs/external/`:

- **XSD schemas (text):** `DepositRequest.xsd`, `DepositResponse.xsd`, `MailingRequest.xsd`, `MailingResponse.xsd`, `RequestAck.xsd`
- **Binary files:** `template.xls`, `template.csv`, `Excel_voorbeeld.xls`, `status_codes.xls`

These files are not yet referenced or embedded in any documentation. The bpost-guide docs serve two purposes:
1. **MCP service construction** — agents read these docs to build Zod schemas, HTTP/FTP client code, etc.
2. **Help chatbot knowledge base** — agents use these docs to assist end users

---

## Decision: Approach B — Embed XSD inline + link binary files

### Rationale

- XSD files are text-based XML (1–5 KB each) — safe to embed inline
- Embedding makes schema docs self-contained: one file read gives both human description AND formal spec
- Binary XLS/CSV files can only be linked (not readable inline by agents)
- A central `resources/index.md` gives humans a directory of all downloadable files

---

## Changes Required

### 1. Embed XSD files inline

Add an `## XML Schema (XSD)` section at the bottom of each schema doc with:
- A relative file link for download
- The full XSD content as an `xml` code block

| XSD file | Primary doc | Secondary doc |
|---|---|---|
| `DepositRequest.xsd` | `schemas/deposit-request.md` | — |
| `DepositResponse.xsd` | `schemas/deposit-response.md` | — |
| `MailingRequest.xsd` | `schemas/mailing-request.md` | — |
| `MailingResponse.xsd` | `schemas/mailing-response.md` | — |
| `RequestAck.xsd` | `schemas/deposit-acknowledgement.md` (embed) | `schemas/mailing-acknowledgement.md` (link only) |

### 2. Add download links for binary files

Add a `## Downloads` section to relevant docs with relative links and one-line descriptions.

| File | Added to |
|---|---|
| `template.xls` | `schemas/address-file-tool.md` |
| `template.csv` | `schemas/address-file-tool.md` |
| `Excel_voorbeeld.xls` | `schemas/address-file-tool.md` |
| `status_codes.xls` | `errors/status-codes.md` |

### 3. Add XSD links to compression-and-encoding.md

`transport/compression-and-encoding.md` mentions XSD validation — add an `## XSD Schemas` section linking to all 5 XSD files in `resources/`.

### 4. Create `resources/index.md`

New file: `docs/internal/bpost-guide/resources/index.md`

A central directory listing all 9 resource files with: filename, type, description, and which doc references it.

### 5. Update `index.md`

Add a `### Downloadable Resources` subsection inside the existing `## Navigation — Find the Right File for Your Task` section, immediately before `## Source Document`. Use heading level `###` to match the other navigation subsections. Contains a single table row linking to `resources/index.md`.

---

## Section structure conventions

**XSD embed section (schema docs):**
```markdown
## XML Schema (XSD)

Download: [DepositRequest.xsd](../resources/DepositRequest.xsd)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- full XSD content -->
```
```

**Binary download section:**
```markdown
## Downloads

| File | Description |
|------|-------------|
| [template.xls](../resources/template.xls) | Blank XLS template for Address File Tool uploads |
```

---

## Out of scope

- Modifying the XSD files themselves
- Converting XLS content to markdown tables (status_codes.xls is already extracted in status-codes.md)
- Any changes outside `docs/internal/bpost-guide/`
