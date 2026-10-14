# ADR 0005: SheetJS voor het lezen en schrijven van Excel

## Status

Accepted (Mark, 05/10/2026).

## Context

De library las adreslijsten met exceljs, enkel in .xlsx. Het oude .xls (Excel 97-2003) kon niet, en of dat bij Contrapunt binnenkomt, is open vraag Q-014. We hebben beide bibliotheken vergeleken op dezelfde synthetische lijsten (8 kolommen):

| | exceljs 4.4.0 | SheetJS 0.20.3 |
|---|---|---|
| Lezen, 150.000 adressen (Node) | 1,9 s, piek 1.028 MB | 1,6 s, piek 501 MB |
| Lezen, 150.000 adressen (browser) | 1,4 s, ±330 MB heap | 1,3 s, ±190 MB heap |
| Formaten | .xlsx, .csv | .xlsx, .xls, .csv, .ods en meer |
| Browserbundel (lezen) | 947 KB | 371 KB |

De waarden per cel waren identiek op `testadressen.xlsx` en op 25.000 rijen. exceljs kreeg sinds oktober 2023 geen release meer, en `npm audit` meldt via de oude `uuid` een matige kwetsbaarheid.

De optie die we niet namen: exceljs houden en SheetJS enkel voor .xls toevoegen. Dan zijn er twee bibliotheken voor hetzelfde werk.

## Decision

- SheetJS Community Edition (Apache 2.0) vervangt exceljs, voor het lezen (`parseExcelAddresses`) en het schrijven (scripts en tests via `src/core/masspost/fixtures/xlsx.ts`).
- **Gelezen formaten:** .xlsx en .xls. Een bestand wordt herkend aan zijn eerste bytes (zip of Compound File); al de rest, ook CSV, wordt geweigerd tot Q-014 beantwoord is.
- **Installatie** vanaf de CDN van SheetJS: `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`. De versie op npm (0.18.5) is verouderd en heeft bekende kwetsbaarheden.

## Consequences

- **Eén lezer voor .xlsx en .xls,** met de helft van het geheugen en een kleinere browserbundel. Het losstaande POC-bestand ging van 1,2 MB naar 0,6 MB.
- **Een lege kolomtitel verschuift de kolommen niet meer.** De oude lezer koppelde de waarden dan aan de verkeerde titel.
- **Celopmaak (lettertypes, kleuren, randen) kan niet bij het schrijven:** dat zit enkel in de betalende versie. Geen enkele huidige uitvoer gebruikt opmaak.
- **Updates zelf opvolgen:** Dependabot en `npm outdated` zien de CDN-versie niet. De releases staan op https://cdn.sheetjs.com, en de URL in `package.json` passen we met de hand aan.
- **Een .xls-bestand heeft maximaal 65.535 adressen.** Dat is een grens van het formaat.
- **Datums** komen terug als ISO-tekst, zoals voordien.
