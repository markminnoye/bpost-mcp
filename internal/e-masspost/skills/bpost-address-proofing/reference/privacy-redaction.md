> **When to use this file:** Before building any Proofing request. Hard rule for agents and (later) the MCP client.

# Privacy redaction — Address Proofing

bpost does not validate people. We still **must not** send personal data of
natural persons. Company name is allowed. Apply this on the **server** when
an MCP client exists; do not rely on the model.

This rule applies **only** to Mailops Proofing. OptiAddress / `MailingCreate`
keep recipient names (real mailing lists).

## Never send

| Mail ID Comp | Meaning | Proofing field (do not populate) |
|---|---|---|
| 1–5 | Greeting, given, middle, last, suffix | `AddresseeFormOfAddress`, `AddresseeGivenName`, `AddresseeSurname` |
| 90 | Unstructured name group | unstructured addressee identification |
| — | Care-of person | `MaileeIndividualIdentification` |
| — | bpack customer / extra dispatch | `AddresseeSupplementaryDispatchInfo` |
| 70–79 | Customer reserved (unknown content) | — |
| — | Free address block L1–L7 | `AddressBlockLines` |

## Allowed

| Mail ID Comp | Meaning | Proofing field |
|---|---|---|
| 6–7 | Company, department | `MaileeOrganizationIdentification` |
| 8 | Building (location) | `BuildingConstruction` / wing / floor / door (no names in values) |
| 9, 12–19 | Street, house, box, PO box, postcode, city, country | `PostalAddress` structured or semi-structured |
| 91–93 | Unstructured company / street / postcode+city | matching unstructured postal/org fields |

## Consequences

- `formatAddresses` labels have **no addressee line**. Prepend the name locally if printing.
- Do not copy bpost manual samples that contain “Monsieur Dupont” as **our** payload.
- If a source row only has a name and no postal fields, skip Proofing for that row.
