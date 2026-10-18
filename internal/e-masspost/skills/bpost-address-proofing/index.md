# BPost Address Formatting & Validation API

> **When to use this file:** Start here. Route to one file. Do not load everything.

## What this API is

bpost Mailops webservice: match an address to the Belgian delivery-point
database, optionally return official spelling, language, geo/NIS, and S42
label lines. People and companies are **not** validated by bpost.

Prefer **REST**. SOAP exists; future work is REST-only.

| Limit | Value |
|---|---|
| Addresses per call | 1–100 |
| Delivering country | `BE` only for validation |
| Auth | Header `x-api-key` (request: addressvalidation@bpost.be) |

## Operations

| Operation | Purpose |
|---|---|
| `validateAddresses` | Match + warnings/errors + optional official address / suggestions / labels |
| `formatAddresses` | Assemble S42 label lines (no match against master data) |
| `provideFeedback` | Free-text comment linked to `TransactionID` |

## Our input modes

bpost accepts structured, semi-structured, or address-block. **We use 1 and 2 only.**

1. Structured fields (`StreetName` + `StreetNumber` + …)
2. Semi-structured lines (`"Kernstraat 20"`, `"2000 Antwerpen"`)
3. Address block L1–L7 — **forbidden** (often contains a person name)

Never mix structured and unstructured **within the same line**.

## Navigation

| File | Task |
|---|---|
| [reference/privacy-redaction.md](reference/privacy-redaction.md) | Allow/deny list (PII) |
| [schemas/validate-addresses.md](schemas/validate-addresses.md) | Validate request/response + options |
| [schemas/format-addresses.md](schemas/format-addresses.md) | Format request/response |
| [flows/validate-format-feedback.md](flows/validate-format-feedback.md) | Match outcomes |
| [errors/proofing-error-codes.md](errors/proofing-error-codes.md) | Warning vs error; vs MID-4xxx |
| [transport/rest-and-soap.md](transport/rest-and-soap.md) | Endpoints, auth, REST vs SOAP |
| [reference/s42-elements.md](reference/s42-elements.md) | CEN/UPU element table |
| [resources/index.md](resources/index.md) | Redacted JSON samples |

## Source

Manual v1.6/v1.7 (folder name v1.7), OpenAPI `externalMailaddressProofingAPI-OpenAPIspec_v3.yaml`,
XSD `ExternalMailingAddressProofingCSMessages_v001.1.xsd`.
Raw files stay in repo `reference/` (not in skill ZIPs).
OpenAPI `servers` URL is non-prod (`api.mailops-np.bpost.cloud`); production is in [transport/rest-and-soap.md](transport/rest-and-soap.md).
