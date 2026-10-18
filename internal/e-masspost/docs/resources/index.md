> **When to use this file:** When you need to download or reference a schema file, template, or reference spreadsheet from the bpost Data Exchange system.

# bpost-guide Downloadable Resources

All resource files are located in `docs/internal/bpost-guide/resources/`.

## XML Schema Definitions (XSD)

These are the formal XML schemas for validating bpost request/response files. Use these when you need formal XML validation or precise type constraints. For field descriptions, Zod schemas, and chatbot help, use the corresponding `schemas/*.md` docs instead.

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
