# Contrapunt — testadressen.xlsx

Referentie-export om de masspost-library en `npm run test:transport` te testen (≈789 adressen, worksheet `Blad1`).

**Minimum 500 adressen:** bevestigd door Contrapunt (Frank, 28/09/2026) — geldt breed voor mailings (commercieel, geen XSD). Dit bestand voldoet; `--simple` / `--synthetic` zijn enkel voor snelle XML/bestandsnaam-tests, niet als volwaardige portal-upload.

**Bron:** bijlage uit e-mail (lokaal gekopieerd op 2026-09-28). Adressen zijn fictief en mogen in de publieke repo.

## Kolommapping (→ bpost Comp 90–93)

| Comp | Excel-kolommen |
|------|----------------|
| Naam (90) | `Roepnaam`, `Familienaam` |
| Straat/huis/box (92) | `Correspondentieadres - Straat (Key)`, `… Huisnummer …`, `… aanv. huisnr. …` |
| Postcode/gemeente (93) | `Correspondentieadres - Postcode (Key)`, `… Plaats (Key)` |

Mapping in code: `CONTRAPUNT_EXPORT_COLUMN_MAPPING` in `src/core/masspost/fixtures/contrapunt-sample.ts`.

Identiteit en bestandsmetadata in `.env.local` — uitgebreid uitgelegd in **[masspost-test-env.md](../../internal/masspost-test-env.md)**.

| Env | Rol |
|-----|-----|
| `BPOST_TEST_CUSTOMER_ID` | PRS / `sender` / `customerId` |
| `BPOST_TEST_ACCOUNT_ID` | Portal **Account Id** (PBC) → `Header/@accountId` |
| `BPOST_TEST_BARCODE_CUSTOMER_ID` | Portal **Barcode Id** (5 cijfers, bv. `00210`) — **niet** accountId |
| `BPOST_TEST_MID_VERSION` | **`0200`** = MAIL ID protocol **2.00** (locked 28/09) in **XML + bestandsnaam** (`MID_0200_…`) |
| `BPOST_TEST_CUSTOMER_FILE_REF` | **`REFERENCE`** → genormaliseerd tot **`REFERENCE0`** (10 tekens) in XML + bestandsnaam |

Voorbeeldbestandsnaam mailing: `MID_0200_251614_REFERENCE0_260928222131_0RQ.XML`.

## Gebruik

```bash
# Standaard: dit bestand (geen --file nodig)
npm run test:transport

# XML voor handmatige upload op e-MassPost (test-modus), zonder verzenden
npm run generate:mailing-xml
# Snelle test: 1 fictief adres, zelfde portal-ids uit .env.local
npm run generate:mailing-xml -- --simple
# → docs/samples/contrapunt/generated/MID_….XML

# Expliciet
npm run test:transport -- --file docs/samples/contrapunt/testadressen.xlsx

# Klein synthetisch enkel adres
npm run test:transport -- --synthetic
```
