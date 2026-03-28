# BPost Mail ID — Data Exchange Technical Guide

> **When to use this file:** Start here. Every agent should read this index first to understand the bpost system and find the specific file(s) needed for their task.

## System Overview

bpost's **Mail ID** system enables bulk mailers to electronically exchange data with bpost for sorting and delivering mass mail. Customers submit **Request files** containing deposit announcements and/or mailing lists (with barcoded addresses). bpost processes them and returns **Response files** with validation results, price quotes, and sorting information.

The system supports four products:

| Product | Purpose |
|---|---|
| **Deposit** | Announce MassPost deposits electronically and receive deposit authorization. Works for Mail ID, Round & Sequence, and non-Mail ID products. |
| **Mail ID Deposit** | Each mail piece gets a unique barcode. Customer sends a mailing file with barcode IDs + delivery addresses before physical deposit. bpost can also generate the barcode IDs. |
| **Round & Sequence** | Like Mail ID but for Large format only. bpost returns sequence references in the response file so the customer can pre-sort envelopes. |
| **OptiAddress** | Address validation tool. Submit addresses for verification independently of any deposit. bpost returns corrections and feedback. |

## Core Concept: Request → Acknowledgement → Response

All data exchanges follow the same pattern:
1. **Customer sends a Request file** (deposit announcement, mailing list, or address check)
2. **bpost returns an Acknowledgement file** (confirms receipt — nothing about correctness)
3. **bpost returns a Response file** (validation results, errors, price quotes, sorting info)

Files can be **XML** (primary), **TXT** (pipe-delimited), or **XLS/XLSX** (mailing files only, via e-MassPost web tool).
Codepage: **ISO-8859-1** (Latin-1). Transfer: **HTTP(S)** or **FTP/FTPS** to `filetransfer.bpost.be`.

## Communication Modes

Files include a `mode` field: **P** (Production), **T** (Test), **C** (Certification).

## Navigation — Find the Right File for Your Task

> **Two flows:** For field specs, Zod schemas, and chatbot help — use the `schemas/` files below. For formal XML validation — go to [`resources/index.md`](resources/index.md).

### Building Zod Schemas / Validating File Structure
| File | Description |
|---|---|
| [schemas/file-naming.md](schemas/file-naming.md) | File naming convention: `AAA_VVVV_CCCCCCCC_NNNNNNNNNN_YYMMDDHHMMSS_SSS.XXX` |
| [schemas/deposit-request.md](schemas/deposit-request.md) | DepositRequest file: Context, Header, DepositCreate/Update/Delete/Validate tags with all fields |
| [schemas/deposit-acknowledgement.md](schemas/deposit-acknowledgement.md) | DepositAcknowledgement file structure |
| [schemas/deposit-response.md](schemas/deposit-response.md) | DepositResponse file: Context, Header, Action, Replies tags with all fields |
| [schemas/mailing-request.md](schemas/mailing-request.md) | MailingRequest file: Context, Header, MailingCreate/Check/Delete tags, address components |
| [schemas/address-file-tool.md](schemas/address-file-tool.md) | Address File Tool (AFT): simplified XLS/CSV upload via e-MassPost web instead of full XML/TXT MailingRequest |
| [schemas/mailing-acknowledgement.md](schemas/mailing-acknowledgement.md) | MailingAcknowledgement file structure |
| [schemas/mailing-response.md](schemas/mailing-response.md) | MailingResponse file: Context, Header, Action, Replies tags with all fields |
| [schemas/presorting-codes.md](schemas/presorting-codes.md) | PreSortingCodes file structure (XML + TXT) |

### Understanding Business Flows & Sequences
| File | Description |
|---|---|
| [flows/request-ack-response.md](flows/request-ack-response.md) | Generic file flow, file availability, high-level file structures |
| [flows/deposit-flows.md](flows/deposit-flows.md) | Deposit scenarios: create, update, delete, validate (with/without auto-validate) |
| [flows/mail-id-flows.md](flows/mail-id-flows.md) | Mail ID deposit: MID flow, master/slave relationships, linking mailing + deposit files |
| [flows/round-and-sequence-flows.md](flows/round-and-sequence-flows.md) | Round & Sequence deposit flow, sequence reference structure |
| [flows/optiaddress-flows.md](flows/optiaddress-flows.md) | OptiAddress validation flow (MailingCheck action) |

### Building HTTP/FTP Client Code
| File | Description |
|---|---|
| [transport/http-protocol.md](transport/http-protocol.md) | HTTP(S) transfer via e-MassPost website, SSL, ports 80/443 |
| [transport/ftp-protocol.md](transport/ftp-protocol.md) | FTP/FTPS config: host, ports, passive mode, folder management, .TMP extension |
| [transport/compression-and-encoding.md](transport/compression-and-encoding.md) | ZIP compression, XML encoding (ISO-8859-1), XSD validation |

### Handling Errors in Response Files
| File | Description |
|---|---|
| [errors/status-codes.md](errors/status-codes.md) | Status codes (100/998/999), message severity (FATAL/ERROR/WARN/INFO) |
| [errors/deposit-error-codes.md](errors/deposit-error-codes.md) | MPW-xxxx error codes for deposit operations |
| [errors/mailing-error-codes.md](errors/mailing-error-codes.md) | MID-xxxx and OA-xxxx error codes for mailing/address operations |

### Barcode Generation & Validation
| File | Description |
|---|---|
| [barcode/barcode-structure.md](barcode/barcode-structure.md) | Mail ID barcode: 7/9/11-digit mail number, structure breakdown |
| [barcode/barcode-printing.md](barcode/barcode-printing.md) | Printer constraints, barcode dimensions, placement on envelope |
| [barcode/code128-encoding.md](barcode/code128-encoding.md) | Code 128 encoding: checksum algorithm, full encoding table |

### Reference & Lookup Tables
| File | Description |
|---|---|
| [reference/addressing-rules.md](reference/addressing-rules.md) | Address component groups for Mail ID (street, city, postal code, etc.) |
| [reference/character-restrictions.md](reference/character-restrictions.md) | Supported and non-supported characters in file content |
| [reference/processing-times.md](reference/processing-times.md) | Expected processing times by volume (1k–600k addresses) |
| [reference/onboarding.md](reference/onboarding.md) | Getting started, certification process, contact info |

### Downloadable Resources

| File | Description |
|---|---|
| [resources/index.md](resources/index.md) | All downloadable files: XSD schemas, AFT templates, status code spreadsheet |

## Source Document

These files were extracted from: `docs/external/Mail-ID Data_Exchange_Technical_Guide.pdf` (203 pages, January 2023, updated October 2024). Page images available at `docs/external/pdf-pages/page-NNN.jpg`.
