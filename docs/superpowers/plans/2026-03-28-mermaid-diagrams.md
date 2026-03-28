# Mermaid Diagrams for bpost Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mermaid diagram alternatives for all technical figures in the bpost Mail-ID Data Exchange Technical Guide, embedded inline in the relevant flow documentation files.

**Architecture:** Each of the 5 tasks targets one markdown file in `docs/internal/bpost-guide/flows/`. For each figure, read the corresponding PDF page image from `docs/external/pdf-pages/page-NNN.jpg`, create a Mermaid block, and insert it directly below the section heading that describes that scenario. ASCII arrow blocks stay in place (phase 2 will remove them after verification). Every diagram is preceded by a source citation comment with the PDF page and figure number.

**Tech Stack:** Mermaid (`sequenceDiagram`, `flowchart TD`, `graph LR`), Markdown

---

## Mermaid Type Conventions

| Figure type | Mermaid type |
|---|---|
| Step-by-step file exchange between Customer and bpost | `sequenceDiagram` |
| High-level product/system flow schema | `flowchart TD` |
| Deposit ↔ Mailing relationship/rules | `graph LR` |

## Source Citation Format

Place this comment directly above every Mermaid block:

```markdown
> **Source:** PDF page NNN — Figure N: [Figure title]
```

## Phase 2 (later — not part of this plan)

After all tasks are complete and diagrams have been visually verified:
- Remove ASCII arrow blocks (the ` ``` ` code blocks with `1. Customer --> bpost: ...` style)
- Evaluate whether any file has grown unwieldy → if so, extract sequence diagrams to a `diagrams/` subfolder (scenario C from the design)

---

## Task 1: Overview flow diagrams → `flows/request-ack-response.md`

**Figures:** 2 (page 8), 3 (page 17–18)
**Files:**
- Modify: `docs/internal/bpost-guide/flows/request-ack-response.md`
- Read: `docs/external/pdf-pages/page-008.jpg`, `page-017.jpg`, `page-018.jpg`

- [ ] **Step 1: Read the target file and the PDF pages**

  Read `flows/request-ack-response.md` to understand the current structure.
  Read `page-008.jpg` (Figure 2: Steps of the overall process) and `page-017.jpg` + `page-018.jpg` (Figure 3: Generic File Flow).

- [ ] **Step 2: Add Figure 2 — Steps of the overall process**

  Find the section that describes the overall process steps. Insert below it:

  ```markdown
  > **Source:** PDF page 8 — Figure 2: Steps of the overall process

  ```mermaid
  flowchart TD
      A([Customer sends Request File]) --> B([bpost generates Acknowledgement File])
      B --> C([bpost processes Request File])
      C --> D([bpost generates Response File])
      D --> E([Customer downloads Response File])
  ```
  ```

- [ ] **Step 3: Add Figure 3 — Generic File Flow**

  Find the section describing the Request → Acknowledgement → Response pattern. Insert below it:

  ```markdown
  > **Source:** PDF page 17 — Figure 3: Generic File Flow (Request, Acknowledgement, Response)

  ```mermaid
  sequenceDiagram
      participant C as Customer System
      participant B as bpost
      C->>B: Request File
      B-->>C: Acknowledgement File
      Note over B: bpost processes the request
      B-->>C: Response File
  ```
  ```

- [ ] **Step 4: Verify Mermaid syntax**

  Check that each block opens with ` ```mermaid ` and closes with ` ``` `, and that participant/node names have no special characters that break parsing. Read the file back to confirm structure is correct.

- [ ] **Step 5: Commit**

  ```bash
  git add docs/internal/bpost-guide/flows/request-ack-response.md
  git commit -m "docs: add mermaid diagrams for figures 2 and 3 (overview flow)"
  ```

---

## Task 2: Deposit sequence diagrams → `flows/deposit-flows.md`

**Figures:** 15–21 (pages 53–58)
**Files:**
- Modify: `docs/internal/bpost-guide/flows/deposit-flows.md`
- Read: `docs/external/pdf-pages/page-053.jpg` through `page-058.jpg`

- [ ] **Step 1: Read the target file and the PDF pages**

  Read `flows/deposit-flows.md` in full. Read pages 053–058 to confirm the exact steps shown in each figure.

- [ ] **Step 2: Add Figure 15 — Deposit (Auto Validate = N)**

  Find "Scenario 1: Deposit (Auto Validate = N)". Insert above the existing ASCII block:

  ```markdown
  > **Source:** PDF page 53 — Figure 15: Deposit (Auto Validate = N)

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=N)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (price)
      C->>B: 4. DepositValidate
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Deposit Response (authorization)
  ```
  ```

- [ ] **Step 3: Add Figure 16 — Deposit (Auto Validate = Y)**

  Find "Scenario 2: Deposit (Auto Validate = Y)". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 54 — Figure 16: Deposit (Auto Validate = Y)

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=Y)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (price + authorization)
  ```
  ```

- [ ] **Step 4: Add Figure 17 — Deposit with Update**

  Find "Scenario 3: Deposit with Update". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 55 — Figure 17: Deposit with Update

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=N)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (price)
      C->>B: 4. DepositUpdate
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Deposit Response (updated price)
      C->>B: 7. DepositValidate
      B-->>C: 8. Acknowledgement
      B-->>C: 9. Deposit Response (authorization)
  ```
  ```

- [ ] **Step 5: Add Figure 18 — Deposit Delete**

  Find "Scenario 4: Deposit Delete". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 55 — Figure 18: Deposit Delete

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=N)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (price)
      C->>B: 4. DepositDelete
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Deposit Response (delete confirmation)
  ```
  ```

- [ ] **Step 6: Add Figure 19 — Deposit with multiple mailing files**

  Find "Scenario 5: Deposit with Multiple Mailing Files". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 56 — Figure 19: Deposit with multiple mailing files

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=N)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (no price yet)
      C->>B: 4. MailingCreate M1
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Mailing Response (address feedback)
      C->>B: 7. MailingCreate M2
      B-->>C: 8. Acknowledgement
      B-->>C: 9. Mailing Response (address feedback)
      B-->>C: 10. Deposit Response (price — address count met)
      C->>B: 11. DepositValidate
      B-->>C: 12. Acknowledgement
      B-->>C: 13. Deposit Response (authorization)
  ```
  ```

- [ ] **Step 7: Add Figure 20 — Deposit Delete with multiple mailing files**

  Find "Scenario 6: Deposit Delete with Multiple Mailing Files". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 57 — Figure 20: Deposit Delete with multiple mailing files

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=N)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (no price yet)
      C->>B: 4. MailingCreate M1
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Mailing Response
      C->>B: 7. MailingCreate M2
      B-->>C: 8. Acknowledgement
      B-->>C: 9. Mailing Response
      B-->>C: 10. Deposit Response (price)
      C->>B: 11. DepositDelete
      B-->>C: 12. Acknowledgement
      B-->>C: 13. Deposit Response (delete confirmation)
      B-->>C: 14. Mailing Response (M1 deleted — cascade)
      B-->>C: 15. Mailing Response (M2 deleted — cascade)
  ```
  ```

- [ ] **Step 8: Add Figure 21 — Deposit Create with Mailing Delete (mailing file master)**

  Find the "Mailing File Master Scenario" section (Figure 26 reference in current doc). Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 58 — Figure 21: Deposit Response (mailing file master scenario)

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. MailingCreate
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Mailing Response
      C->>B: 4. DepositCreate D1 (autoValidate=N)
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Deposit Response (price)
      C->>B: 7. DepositCreate D2 (autoValidate=N)
      B-->>C: 8. Acknowledgement
      B-->>C: 9. Deposit Response (price)
      C->>B: 10. DepositDelete D1
      B-->>C: 11. Acknowledgement
      B-->>C: 12. Deposit Response (delete confirmation)
      C->>B: 13. MailingDelete
      B-->>C: 14. Acknowledgement
      B-->>C: 15. Mailing Response (delete confirmation)
      B-->>C: 16. Deposit Response (D2 deleted — cascade)
  ```
  ```

  > **Note:** Read `page-058.jpg` to `page-063.jpg` carefully — Figure 21 may span or the figure numbers may shift slightly from the index. Adjust step numbers and diagram content to match what the PDF actually shows.

- [ ] **Step 9: Verify Mermaid syntax throughout the file**

  Read the file back and confirm all 7 Mermaid blocks are syntactically valid (no unmatched quotes, correct participant names, step numbers sequential).

- [ ] **Step 10: Commit**

  ```bash
  git add docs/internal/bpost-guide/flows/deposit-flows.md
  git commit -m "docs: add mermaid sequence diagrams for figures 15-21 (deposit flows)"
  ```

---

## Task 3: MAIL ID flow diagrams → `flows/mail-id-flows.md`

**Figures:** 6 (page 33), 7–8 (page 35–36), 9–10 (page 36–37), 22–26 (pages 59–63)
**Files:**
- Modify: `docs/internal/bpost-guide/flows/mail-id-flows.md`
- Read: `docs/external/pdf-pages/page-033.jpg`, `page-035.jpg`, `page-036.jpg`, `page-037.jpg`, `page-059.jpg` through `page-063.jpg`

- [ ] **Step 1: Read the target file and all relevant PDF pages**

  Read `flows/mail-id-flows.md` in full. Read all listed pages to understand exact diagram content.

- [ ] **Step 2: Add Figure 6 — MAIL ID Flows Schema**

  Find the "Process Overview (Figure 6)" section. Insert below the heading:

  ```markdown
  > **Source:** PDF page 33 — Figure 6: MAIL ID Flows Schema

  ```mermaid
  flowchart TD
      CS[Customer System]
      MID[MAIL ID System]
      SC[Sorting Center]

      CS -->|"① Deposit Data Flow\n(mailing file with barcodes + addresses)"| MID
      CS -->|"② Print barcodes on mail pieces"| MAIL[Physical Mail Pieces]
      MAIL -->|"③ Mailing Flow"| SC
      MID -.->|"sorting data lookup"| SC
  ```
  ```

- [ ] **Step 3: Add Figure 7 — Master–Slave Relationship**

  Find the "Master/Slave Relationship (Figure 7)" section. Insert below it:

  ```markdown
  > **Source:** PDF page 35 — Figure 7: Master–Slave Relationship

  ```mermaid
  graph LR
      subgraph "Deposit is master"
          D1[Deposit D1] --> M1[Mailing M1]
          D1 --> M2[Mailing M2]
          D1 --> M3[Mailing M3]
      end
      subgraph "Mailing is master"
          M4[Mailing M1] --> D2[Deposit D1]
          M4 --> D3[Deposit D2]
      end
  ```
  ```

- [ ] **Step 4: Add Figure 8 — Master–Slave Rules**

  Find the "Master/Slave Rules (Figure 8)" section. Insert below it:

  ```markdown
  > **Source:** PDF page 35 — Figure 8: Master–Slave Rules

  ```mermaid
  graph LR
      subgraph "VALID — Deposit D1 is master"
          D1[Deposit D1] --> MA1[Mailing M1]
          D1 --> MA3[Mailing M3]
      end
      subgraph "INVALID — D1 cannot also be a slave"
          MA2[Mailing M2] -. "✗ not allowed" .-> D1
      end
  ```
  ```

- [ ] **Step 5: Add Figure 9 — Deposit is Master flow**

  Find "Flow: Deposit is Master (Figure 9)". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 36 — Figure 9: Deposit master flow

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. DepositCreate (autoValidate=N)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Deposit Response (no price yet)
      C->>B: 4. MailingCreate (depositRef → deposit)
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Mailing Response (address feedback)
      B-->>C: 7. Deposit Response (price)
      C->>B: 8. DepositValidate
      B-->>C: 9. Acknowledgement
      B-->>C: 10. Deposit Response (authorization)
  ```
  ```

- [ ] **Step 6: Add Figure 10 — Mailing File is Master flow**

  Find "Flow: Mailing File is Master (Figure 10)". Insert above the ASCII block:

  ```markdown
  > **Source:** PDF page 37 — Figure 10: Mailing file master flow

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. MailingCreate (mailingRef set, depositRef empty)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Mailing Response (address feedback)
      C->>B: 4. DepositCreate (autoValidate=N, mailingRef → mailing)
      B-->>C: 5. Acknowledgement
      B-->>C: 6. Deposit Response (price)
      C->>B: 7. DepositValidate
      B-->>C: 8. Acknowledgement
      B-->>C: 9. Deposit Response (authorization)
  ```
  ```

- [ ] **Step 7: Read pages 59–63 and add Figures 22–26**

  Read `page-059.jpg` through `page-063.jpg` to confirm each figure's exact steps. Then add diagrams for:

  - **Figure 22:** Mailing file, one deposit (Auto Validate = N) — `sequenceDiagram`
  - **Figure 23:** Mailing file, one deposit (Auto Validate = Y) — `sequenceDiagram`
  - **Figure 24:** Mailing file, multiple deposits (Auto Validate = N) — `sequenceDiagram`
  - **Figure 25:** Mailing file, multiple deposits (Auto Validate = Y) — `sequenceDiagram`
  - **Figure 26:** Mailing file Delete — `sequenceDiagram`

  Each with the format:
  ```markdown
  > **Source:** PDF page NNN — Figure NN: [title]

  ```mermaid
  sequenceDiagram
      ...
  ```
  ```

  Place each diagram immediately above the corresponding ASCII block in the file. If a scenario does not yet exist as prose in the file, add a new section heading for it.

- [ ] **Step 8: Verify Mermaid syntax throughout the file**

  Read the file back. Confirm all blocks are syntactically valid. Mermaid `graph LR` subgraph names must not contain special characters.

- [ ] **Step 9: Commit**

  ```bash
  git add docs/internal/bpost-guide/flows/mail-id-flows.md
  git commit -m "docs: add mermaid diagrams for figures 6-10 and 22-26 (mail-id flows)"
  ```

---

## Task 4: OptiAddress flow diagrams → `flows/optiaddress-flows.md`

**Figures:** 14 (page 51), 27 (page 64)
**Files:**
- Modify: `docs/internal/bpost-guide/flows/optiaddress-flows.md`
- Read: `docs/external/pdf-pages/page-051.jpg`, `page-064.jpg`

- [ ] **Step 1: Read the target file and PDF pages**

  Read `flows/optiaddress-flows.md` in full. Read `page-051.jpg` (Figure 14: OptiAddress Flows Schema) and `page-064.jpg` (Figure 27: Mailing Check).

- [ ] **Step 2: Add Figure 14 — OptiAddress Flows Schema**

  Find the introduction/overview section. Insert:

  ```markdown
  > **Source:** PDF page 51 — Figure 14: OptiAddress Flows Schema

  ```mermaid
  flowchart TD
      C[Customer System] -->|MailingRequest\n(MailingCheck action)| B[bpost]
      B -->|Acknowledgement| C
      B -->|MailingResponse\n(address corrections + feedback)| C
  ```
  ```

- [ ] **Step 3: Add Figure 27 — Mailing Check sequence**

  Find the section describing the MailingCheck flow. Insert above any existing ASCII block:

  ```markdown
  > **Source:** PDF page 64 — Figure 27: Mailing Check

  ```mermaid
  sequenceDiagram
      participant C as Customer
      participant B as bpost
      C->>B: 1. MailingRequest (MailingCheck action)
      B-->>C: 2. Acknowledgement
      B-->>C: 3. Mailing Response (address validation results)
  ```
  ```

- [ ] **Step 4: Verify and commit**

  ```bash
  git add docs/internal/bpost-guide/flows/optiaddress-flows.md
  git commit -m "docs: add mermaid diagrams for figures 14 and 27 (optiaddress flows)"
  ```

---

## Task 5: Round & Sequence flow diagram → `flows/round-and-sequence-flows.md`

**Figures:** 11 (page 40)
**Files:**
- Modify: `docs/internal/bpost-guide/flows/round-and-sequence-flows.md`
- Read: `docs/external/pdf-pages/page-040.jpg`, `page-041.jpg`

- [ ] **Step 1: Read the target file and PDF pages**

  Read `flows/round-and-sequence-flows.md` in full. Read `page-040.jpg` and `page-041.jpg` (Figure 11: Round & Sequence Flows Schema).

- [ ] **Step 2: Add Figure 11 — Round & Sequence Flows Schema**

  Find the overview/introduction section. Insert:

  ```markdown
  > **Source:** PDF page 40 — Figure 11: Round & Sequence Flows Schema

  ```mermaid
  flowchart TD
      C[Customer System]
      B[bpost]

      C -->|"DepositRequest\n(DepositCreate)"| B
      B -->|"Acknowledgement"| C
      B -->|"DepositResponse\n(price quote)"| C
      C -->|"MailingRequest\n(MailingCreate with addresses)"| B
      B -->|"Acknowledgement"| C
      B -->|"MailingResponse\n(sequence references)"| C
      C -->|"DepositRequest\n(DepositValidate)"| B
      B -->|"DepositResponse\n(authorization)"| C
      C -->|"Pre-sort physical mail\nusing sequence references"| SC[Sorting Center]
  ```
  ```

  > **Note:** Read `page-040.jpg` carefully — the Round & Sequence schema may show a slightly different flow. Adjust nodes to match the actual figure.

- [ ] **Step 3: Verify and commit**

  ```bash
  git add docs/internal/bpost-guide/flows/round-and-sequence-flows.md
  git commit -m "docs: add mermaid diagram for figure 11 (round and sequence flow)"
  ```

---

## Phase 2 Review Checkpoint (after all 5 tasks)

After Tasks 1–5 are complete:

- [ ] **Read all 5 modified files** and assess file size / readability
- [ ] **Check for bloated files:** if any flow file now exceeds ~200 lines, evaluate moving sequence diagrams to `docs/internal/bpost-guide/diagrams/` (one file per flow category) with links back from the flow docs
- [ ] **Verify rendering:** if a Markdown preview tool is available, confirm all Mermaid blocks render without errors
- [ ] **Remove ASCII blocks (phase 2):** for each file, delete the ` ```...``` ` ASCII arrow blocks that are now superseded by Mermaid diagrams
- [ ] **Commit phase 2 cleanup:**

  ```bash
  git add docs/internal/bpost-guide/flows/
  git commit -m "docs: remove ascii arrow blocks superseded by mermaid diagrams"
  ```
