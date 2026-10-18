> **When to use this file:** When building or validating file encoding, XML structure, TXT formatting, or compression for bpost file submissions.

# Compression and Encoding

## Supported File Formats

Three file formats are supported for data exchange:

| Format | Use Case |
|---|---|
| XML | Full-featured structured format (FTP and HTTP) |
| TXT | Pipe-delimited text format (FTP and HTTP) |
| XLS/XLSX/CSV | Mailing files only, not deposit files (HTTP only) |

## XML Standards

| Standard | Version |
|---|---|
| XML | 1.0 (Third Edition), W3C Recommendation 04 February 2004 |
| XML Schema | Part 1: Structures / Part 2: Datatypes (Second Edition), W3C Recommendation 28 October 2004 |
| XPath | Version 1.0, W3C Recommendation 16 November 1999 |

## Codepage

- **Codepage**: ISO-8859-1 (Latin-1)
- **XML header** (must be included): `<?xml version="1.0" encoding="ISO-8859-1"?>`

## XML Tag Notation Rules

### Tag Names (CamelCase)
- First letter of each word is uppercase, all other letters lowercase.
- Example: `SomeInterestingTag`

### Attribute Names (camelCase)
- First letter of the first word is lowercase, first letter of subsequent words is uppercase.
- Example: `someInterestingAttribute`

### Hierarchy
- Tags are sorted in mandatory and optional levels.
- All tags from a certain level belong to a certain tag from the previous level.
- All tags from the first level belong to the root tag.

### Obligation
- Mandatory tags must be present when their previous level tag is present.
- Optional tags may or may not be present.

### Table Notation
- Root tags have a simple name (e.g., `Book`)
- Child tags use compounded names with `/` separator (e.g., `Book/Chapter`, `Book/Chapter/Paragraph`)
- When a tag can occur more than once, the tag name is followed by `(#N)`
- The "Mandatory" column indicates if a tag is required or not

### Action Tags
- Possible action tags for Deposit Request File: `DepositCreate`, `DepositUpdate`, `DepositDelete`, `DepositValidate`

## XML to TXT Conversion Rules

To convert XML structure to TXT format:

1. Tags level 1 are all present
2. Tags level 2 and after are present if they have attributes or direct content
3. First column/field in the text-format file is always a tag name and cannot be changed
4. There is no correspondance in the TXT format for XML tags used for aggregation, so they are omitted

## TXT Format Details

### Separator
- **Pipe character** (`|` -- ASCII 124) is the delimiter
- To embed a literal pipe character in a TXT file, use backslash as escape: `\|` is the pipe character itself, not the separator

### Software
- Use any ASCII text editor or equivalent to create TXT files

## XLS/CSV Format

- Can be used for **mailing files only** (Mailing Request and Mailing Response), not for deposit files
- Requires the **Address File Tool (AFT)** available on e-MassPost interface
- Some data is encoded via webform on e-MassPost before upload
- **CSV separator**: pipe character (`|` -- ASCII 124)

## ZIP Compression

- Files **may** be compressed using the **ZIP algorithm only** (not GZIP or other methods)
- More information on the ZIP compression algorithm: http://www.info-zip.org/
- Can be compressed manually using a zip tool or programmatically via a zip library
- The compressed file can be opened with WinZip or similar tools
- **File naming**: the `.ZIP` extension must come **after** the format extension (`.XML` or `.TXT`)
  - Example: `filename.XML.ZIP` or `filename.TXT.ZIP`
  - The `.ZIP` must be in **uppercase**

## XSD Validation (Optional)

- Before sending an XML file to the MAIL ID system, customers can optionally validate the file structure against bpost-provided XSD schemas.
- XSD schemas **cannot** be used to validate TXT format files.
- Schemas are available on the [e-MassPost website](http://www.bpost.be/emasspost) under "Information", or via request to customer.operations@bpost.be.

## Related Files

- For transport protocols, see [http-protocol.md](./http-protocol.md) and [ftp-protocol.md](./ftp-protocol.md)
- For character restrictions in files, see [../reference/character-restrictions.md](../reference/character-restrictions.md)

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

For field descriptions, Zod schemas, and chatbot help, see the corresponding `schemas/` docs. The schema docs link back to these XSD files for formal validation use.
