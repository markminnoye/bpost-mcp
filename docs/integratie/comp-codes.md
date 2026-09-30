# Comp-codes en aliassen

Een adres bestaat in een `MailingRequest` uit `Comp`-elementen met een `code` uit Table 46 van het Mail ID-protocol. Volledige tabel: `schemas/mailing-request.md` in de protocolbibliotheek (repo `bpost-e-masspost-skills`, submodule `docs/internal/e-masspost/`).

## Table 46

| Code | Betekenis | Max. lengte |
|---|---|---|
| 1 | Aanspreking | 10 |
| 2 | Voornaam | 42 |
| 3 | Tweede voornaam | 20 |
| 4 | Familienaam | 42 |
| 5 | Achtervoegsel | 10 |
| 6 | Bedrijfsnaam | 42 |
| 7 | Afdeling | 42 |
| 8 | Gebouw | 42 |
| 9 | Adresregel 1 | 42 |
| 12 | Huisnummer | 12 |
| 13 | Busnummer | 8 |
| 14 | Postbusnummer | 8 |
| 15 | Postcode | 12 |
| 16 | Gemeente | 30 |
| 17 | ISO-landcode | 2 |
| 18 | Landnaam | 42 |
| 19 | Staat | 42 |
| 70–79 | Vrij voor de klant, gecontroleerd maar niet gebruikt | 70 |
| 90 | Ongestructureerd: naam (1–5) | 50 |
| 91 | Ongestructureerd: bedrijf, afdeling, gebouw (6–8) | 50 |
| 92 | Ongestructureerd: straat en huisnummer (9–13 of 14) | 50 |
| 93 | Ongestructureerd: postcode en gemeente (15–16) | 50 |

Regels uit het protocol:
- Per groep gebruik je gestructureerde **of** ongestructureerde velden, nooit allebei.
- Een leeg veld mag je niet versturen: laat het weg.
- Een `code` mag maar één keer per `Item` voorkomen.

## Aliassen in `apply_mapping_rules`

Bron: `BPOST_ALIASES` in `src/app/mcp/route.ts`. Andere waarden, zoals `Comps.70`, gaan ongewijzigd door.

| Alias | Doel | Alias | Doel |
|---|---|---|---|
| `greeting` | `Comps.1` | `postalCode` | `Comps.15` |
| `firstName` | `Comps.2` | `municipality` | `Comps.16` |
| `middleName` | `Comps.3` | `language` | `lang` |
| `lastName` | `Comps.4` | `priority` | `priority` |
| `suffix` | `Comps.5` | `mailIdBarcode` | `midNum` |
| `company` | `Comps.6` | `presortCode` | `psCode` |
| `department` | `Comps.7` | `poBox` | `Comps.14` |
| `building` | `Comps.8` | `box` | `Comps.13` |
| `street` | `Comps.9` | `houseNumber` | `Comps.12` |

Geldige codes bij `Comps.<code>`: 1–19, 70–79 en 90–93 (`validateMappingTargets`). Een onbekend doel geeft een foutmelding met een voorbeeld.

## Twee mappingwegen

- De **MCP-pipeline** gebruikt de gestructureerde codes via de aliassen hierboven.
- De **library** (`src/core/masspost/`) gebruikt de ongestructureerde codes 90–93. Zie [Kolom-mapping](kolom-mapping.md).
