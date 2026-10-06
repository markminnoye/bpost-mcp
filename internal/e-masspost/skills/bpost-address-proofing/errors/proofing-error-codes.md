> **When to use this file:** Mapping Proofing `ErrorCode` / severity, or comparing with Mail ID MID-4xxx.

# Proofing warnings and errors

**Warning:** a match was still found (anomaly or missing optional part). Official
address is usually present.

**Error:** the service could not fully interpret the address. `ComponentRef`
may identify the field (`StreetNumber`, `CountryName`, …) or be empty.

A processed result is not automatically a valid delivery point.

## Codes seen in bpost samples

| ErrorCode | Typical severity | Meaning | Rough Mail ID analogue |
|---|---|---|---|
| `missing_field` | warning | Required component absent | MID-7002 / MID-7004 |
| `field_not_recognized` | warning | Value not parsed / not in reference | MID-4000 |
| `address_not_recognized` | error | No usable match | MID-4010 |
| `delivering_country_not_supported` | error | Validation is BE-only | — |

The XSD types `ErrorCode` and `ErrorSeverity` as strings (not a closed enum).
Treat unknown codes as errors if severity is `error`, else warnings.

Do **not** look up these strings in `mailing-error-codes.md` (MID-xxxx only).

## Severity vs MID

OptiAddress uses MID-4000–4100 on mailing response files. Proofing uses the
table above on JSON/SOAP. Same postal idea, different protocol.
