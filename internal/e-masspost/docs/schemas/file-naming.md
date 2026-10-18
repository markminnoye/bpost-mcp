> **When to use this file:** When constructing or parsing bpost file names for any request, acknowledgement, or response file transmitted via FTP or e-MassPost.

# File Naming Conventions

Files transmitted to bpost must follow strict naming requirements. This document covers the generic file name format, field descriptions, examples, pre-sorting code file naming, and the `.TMP` extension rule for FTP uploads.

## Generic File Name (XML and TXT)

The file name consists of uppercase fields separated by underscores, terminated by a file extension:

```
AAA_VVVV_CCCCCCCC_NNNNNNNNNN_YYMMDDHHMMSS_SSS.XXX
```

### Field Descriptions

| Field | Description | Rules | Example |
|-------|-------------|-------|---------|
| `AAA` | 3-character alphanumeric code identifying the application responsible for the data stream within bpost | For deposit files: `EMP` (for "e-MassPost"). For mailing list files: `MID` (for "MAIL ID" or OptiAddress) | `EMP` |
| `VVVV` | 4-digit version code identifying the version of the request | Currently `0100` for EMP-files and `0100`, `0102` or `0200` for MID-files (code for versions 1.00, 1.02 and 2.00). This version code is provided by bpost. | `0100` |
| `CCCCCCCC` | Numeric identifier (8 digits max) provided by bpost, uniquely identifying the sender | This is the PRS-ID of the PBC of the sender. If a mail handler sends transactions on behalf of his customer, the PRS-ID of the mail handler needs to be used. The PRS-ID of the router's customer will be referenced within the file content (more information on the Customer Reference Data Sheet). | `ABCD1234` |
| `NNNNNNNNNN` | Customer-assigned 10-character alphanumeric code, uniquely identifying the file | Can be used for a file unique serial number, an application code, or an internal customer, or combination thereof. bpost will include this field in filenames of acknowledgments and responses. | `56` |
| `YYMMDDHHMMSS` | Timestamp of when the file is generated | Necessary to identify multiple transactions possibly generated for the same NNNNNNNNNN file. | `120214150445` |
| `SSS` | 3-character alphanumeric code identifying the communication step | `0RQ` for Request Files, `1AK` for Acknowledgement Files, `2RS` for Response Files | `0RQ` |
| `XXX` | File extension identifying the file format (XML or TXT) | Must use capital letters (all uppercase) | `XML` |

### Examples

1. **Deposit Request file** (version 1.00) ABCD123456 for customer 12345:
   ```
   EMP_0100_12345_ABCD123456_120214150334_0RQ.XML
   ```

2. **Corresponding Acknowledgement file:**
   ```
   EMP_0100_12345_ABCD123456_120214150445_1AK.XML
   ```

3. **Corresponding Response file:**
   ```
   EMP_0100_12345_ABCD123456_120214151235_2RS.XML
   ```

## XLS File Naming

With the XLS(X) and CSV file formats, no specific rule is applied on the file naming.

## Pre-sorting Codes File Naming

The pre-sorting code file has a different naming convention from the generic file name:

```
MID_FFFF_PSCVVVVVVV_YYMMDDHHMMSS_3PR.XXX
```

| Field | Description | Rules |
|-------|-------------|-------|
| `FFFF` | Version of the data/structure format | Only format `0100` is supported |
| `VVVVVVV` | Version of the presorting code file | 7 digits (with leading zeros) |
| `YYMMDDHHMMSS` | Timestamp of when the file is generated | Same as generic file name |
| `3PR` | Alphanumeric code identifying the communication step | Reserved for pre-sorting code files |
| `XXX` | File extension identifying the file format | `.TXT` or `.XML` |

### Example

```
MID_0100_PSC0000107_120214143743_3PR.XML
```

This file contains presorting codes with format 0100 and version 0000107. The file was created on 14/02/2012 at 14:37:43.

## `.TMP` Extension Rule for FTP Uploads

When a file is uploaded using the FTP protocol, it can be named with the extension `.TMP` (in place of the extension `.XML` or `.TXT`) during the uploading. This indicates that the file is currently in the process of being transmitted and ensures that bpost never processes a partial file.

Once the uploading is completed, the file needs to be renamed to the appropriate extension.

## Compression (Optional)

The file can be compressed using the Zip algorithm (and no other compression methods) prior to transmission. If compressed, the file name must finish with the mention `.ZIP` (in upper case) after the file format (XML or TXT). See the sub-chapter "Summary of data exchange standards" for examples of names of compressed files.

---

See [deposit-request.md](deposit-request.md), [mailing-request.md](mailing-request.md), and [presorting-codes.md](presorting-codes.md) for the file structures that use these naming conventions.
