# Masspost test-credentials (`.env.local`)

Variabelen voor **`src/core/masspost/`** en scripts `npm run test:transport` / `npm run generate:mailing-xml`.  
Validatie: `src/lib/config/env.ts` · resolutie: `src/core/masspost/credentials.ts`.

## Overzicht

| Variabele | Protocol / bpost-term | Waar het landt |
|-----------|------------------------|----------------|
| `BPOST_TEST_USERNAME` / `PASSWORD` | e-MassPost login | HTTP Basic Auth / FTP (niet in XML) |
| `BPOST_TEST_CUSTOMER_ID` | PRS-id, “Customer id”, sender | `Context/@sender`, `Header/@customerId`, bestandsnaam `…_CCCCCCCC_…` |
| `BPOST_TEST_ACCOUNT_ID` | PBC “Account id” | `Header/@accountId` |
| `BPOST_TEST_BARCODE_CUSTOMER_ID` | Mail ID barcode-klant (5 cijfers) | Alleen bij zelf gegenereerde MID-nummers (`midNum`), niet in Header |
| **`BPOST_TEST_MID_VERSION`** | **Bestandsversie (VVVV)** | **`Context/@version` + bestandsnaam** |
| **`BPOST_TEST_CUSTOMER_FILE_REF`** | **Customer file reference (NNNN…)** | **`RequestProps/@customerFileRef` + bestandsnaam** |
| `BPOST_FTP_*` | FTP/FTPS | Transport only |

Legacy: `BPOST_TEST_CUSTOMER_NUMBER` wordt nog gelezen als `BPOST_TEST_CUSTOMER_ID` ontbreekt.

## Minimum 500 adressen (Contrapunt)

**Bevestigd 28/09/2026 (Frank, Contrapunt):** mailings moeten in de praktijk **minstens 500 adressen** bevatten — commerciële regel, **niet** in XSD. Geldt **breder** dan eerst aangenomen. Frank's AFT-tool vult kortere lijsten aan met een vast filler-adres; onze library doet dat nog niet automatisch.

- **Echte portal-test:** gebruik `testadressen.xlsx` (≈789 rijen) of `npm run generate:mailing-xml` zonder `--simple`.
- **`--simple` / `--synthetic`:** nuttig voor bestandsnaam, XML-header en validatie — geen volwaardige acceptatie-test.

Zie ook [`docs/external/contrapunt-aft-converter/README.md`](../external/contrapunt-aft-converter/README.md) §4.

## Mode-limieten (Header `@mode`)

| Mode | Code | Limiet behandeling |
|------|------|--------------------|
| **Test** | `T` | **max 200 adressen** |
| Certification | `C` | max 2000 adressen |
| Production | `P` | geen die testlimiet (na certificering) |

Los daarvan: commercieel **minimum 500** adressen (Frank) — geldt voor echte mailings, niet voor `mode=T`.

`npm run generate:mailing-xml` limiet standaard tot **200** (`--all` voor hele xlsx).

## Customer Gegevens (e-MassPost portal)

Op de site onder **Customer Gegevens** (Mass Mail) staan de waarden die in **Header/Context** horen — niet door elkaar halen:

| Portalveld | Contrapunt (voorbeeld) | Env | XML / bestand |
|------------|------------------------|-----|----------------|
| **Customer Id** | 251614 | `BPOST_TEST_CUSTOMER_ID` | `Context/@sender`, `Header/@customerId`, `…_251614_…` |
| **Account Id** | **65486** | `BPOST_TEST_ACCOUNT_ID` | `Header/@accountId` |
| **Barcode Id** | **210** | `BPOST_TEST_BARCODE_CUSTOMER_ID` → **`00210`** (5 cijfers) | Alleen in **Mail ID-nummers** (`midNum`), niet in Header |
| *(voorbeeld bestandsnaam)* | `MID_0200_251614_REFERENCE0_…_0RQ.XML` | `MID_VERSION` + `CUSTOMER_FILE_REF` | Naam + `Context/@version` + `customerFileRef` |

**Veelgemaakte fout:** `210` is de **Barcode Id**, niet de Account Id. Account Id **65486** komt overeen met o.a. `oss_contractid=65486` in de SSO/portaal-URL — dat is **niet** het barcode-veld.

Certified flags (*Check certified* / *Create certified* = Ja) staan in de portal; onze test-XML forceert nog **`mode="T"`** (`FORCE_TEST_MODE`) tot Contrapunt gecertificeerd is.

## `BPOST_TEST_MID_VERSION`

**Besluit Contrapunt (28/09/2026):** we gebruiken **`0200` (MAIL ID versie 2.00)**. Live bevestigd
met portal-upload Status 100. Zie [bpost-roundtrip](../samples/contrapunt/bpost-roundtrip/).

**Wat het is:** de **4-cijferige protocolversie** in bestandsnaam + `Context/@version`.  
**Toegestane waarden:** `0100` | `0102` | `0200`. **Default / Contrapunt:** `0200`.

**Moet overal gelijk zijn:**

1. **Bestandsnaam** — veld `VVVV` in  
   `MID_VVVV_CCCCCCCC_NNNNNNNNNN_YYMMDDHHMMSS_0RQ.XML`  
   Zie [file-naming.md](./e-masspost/docs/schemas/file-naming.md).

2. **XML** — attribuut op `<Context … version="0200">` in `MailingRequest`.

Voor **0200** horen op `MailingCreate` ook `FileInfo` en `expectedDeliveryDate` (niet voor 0100).

**Voorbeeld (mailing):**

```text
MID_0200_251614_REFERENCE0_260928222131_0RQ.XML
     ^^^^
Context version="0200"
```

**Code:** `buildMailingRequest()` (`src/core/masspost/build-request.ts`), `buildMailingRequestFileName()` (`file-naming.ts`).

---

## `BPOST_TEST_CUSTOMER_FILE_REF`

**Wat het is:** een **door jou gekozen referentie** voor dit request-bestand (max **10** alfanumerieke tekens na sanitizing). bpost gebruikt dezelfde token in **acknowledgement-** en **response-bestandsnamen**, zodat je upload aan de juiste reactie koppelt.

**Default in deze repo:** `REFERENCE` in `.env` — in **bestandsnaam + XML** wordt dat **`REFERENCE0`** (exact **10** tekens, korte refs worden rechts aangevuld met `0`). Zo sluit het aan op de Technical Guide (`NNNNNNNNNN`) en deposit-XSD `[A-Z0-9]{10}`.

**Moet overal gelijk zijn:**

1. **Bestandsnaam** — veld `NNNNNNNNNN` (**exact 10** alfanumerieke tekens) in  
   `MID_0100_251614_REFERENCE0_260928213828_0RQ.XML`  
   `                              ^^^^^^^^^^`

2. **XML** — `<RequestProps customerFileRef="REFERENCE0"/>` onder `Header/Files`.

**Gebruik:**

- Vaste placeholder (`REFERENCE` in env → **`REFERENCE0`** in naam/XML) voor tests — ok zolang elke upload een **nieuwe timestamp** in de bestandsnaam heeft (`YYMMDDHHMMSS`).
- Of eigen codes (`BATCH0426`, `CPNT0001`, …) om batches in jullie systeem te herkennen — **max 10 tekens**, hoofdletters in bestandsnaam na onze sanitizer.

**Niet hetzelfde als:**

- `mailingRef` op `<MailingCreate>` — interne mailing-referentie in de businesslaag (andere limiet/regels).
- `customerId` / PRS — identiteit van de afzender.

**Voorbeeld deposit (zelfde tokens, andere prefix):**

```text
EMP_0100_251614_REFERENCE_260928213828_0RQ.XML
```

---

## Snel testen

```bash
npm run generate:mailing-xml
```

Output onder `docs/samples/contrapunt/generated/`; console toont `customerId`, `accountId`, `midVersion` en de bpost-bestandsnaam.

**Portal code lists** (product/destination/sorting codes van de Mass Mail-site, geen account-ids): [e-masspost/reference/portal-code-lists/README.md](./e-masspost/reference/portal-code-lists/README.md).
