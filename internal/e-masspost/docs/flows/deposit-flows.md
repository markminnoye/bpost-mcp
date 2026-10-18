> **When to use this file:** When you need to understand the step-by-step sequence of deposit announcement scenarios -- creating, validating, updating, or deleting deposits, with or without multiple mailing files.

# Deposit Flows

## Overview

A deposit is an announcement of a physical mail delivery to bpost. Deposits can be created electronically via:

- **Webform**: Using the e-MassPost deposit announcement module (not covered in this technical guide)
- **Structured file**: Using the file exchange process described in this guide

This document covers the structured file approach. The deposit product is available for most MassPost products (Mail ID, Round & Sequence, and non-Mail ID products).

## Deposit Actions

| Action | Purpose |
|--------|---------|
| **DepositCreate** | Announce a new deposit |
| **DepositUpdate** | Modify an existing deposit (replaces all DepositCreate tags with DepositUpdate tags) |
| **DepositDelete** | Cancel a previously created deposit |
| **DepositValidate** | Confirm the deposit and receive authorization |

**Key rules:**
- Multiple actions (DepositCreate, DepositUpdate, DepositDelete, DepositValidate) can be combined in the same Deposit Request File.
- Each DepositCreate must be followed by a DepositValidate, unless the customer uses `autoValidate="Y"` in the DepositCreate action.
- After DepositValidate completes, a deposit authorization (PDF format) is provided. This must be presented at the MassPost dock when delivering the physical deposit.

See [../schemas/deposit-request.md](../schemas/deposit-request.md) for field-level details.

---

## Deposit-Only Scenarios

### Scenario 1: Deposit (Auto Validate = N)

A simple deposit announcement without autovalidation. The customer must explicitly validate after reviewing the price quote.

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

The customer sends two separate Deposit Request Files: one with a DepositCreate action, and a second with a DepositValidate action.

### Scenario 2: Deposit (Auto Validate = Y)

A single-step deposit where creation and validation happen automatically.

> **Source:** PDF page 54 — Figure 16: Deposit (Auto Validate = Y)

```mermaid
sequenceDiagram
    participant C as Customer
    participant B as bpost
    C->>B: 1. DepositCreate (autoValidate=Y)
    B-->>C: 2. Acknowledgement
    B-->>C: 3. Deposit Response (price + authorization)
```

The customer only needs to send one file. The response includes both the price and the authorization.

### Scenario 3: Deposit with Update

The customer creates a deposit, then modifies it (e.g., the number of mail pieces changed) before validating.

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

The customer sends three Deposit Request Files: one with DepositCreate, one with DepositUpdate, and one with DepositValidate.

### Scenario 4: Deposit Delete

The customer creates a deposit but later decides to cancel it (e.g., the marketing campaign was cancelled).

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

The customer sends two Deposit Request Files: one with DepositCreate and one with DepositDelete.

---

## Deposit Master Scenarios (with Multiple Mailing Files)

In these scenarios the deposit is the master and mailing files are linked to it. All deposit and mailing list requests can be uploaded via eMassPost application or via FTP.

### Scenario 5: Deposit with Multiple Mailing Files

The customer has a large campaign with addresses split across multiple mailing lists (e.g., 50,000 existing prospects + additional addresses from a market research bureau).

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

**Key behavior:** The Deposit Response with price (step 10) is only sent once the total number of addresses in all linked mailing files meets or exceeds the number of announced mail pieces in the deposit. Before that, no price can be calculated.

### Scenario 6: Deposit Delete with Multiple Mailing Files

Same as Scenario 5 but the customer decides to cancel. Since the deposit is master, deleting it cascades to all linked mailing files.

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
    B-->>C: 6. Mailing Response (address feedback)
    C->>B: 7. MailingCreate M2
    B-->>C: 8. Acknowledgement
    B-->>C: 9. Mailing Response (address feedback)
    B-->>C: 10. Deposit Response (price)
    C->>B: 11. DepositDelete
    B-->>C: 12. Acknowledgement
    B-->>C: 13. Deposit Response (delete confirmation)
    B-->>C: 14. Mailing Response (M1 deleted — cascade)
    B-->>C: 15. Mailing Response (M2 deleted — cascade)
```

**Key behavior:** Deleting the master (deposit) automatically deletes all its children (mailing files). bpost generates additional Mailing Response files confirming the deletion of each linked mailing.

### Scenario 7: Deposit Create with Mailing Delete

The customer creates a deposit with multiple mailings, then deletes one mailing and adds new ones. Demonstrates how price recalculation works.

> **Source:** PDF page 58 — Figure 21: Deposit Response

```mermaid
sequenceDiagram
    participant C as Customer
    participant B as bpost
    C->>B: 1. DepositCreate D1 (announce=100,000)
    B-->>C: 2. Deposit Response (no price)
    C->>B: 3. MailingCreate M1 (depositRef=D1, 50,000 addresses)
    B-->>C: 4. Mailing Response (address feedback)
    C->>B: 5. MailingCreate M2 (depositRef=D1, 70,000 addresses)
    B-->>C: 6. Mailing Response (address feedback)
    B-->>C: 7. Deposit Response (price — 50,000+70,000 >= 100,000)
    C->>B: 8. MailingDelete M2
    B-->>C: 9. Mailing Response (M2 deleted)
    B-->>C: 10. Deposit Response (no price — 50,000 < 100,000 again)
    C->>B: 11. MailingCreate M3 (depositRef=D1, 20,000 addresses)
    B-->>C: 12. Mailing Response (address feedback)
    C->>B: 13. MailingCreate M4 (depositRef=D1, 30,000 addresses)
    B-->>C: 14. Mailing Response (address feedback)
    B-->>C: 15. Deposit Response (price — 50,000+20,000+30,000 >= 100,000)
    C->>B: 16. DepositValidate D1
    B-->>C: 17. Deposit Response (authorization)
```

**Key behavior:** Every time an action impacts the total address count relative to the announced mail pieces, bpost recalculates and sends (or withdraws) the price. A previously communicated price becomes invalid when the address total drops below the announced count.

---

## Mailing File Master Scenario: Deposit Create with Mailing Delete (Figure 26)

When the Mailing Request file is master (one mailing, multiple deposits), the flow reverses. The mailing is created first, then deposits reference it.

> See [mail-id-flows.md — Figure 26: Mailing file Delete](mail-id-flows.md#scenario-mailing-file-delete-figure-26) for the full sequence diagram of this scenario.

**Key behavior:** Deleting the master (mailing) cascades to its children (deposits). The customer can also delete individual deposits without affecting the mailing.

## Price Calculation Rules

Anytime an action influences the price, bpost sends a Deposit Response with the calculated price. Actions that trigger recalculation include:
- Changing deposit characteristics
- Updating the announced number of mail pieces
- Creating or deleting a linked mailing file (changes total address count)
