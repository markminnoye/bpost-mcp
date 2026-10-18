> **When to use this file:** Mapping national fields to CEN/UPU S42 codes. Skip 10.xx person elements.

# S42 elements (Belgian)

Script is always `Latn`. Language: `de` \| `en` \| `fr` \| `nl`.
Delivering country for validation: `BE`.

## Organisation (allowed)

| Title | S42 | Proofing field |
|---|---|---|
| Function | 20.03.0.0.0 | `MaileeOrganizationFunction` |
| Department | 20.02.0.0.0 | `MaileeOrganizationOrganizationalUnit` |
| Company | 20.00.0.0.0 | `MaileeOrganizationOrganizationalName` |
| Legal status | 20.01.0.0.0 | `MaileeOrganizationLegalStatus` |

## Location (allowed)

| Title | S42 | Proofing field |
|---|---|---|
| Wing / stair / floor / door type+indicator | 30.29–30.32 | nested Wing/Stairwell/Floor/Door |
| Building / industrial zone | 30.26.1.0.0 | `BuildingConstruction` |
| PO box type | 40.19.0.0.1 | `DeliveryServiceType` (`Postbus`, `Boite Postale`, `PB`, `BP`, `bpack`) |
| PO box / bpack name | 40.19.0.0.2 | `DeliveryServiceIndicator` |
| Street | 40.21.0.0.0 | `StreetName` |
| House number | 40.24.0.0.0 | `StreetNumber` |
| Box | 40.28.0.0.0 | `BoxNumber` (print with `bus`/`bte`/`box`) |
| Postcode | 40.13.0.0.0 | `PostalCode` |
| Town | 40.16.0.0.0 | `MunicipalityName` |
| PO box qualifier | 40.35.0.0.0 | `DeliveryServiceQualifier` |
| Country name | 40.14.0.0.0 | `CountryName` (cross-border labels) |

## Person (never send)

| Title | S42 | Do not send |
|---|---|---|
| Form of address / given / surname | 10.05 / 10.06 / 10.08 | addressee individual |
| Suppl. dispatch (bpack RC, …) | 30.33.0.0.0 | `AddresseeSupplementaryDispatchInfo` |
| Mailee role / name | 20.11 / 20.05 / 20.06 / 20.08 | `MaileeIndividualIdentification` |

bpost manual examples (private person at “Rue du Vivier”, etc.) are **vendor samples**, not our payload. Rewrite without 10.xx / mailee-person fields.

Mail ID Comp mapping: `e-masspost-protocol` → `reference/addressing-rules.md`.
