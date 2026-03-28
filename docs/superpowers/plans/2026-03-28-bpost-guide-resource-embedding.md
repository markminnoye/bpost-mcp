# bpost-guide Resource Embedding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed XSD schema files inline in the corresponding bpost-guide schema docs, and add download links for binary resource files — making the docs fully self-contained for AI agents and human readers.

**Architecture:** Each XSD file (text-based XML) is embedded as an `xml` code block at the bottom of its corresponding schema markdown doc under `## XML Schema (XSD)`. Binary files (XLS/CSV) are linked via relative markdown links under `## Downloads`. A new `resources/index.md` serves as a central directory of all downloadable files.

**Tech Stack:** Pure markdown editing — no code, no tests, no build steps. All files are in `docs/internal/bpost-guide/`.

---

## File Map

**Create:**
- `docs/internal/bpost-guide/resources/index.md` — central resource directory

**Modify (add XSD embed):**
- `docs/internal/bpost-guide/schemas/deposit-request.md` — embed `DepositRequest.xsd`
- `docs/internal/bpost-guide/schemas/deposit-response.md` — embed `DepositResponse.xsd`
- `docs/internal/bpost-guide/schemas/mailing-request.md` — embed `MailingRequest.xsd`
- `docs/internal/bpost-guide/schemas/mailing-response.md` — embed `MailingResponse.xsd`
- `docs/internal/bpost-guide/schemas/deposit-acknowledgement.md` — embed `RequestAck.xsd`

**Modify (add link only):**
- `docs/internal/bpost-guide/schemas/mailing-acknowledgement.md` — link to `RequestAck.xsd` (same schema as deposit ack)
- `docs/internal/bpost-guide/schemas/address-file-tool.md` — link `template.xls`, `template.csv`, `Excel_voorbeeld.xls`
- `docs/internal/bpost-guide/errors/status-codes.md` — link `status_codes.xls`
- `docs/internal/bpost-guide/transport/compression-and-encoding.md` — link all 5 XSD files
- `docs/internal/bpost-guide/index.md` — add Resources row to navigation table

---

## Conventions

**Relative paths from `schemas/` to resources:** `../resources/FileName.xsd`
**Relative paths from `errors/` to resources:** `../resources/filename.xls`
**Relative paths from `transport/` to resources:** `../resources/FileName.xsd`
**Relative paths from `resources/index.md` to resources:** `./FileName.xsd`
**Relative paths from `index.md` to resources index:** `resources/index.md`

**XSD section template (append to bottom of schema doc):**
```markdown
---

## XML Schema (XSD)

Download: [FileName.xsd](../resources/FileName.xsd)

```xml
<paste full XSD file content here>
```
```

**Binary download section template:**
```markdown
---

## Downloads

| File | Description |
|------|-------------|
| [template.xls](../resources/template.xls) | Blank XLS template for Address File Tool uploads (Excel 97-2003) |
```

---

## Task 1: Create `resources/index.md`

**Files:**
- Create: `docs/internal/bpost-guide/resources/index.md`

- [ ] **Step 1: Create the file**

Create `docs/internal/bpost-guide/resources/index.md` with this exact content:

```markdown
> **When to use this file:** When you need to download or reference a schema file, template, or reference spreadsheet from the bpost Data Exchange system.

# bpost-guide Downloadable Resources

All resource files are located in `docs/internal/bpost-guide/resources/`.

## XML Schema Definitions (XSD)

These are the formal XML schemas for validating bpost request/response files. They are also embedded inline in the corresponding schema docs for agent convenience.

| File | Description | Referenced in |
|------|-------------|---------------|
| [DepositRequest.xsd](./DepositRequest.xsd) | Formal XML schema for DepositRequest files | [schemas/deposit-request.md](../schemas/deposit-request.md) |
| [DepositResponse.xsd](./DepositResponse.xsd) | Formal XML schema for DepositResponse files | [schemas/deposit-response.md](../schemas/deposit-response.md) |
| [MailingRequest.xsd](./MailingRequest.xsd) | Formal XML schema for MailingRequest files | [schemas/mailing-request.md](../schemas/mailing-request.md) |
| [MailingResponse.xsd](./MailingResponse.xsd) | Formal XML schema for MailingResponse files | [schemas/mailing-response.md](../schemas/mailing-response.md) |
| [RequestAck.xsd](./RequestAck.xsd) | Formal XML schema for Acknowledgement files (shared by Deposit and Mailing) | [schemas/deposit-acknowledgement.md](../schemas/deposit-acknowledgement.md), [schemas/mailing-acknowledgement.md](../schemas/mailing-acknowledgement.md) |

## Address File Tool Templates

These templates are used for uploading mailing lists via the Address File Tool on e-MassPost. See [schemas/address-file-tool.md](../schemas/address-file-tool.md) for full column documentation.

| File | Description |
|------|-------------|
| [template.xls](./template.xls) | Blank XLS template for Address File Tool uploads (Excel 97-2003, .xls) |
| [template.csv](./template.csv) | Blank CSV template for Address File Tool uploads |
| [Excel_voorbeeld.xls](./Excel_voorbeeld.xls) | Example filled Address File Tool file (voorbeeld = example in Dutch) |

## Reference Spreadsheets

| File | Description | Referenced in |
|------|-------------|---------------|
| [status_codes.xls](./status_codes.xls) | Source spreadsheet for all MID-xxxx and MPW-xxxx status/error codes | [errors/status-codes.md](../errors/status-codes.md) |
```

- [ ] **Step 2: Verify the file was created correctly**

Read `docs/internal/bpost-guide/resources/index.md` and confirm:
- The heading `# bpost-guide Downloadable Resources` is present
- The XSD table lists all 5 XSD files with correct `./FileName.xsd` links
- The AFT template table lists `template.xls`, `template.csv`, and `Excel_voorbeeld.xls`
- The reference spreadsheet table lists `status_codes.xls`
- All cross-links to schema docs (e.g. `../schemas/deposit-request.md`) use the correct relative path

- [ ] **Step 3: Commit**

```bash
git add docs/internal/bpost-guide/resources/index.md
git commit -m "docs: add resources/index.md — central directory of bpost downloadable files"
```

---

## Task 2: Update `index.md` navigation table

**Files:**
- Modify: `docs/internal/bpost-guide/index.md`

- [ ] **Step 1: Read `index.md`**

Read the full file and locate the "Navigation — Find the Right File for Your Task" section and its tables.

- [ ] **Step 2: Add Resources row**

Inside the existing `## Navigation — Find the Right File for Your Task` section, append a new `###` subsection immediately before the `## Source Document` heading. The new subsection uses heading level `###` (matching the other navigation subsections like `### Building Zod Schemas / Validating File Structure`):

```markdown
### Downloadable Resources
| File | Description |
|---|---|
| [resources/index.md](resources/index.md) | All downloadable files: XSD schemas, AFT templates, status code spreadsheet |
```

- [ ] **Step 3: Commit**

```bash
git add docs/internal/bpost-guide/index.md
git commit -m "docs: add Downloadable Resources section to bpost-guide index"
```

---

## Task 3: Embed DepositRequest.xsd and DepositResponse.xsd

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/deposit-request.md`
- Modify: `docs/internal/bpost-guide/schemas/deposit-response.md`
- Read: `docs/internal/bpost-guide/resources/DepositRequest.xsd`
- Read: `docs/internal/bpost-guide/resources/DepositResponse.xsd`

- [ ] **Step 1: Read both XSD files in full**

Read `docs/internal/bpost-guide/resources/DepositRequest.xsd` and `docs/internal/bpost-guide/resources/DepositResponse.xsd` completely.

- [ ] **Step 2: Append XSD section to `deposit-request.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/deposit-request.md`:

```markdown

---

## XML Schema (XSD)

Download: [DepositRequest.xsd](../resources/DepositRequest.xsd)

```xml
<full content of DepositRequest.xsd>
```
```

- [ ] **Step 3: Append XSD section to `deposit-response.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/deposit-response.md`:

```markdown

---

## XML Schema (XSD)

Download: [DepositResponse.xsd](../resources/DepositResponse.xsd)

```xml
<full content of DepositResponse.xsd>
```
```

- [ ] **Step 4: Commit**

```bash
git add docs/internal/bpost-guide/schemas/deposit-request.md docs/internal/bpost-guide/schemas/deposit-response.md
git commit -m "docs: embed DepositRequest.xsd and DepositResponse.xsd inline in schema docs"
```

---

## Task 4: Embed MailingRequest.xsd and MailingResponse.xsd

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/mailing-request.md`
- Modify: `docs/internal/bpost-guide/schemas/mailing-response.md`
- Read: `docs/internal/bpost-guide/resources/MailingRequest.xsd`
- Read: `docs/internal/bpost-guide/resources/MailingResponse.xsd`

- [ ] **Step 1: Read both XSD files in full**

Read `docs/internal/bpost-guide/resources/MailingRequest.xsd` and `docs/internal/bpost-guide/resources/MailingResponse.xsd` completely.

- [ ] **Step 2: Append XSD section to `mailing-request.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/mailing-request.md`:

```markdown

---

## XML Schema (XSD)

Download: [MailingRequest.xsd](../resources/MailingRequest.xsd)

```xml
<full content of MailingRequest.xsd>
```
```

- [ ] **Step 3: Append XSD section to `mailing-response.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/mailing-response.md`:

```markdown

---

## XML Schema (XSD)

Download: [MailingResponse.xsd](../resources/MailingResponse.xsd)

```xml
<full content of MailingResponse.xsd>
```
```

- [ ] **Step 4: Commit**

```bash
git add docs/internal/bpost-guide/schemas/mailing-request.md docs/internal/bpost-guide/schemas/mailing-response.md
git commit -m "docs: embed MailingRequest.xsd and MailingResponse.xsd inline in schema docs"
```

---

## Task 5: Handle RequestAck.xsd (embed in deposit-acknowledgement, link in mailing-acknowledgement)

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/deposit-acknowledgement.md`
- Modify: `docs/internal/bpost-guide/schemas/mailing-acknowledgement.md`
- Read: `docs/internal/bpost-guide/resources/RequestAck.xsd`

- [ ] **Step 1: Read `RequestAck.xsd` in full**

Read `docs/internal/bpost-guide/resources/RequestAck.xsd` completely.

- [ ] **Step 2: Append XSD section to `deposit-acknowledgement.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/deposit-acknowledgement.md`:

```markdown

---

## XML Schema (XSD)

The `RequestAck.xsd` schema is shared by both Deposit and Mailing acknowledgement files.

Download: [RequestAck.xsd](../resources/RequestAck.xsd)

```xml
<full content of RequestAck.xsd>
```
```

- [ ] **Step 3: Append link-only section to `mailing-acknowledgement.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/mailing-acknowledgement.md`:

```markdown

---

## XML Schema (XSD)

The `RequestAck.xsd` schema is shared by both Deposit and Mailing acknowledgement files. The full XSD is embedded in [deposit-acknowledgement.md](deposit-acknowledgement.md).

Download: [RequestAck.xsd](../resources/RequestAck.xsd)
```

- [ ] **Step 4: Commit**

```bash
git add docs/internal/bpost-guide/schemas/deposit-acknowledgement.md docs/internal/bpost-guide/schemas/mailing-acknowledgement.md
git commit -m "docs: embed RequestAck.xsd in deposit-acknowledgement, add link in mailing-acknowledgement"
```

---

## Task 6: Add download links to `address-file-tool.md` and `status-codes.md`

**Files:**
- Modify: `docs/internal/bpost-guide/schemas/address-file-tool.md`
- Modify: `docs/internal/bpost-guide/errors/status-codes.md`

- [ ] **Step 1: Read the end of `address-file-tool.md`**

Read the last 30 lines of `docs/internal/bpost-guide/schemas/address-file-tool.md` to find where to append.

- [ ] **Step 2: Append Downloads section to `address-file-tool.md`**

Append to the very end of `docs/internal/bpost-guide/schemas/address-file-tool.md`:

```markdown

---

## Downloads

These files are available in `docs/internal/bpost-guide/resources/`. Download from the **Support** tab in the Address File Tool on e-MassPost, or use these local copies.

| File | Description |
|------|-------------|
| [template.xls](../resources/template.xls) | Blank XLS template for Address File Tool uploads (Excel 97-2003, .xls format) |
| [template.csv](../resources/template.csv) | Blank CSV template for Address File Tool uploads |
| [Excel_voorbeeld.xls](../resources/Excel_voorbeeld.xls) | Example filled Address File Tool file (voorbeeld = example in Dutch) |
```

- [ ] **Step 3: Read the start of `status-codes.md`**

Read the first 5 lines of `docs/internal/bpost-guide/errors/status-codes.md` — it already says "This table was extracted from `status_codes.xls`." We just need to make that a link.

- [ ] **Step 4: Update the source citation in `status-codes.md`**

This is line 3 of the file (immediately after the `# Error and Status Codes` heading and a blank line). Replace:
```
This table was extracted from `status_codes.xls`.
```
With:
```
This table was extracted from [status_codes.xls](../resources/status_codes.xls).
```

- [ ] **Step 5: Commit**

```bash
git add docs/internal/bpost-guide/schemas/address-file-tool.md docs/internal/bpost-guide/errors/status-codes.md
git commit -m "docs: add download links for AFT templates and status_codes.xls source"
```

---

## Task 7: Add XSD links to `compression-and-encoding.md`

**Files:**
- Modify: `docs/internal/bpost-guide/transport/compression-and-encoding.md`

- [ ] **Step 1: Read `compression-and-encoding.md`**

Read the full file to find the XML Standards section (it mentions XSD validation).

- [ ] **Step 2: Append XSD Schemas section**

Append to the very end of `docs/internal/bpost-guide/transport/compression-and-encoding.md`:

```markdown

---

## XSD Schemas

bpost provides official XSD schemas for validating XML request and response files before submission. All schemas are in `docs/internal/bpost-guide/resources/`.

| Schema | Validates |
|--------|-----------|
| [DepositRequest.xsd](../resources/DepositRequest.xsd) | Deposit request files (`<DepositRequest>` root) |
| [DepositResponse.xsd](../resources/DepositResponse.xsd) | Deposit response files (`<DepositResponse>` root) |
| [MailingRequest.xsd](../resources/MailingRequest.xsd) | Mailing request files (`<MailingRequest>` root) |
| [MailingResponse.xsd](../resources/MailingResponse.xsd) | Mailing response files (`<MailingResponse>` root) |
| [RequestAck.xsd](../resources/RequestAck.xsd) | Acknowledgement files (`<RequestAck>` root, shared by Deposit and Mailing) |

The XSD content is also embedded inline in each corresponding schema doc — see `schemas/` for full documentation.
```

- [ ] **Step 3: Commit**

```bash
git add docs/internal/bpost-guide/transport/compression-and-encoding.md
git commit -m "docs: add XSD schemas reference section to compression-and-encoding"
```
