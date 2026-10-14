> **When to use this file:** When choosing between OptiAddress (`MailingCheck`), the Address Proofing REST API, or the public validation website.

# Which address validation product?

These are **different bpost products**. Do not mix endpoints, auth, field models, or error codes.

| Use this | When | Protocol | Names / PII |
|---|---|---|---|
| **OptiAddress** (`MailingCheck` / MCP `check_batch`) | Mailing list for Mail ID deposit (thousands of rows) | XML/TXT to `www.bpost.be/emasspost`, Basic auth | Recipient names **required** (real mailing) |
| **Address Proofing API** | Realtime check or Belgian label, 1–100 addresses | REST JSON to `api.mailops.bpost.cloud`, `x-api-key` | **Never send person names or other PII**; company name allowed |
| **Website** | Human one-off check | http://bpost.be/validationadresse | User types in the browser |

## Decision

```
Need a Mail ID mailing list / deposit?
  yes → OptiAddress (this skill: flows/optiaddress-flows.md)
Need official street/city, suggestions, or S42 label lines (small set)?
  yes → bpost-address-proofing skill (Mailops REST)
Human only?
  yes → validationadresse website
```

## Do not confuse

| | OptiAddress | Address Proofing |
|---|---|---|
| Fields | Mail ID Comp codes 1–19, 90–93 | CEN/UPU S42 (`StreetName`, …) |
| Errors | MID-4xxx | `address_not_recognized`, `missing_field`, … |
| Batch | Large files | Max **100** per call |
| Auth | e-MassPost customer/account | `x-api-key` (request: addressvalidation@bpost.be) |

Comp ↔ S42 mapping (and which Comps may go to Proofing): [addressing-rules.md](addressing-rules.md).

Proofing privacy (deny-list): skill `bpost-address-proofing`, file `reference/privacy-redaction.md`.
