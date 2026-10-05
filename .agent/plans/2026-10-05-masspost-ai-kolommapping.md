# AI-kolommapping in de POC, met geanonimiseerde voorbeelddata

*Sonic Rocket · 5 oktober 2026 · status: klaar om te starten in een nieuwe sessie*

## Startprompt

Plak dit in een nieuwe sessie:

> Lees eerst `.agent/plans/2026-10-05-masspost-ai-kolommapping.md` en volg `AGENTS.md`. Gebruik context7 voor elke bibliotheek die je aanraakt (AI SDK, Vercel AI Gateway, Next.js, Zod, SheetJS). Begin met de brainstorming-skill: leg de open ontwerpvragen uit het plan één voor één aan mij voor, met een aanbeveling, voor je code schrijft. Neem geen architectuurbeslissingen zonder mij. Werk de library en het API-contract af voor de interface (bouwvolgorde in `AGENTS.md`). Commit pas op het einde, na mijn akkoord.

## Context

**De POC** staat op `/masspost/poc` (`src/app/(tools)/masspost/poc/`), plan [2026-10-05-masspost-poc-formaatvalidatie.md](2026-10-05-masspost-poc-formaatvalidatie.md).
- Alles draait in de browser: geen login, niets wordt bewaard.
- **Koppelen:** `MappingStep.tsx`, met de rollen uit `columns.ts`. `ColumnRole` is `name`, `companyDepartment`, `streetHouseBox`, `postcodeCity`, `context` ("Tonen bij het verbeteren") of `ignore`.
- **Beginwaarde:** `initialRoles()` gebruikt `suggestColumnMapping` (`src/core/masspost/suggest-mapping.ts`): regels op de kolomtitels, zonder celwaarden.
- **Klantendocumentatie:** `docs/documentatie/webapp/adreslijst-nakijken.md`.

**De bestaande AI-fallback** (DEC-008, Linear SR-79):
- **Route:** `POST /api/masspost/suggest-mapping` (`src/app/api/masspost/suggest-mapping/route.ts` en `schema.ts`). Ze vraagt een sessie of een bearer-token (`resolveRequestAuth`).
- **Model:** `src/lib/masspost/suggest-mapping-ai.ts`, `generateObject` van de AI SDK via de Vercel AI Gateway. Het model komt uit `MASSPOST_SUGGEST_MAPPING_MODEL` (sleutel `AI_GATEWAY_API_KEY`, of OIDC op Vercel). Lokaal is er geen model ingesteld.
- **Wat het nu doet:** het stuurt enkel de kolomtitels, kiest enkel de 4 adresvakken, en wordt enkel opgeroepen als de regels `needsAi` geven.
- **Tests:** de bestaande tests voor de route en de AI mocken `generateObject`. Volg dat patroon.

**Bekende zwakte die AI moet oplossen:** het AFT-bestand `docs/samples/contrapunt/testadressen-200-aft.xls`.
- De regels geven `confidence: medium` en `needsAi: false`, dus de AI wordt niet eens gevraagd.
- Toch koppelen ze `COUNTRY_NAME` aan Naam.
- Ze zetten ook de gestructureerde kolommen (`FIRST_NAME`, …) naast hun ongestructureerde tegenhangers (`NAME_UNSTRUCTURED`, …). Zijn beide gevuld, dan komt het adres dubbel op de envelop.

**Wat nog open staat in het projectdossier** (`docs/projectdossier/`, ter nazicht met Frank):
- DEC-008 ("AI enkel met kolomkoppen") moet herschreven worden, zie de besluiten hieronder.
- Q-007 (welke AI-aanbieder en regio) is nog open.

## Besluiten van Mark (05/10)

1. **Knop in de POC:** "Vraag een voorstel aan AI". De gebruiker vraagt het zelf, en het resultaat is een voorstel dat de gebruiker bevestigt.
2. **De AI kiest ook** de rollen "Tonen bij het verbeteren" en "Niet gebruiken", en de volgorde binnen een vak.
3. **Voorbeelddata mag mee:**
   - adressen zoals ze zijn;
   - andere kolommen met tekst (naam, bedrijf, e-mail, …) worden geanonimiseerd, "bijvoorbeeld door letters van plaats te veranderen". De methode ligt nog niet vast.
4. **Bouwen in een nieuwe sessie.**
5. **De AI stelt de koppeling voor** op basis van de kolomtitel en de inhoud (Mark, 05/10, antwoord op ontwerpvraag 1). We hoeven dus niet vooraf te weten welke kolom een adres is.
6. **Letters maskeren** met behoud van de vorm (Mark, 05/10, antwoord op ontwerpvraag 2). Bijvoorbeeld `Peeters` → `Paaaaaa`, of een e-mail als `a••@•••.be`.

## Open ontwerpvragen (eerst voorleggen)

1. **Wat blijft leesbaar?** Beslist: de AI koppelt op basis van titel en inhoud (besluit 5). Nog te kiezen is of adresachtige waarden leesbaar blijven, en hoe we die herkennen. Opties:
   - (a) alles maskeren, enkel cijfers en leestekens blijven staan;
   - (b) waarden die op een adres lijken leesbaar laten: een patroon van een postcode, woorden als -straat, -laan, rue of -weg;
   - (c) het voorstel van de regels gebruiken om te bepalen welke kolommen leesbaar blijven.

   Meten op de evaluatieset welke optie het model genoeg houvast geeft.
2. **Hoe maskeren?** Beslist: letters maskeren met behoud van de vorm (besluit 6). Nog te bepalen:
   - de precieze regels: hoofdletters, de eerste letter, accenten, cijfers;
   - de vorm van een e-mail, een telefoonnummer, een rekeningnummer;
   - en of een masker per kolom stabiel blijft, zodat dezelfde waarde hetzelfde masker krijgt.
3. **Hoeveel voorbeeldwaarden per kolom** (5, zoals op het scherm?), en uit welke rijen (de eerste of willekeurige)? Niet meer dan nodig.
4. **Waar anonimiseren:** in de browser, voor het versturen, zodat ruwe namen de browser nooit verlaten. De gebruiker ziet voor het versturen precies wat er weggaat ("Dit sturen we").
5. **Toegang:** de route vraagt een login, de POC is open. Opties: een login enkel voor de AI-knop, of een aparte route met een limiet. Bescherming tegen misbruik en kosten.
6. **Model, aanbieder en regio** (Q-007, EU), de kost per oproep, een tijdslimiet. En wat de knop doet zonder ingesteld model: verbergen of een melding tonen.
7. **API-contract:** de bestaande route uitbreiden (optioneel veld met voorbeelden, uitvoer met rollen) of een nieuwe route. Volgens `AGENTS.md`:
   - eerst het Zod-contract, door Mark goedgekeurd;
   - registreren in `scripts/generate-openapi.ts`;
   - daarna `npm run docs:build`.
8. **Het losstaande bestand** (offline) heeft geen AI: daar verbergen we de knop.
9. **Vastleggen:**
   - DEC-008 en Q-007 bijwerken;
   - een nieuw besluit in `.agent/plans/2026-10-02-masspost-web-flow-design.md`;
   - een ADR, want adressen naar een extern model sturen draai je niet zomaar terug. Ook de rol onder de AVG: Sonic Rocket als subverwerker, zie `docs/ontwikkelaars/architectuurmodellen.md`.

## Bouwvolgorde

1. **Library (TDD):** een pure functie voor de anonimisering en de voorbeelden in `src/core/masspost/` (naam te kiezen), browserveilig, met TSDoc.
2. **Contract en route:** het Zod-contract, goedkeuring, dan de route en `suggest-mapping-ai.ts` (prompt, schema met rollen). Tests met een gemockt `generateObject`.
3. **Interface in `MappingStep.tsx`:**
   - de knop en een voorbeeld van wat er verstuurd wordt;
   - het wieltje tijdens het wachten;
   - het resultaat als voorstel met de vermelding "voorstel van AI", en terug naar het voorstel van de regels.
4. **Docs:**
   - de klantenpagina `docs/documentatie/webapp/adreslijst-nakijken.md` (stap 2);
   - `docs/ontwikkelaars/website.md` en de OpenAPI;
   - `CHANGELOG.md`.

## Evaluatieset

Het repo is publiek: nooit echte adressen erin.
- **`docs/samples/contrapunt/testadressen.xlsx`:** de export van Contrapunt. De regels zijn daar al exact; AI mag niet slechter doen.
- **`docs/samples/contrapunt/testadressen-200-aft.xls`:** de AFT-indeling.
- **De voorbeeldlijst van de POC:** `demo-rows.ts`.
- **Zelf te maken:** kleine lijsten met vreemde kolomtitels, zoals Frans en Engels, "Adres 1", "Woonplaats/Gemeente", één kolom "Adres" met alles samen, e-mail en telefoon. Gebruik `src/core/masspost/fixtures/xlsx.ts` om ze te schrijven.

## Verificatie

- **Controles:** `npm test`, `npx tsc --noEmit`, `npm run lint:fix` en `npm run docs:check`.
- **In de browser** (`preview_start` met de naam `dev`):
  - de knop en het voorbeeld van wat er verstuurd wordt;
  - met `read_network_requests`: geen ruwe namen in de aanvraag, enkel geanonimiseerde waarden en adressen;
  - het resultaat wordt toegepast en kan terug;
  - de foutgevallen (niet ingesteld, 4xx, 5xx);
  - donker en mobiel.
