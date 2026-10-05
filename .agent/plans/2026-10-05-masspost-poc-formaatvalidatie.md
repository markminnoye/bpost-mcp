# POC: Excel inlezen → kolommen koppelen → formaatvalidatie

*Sonic Rocket · 5 oktober 2026 · status: gebouwd, wacht op review van Mark*

## Context

Het architectuurmodel is nog open (`docs/ontwikkelaars/architectuurmodellen.md`). De formaatvalidatie draait in elk model in de browser. Deze POC bouwt stap 1 tot 3 van de flow (opladen, koppelen, formaatvalidatie). Stap 3 volgt de schets `docs/ontwerp/webapp/formaatvalidatie.html` (v8). De POC meet ook de performantie boven 25.000 adressen (besluit 43 in [2026-10-02-masspost-web-flow-design.md](2026-10-02-masspost-web-flow-design.md)).

**Besluiten van Mark (05/10):**
- Alles in de browser, op de main thread: geen upload, database of API-route.
- SheetJS in plaats van exceljs, voor lezen en schrijven; .xlsx en .xls (ADR 0005, besluit 44).
- 25.000 als normale grens, tot 150.000 met een waarschuwing om te meten.
- CSS-module met de tokens van de schets. Tailwind en shadcn blijven open.
- Overal bereikbaar zonder login, met `noindex`.
- Een losstaand HTML-bestand.
- Te lang: een afkortingenlijst.
- Een documentatiepagina met de regels, met een link vanuit de pagina.
- 5 voorbeeldwaarden per kolom bij het koppelen.

**Bibliotheken nagekeken in context7:** exceljs en SheetJS (formaten, dense mode, licentie, installatie via de CDN), Next.js 16 (dynamische `import()`, workers), esbuild (`.module.css` gaat via local-css) en `@tabler/icons-react`.

## Regels per bpost-veld

De library vult enkel de ongestructureerde velden 90 tot 93: maximaal 50 tekens, ISO-8859-1, geen `|`, tab of regeleinde.
- **Verplicht:** 92 en 93 (bpost: groep 3 en 4), en 90 (onze keuze).
- **Geen `/`** in 92 en 93 (gids, AFT kolommen W en X).

De klantenpagina: `docs/documentatie/webapp/formaatvalidatie.md`.

## Taken

- [x] `charset.ts`: `CHARACTER_REPLACEMENTS` geëxporteerd en uitgebreid (ł đ œ ı •). Ook `mapRows` vervangt die tekens nu.
- [x] `format-check.ts`: `checkFieldValue`, `proposeFieldValue` (met `ABBREVIATIONS`), `findFormatIssues`, `missingTargets`. Tests eerst.
- [x] `excel.ts`: werkt in de browser (`ArrayBuffer` zonder `Buffer`), en `rowNumbers`.
- [x] SheetJS vervangt exceljs (ADR 0005):
  - `excel.ts` leest .xlsx en .xls en herkent het bestand aan de eerste bytes;
  - een lege kolomtitel verschuift de kolommen niet meer;
  - `fixtures/xlsx.ts` schrijft voor de tests en de scripts;
  - exceljs is uit `package.json`.
- [x] `mapping.ts`: `joinColumns` geëxporteerd.
- [x] Pagina `src/app/(tools)/masspost/poc/`: `PocFlow`, `StepBar` (Harvey balls), `UploadStep`, `MappingStep` (envelopvoorbeeld), `FormatStep`, `IssueRow`, `MeasurePanel`, `demo-rows`, `poc.module.css`.
- [x] `NEXT_PUBLIC_DOCS_URL` in `env.ts` en `.env.example` (GitBook: `https://sonicrocket.gitbook.io/contrapunt-bpost`).
- [x] `npm run build:poc` maakt `dist/masspost-poc.html` (±0,6 MB met SheetJS, offline, `file://`).
- [x] `npm run generate:large-xlsx` maakt testlijsten.
- [x] Docs:
  - de klantenpagina "Adreslijst nakijken" (alle stappen, ook "Tonen bij het verbeteren"), gelinkt vanuit het koppelscherm;
  - de regelspagina, met een test die ze gelijk houdt met de code;
  - `website.md`, `schaal-en-limieten.md` (metingen) en `masspost-library.md`;
  - besluit 43.
- [x] Land: rol en bpost-veld 17/18 (enkel buiten België), herkenning van land, pays en country, regels in de formaatvalidatie (max 42).
- [x] Pills bovenaan elke stap (besluit 46), met de AFT-pill in blauw; de AFT-indeling wordt herkend (`presets/aft.ts`). Bij een bekende indeling gaan we meteen door, en zonder formaatfouten naar stap 4.
- [x] Envelop: de sjabloon met de kolomnamen en de volgorde per vak, en voorbeelden per soort adres om door te bladeren.
- [x] Meer voorbeelden per kolom, bij een klik.
- [x] Het rijnummer als `seq` (besluit 49): de optie `rowNumbers` in `mapRows`, en `findFormatIssues`.
- [x] Stap 4 in de POC: "Download voor de drukker" (`buildPrinterExport`, besluit 48).
- [ ] Mark: `NEXT_PUBLIC_DOCS_URL` zetten in Vercel (Preview en Production).
- [ ] Mark: meten op een kantoor-pc van Contrapunt met het losstaande bestand ("Kopieer meting").
- [ ] Frank: komt .csv voor, en hoe vaak .xls? Vraag Q-014 in `docs/projectdossier/open-vragen.md`. .xls werkt al sinds de overstap naar SheetJS. CSV kan SheetJS ook lezen, maar vraagt keuzes over de tekenset en het scheidingsteken.
- [ ] AI-kolommapping met geanonimiseerde voorbeelddata: apart plan [2026-10-05-masspost-ai-kolommapping.md](2026-10-05-masspost-ai-kolommapping.md), in een nieuwe sessie.
- [ ] AFT als tweede weg (inlezen met een preset en exporteren in stap 4): idee van Mark, open vraag in het ontwerp van de web-flow.
- [ ] Kolomvoorstel voor de indeling van de Address File Tool (AFT, .xls met SEQ, NAME_UNSTRUCTURED, …): de heuristiek wijst nu ook lege gestructureerde kolommen toe (bv. COUNTRY_NAME → Naam). Een eigen preset, zoals voor de export van Contrapunt, zou dat oplossen.

## Op te volgen (belangrijk)

- **Uitgesloten rijen en de export voor de drukker** (besluit 48, vraag Q-016): hoe weet de drukker wat niet gedrukt mag worden, hoe komt de barcode per adres bij hem, en mogen het gedrukte en het aangekondigde adres verschillen (besluit 45)? Mark (05/10): "heel belangrijk, zeker opvolgen".
- **Welke `SEQ` gaat naar bpost** bij een AFT-bestand: zijn eigen kolom `SEQ`, of het rijnummer (besluit 49)?

## Resultaat van de meting (05/10)

Productiebouw, Chrome, zichtbaar tabblad, Mac met Apple-chip:

| Adressen | Inlezen (exceljs → SheetJS) | Controle |
|---|---|---|
| 25.000 | 0,30 → 0,26 s | 34 ms |
| 100.000 | 1,0 → 0,95 s | 107 ms |
| 150.000 | 1,4 → 1,3 s | 165 ms |

**Geheugen bij 150.000 adressen:** exceljs ±330 MB, SheetJS ±190 MB.

**Een verborgen tabblad is tot 10 keer trager.** Details in `docs/ontwikkelaars/schaal-en-limieten.md`.

**Bevindingen op `testadressen.xlsx`:** 2 formaatfouten van het type schuine streep.
- "Kastanjestraat 1/1" wordt "Kastanjestraat 1 bus 1";
- "Onze-Lieve-Vrouwlaan 25 /" (een losse `/` in de kolom voor het bijvoegsel bij het huisnummer) wordt "Onze-Lieve-Vrouwlaan 25".

## Buiten scope

Database, API-routes, de adrescontrole, opslag van verbeteringen, login, Tailwind/shadcn, een Web Worker, een eigen lezer, .xls en CSV, en een export van de verbeterde lijst.
