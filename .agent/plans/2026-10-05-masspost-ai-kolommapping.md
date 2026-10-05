# AI-kolommapping in de POC, met gemaskeerde voorbeelddata

*Sonic Rocket · 5-6 oktober 2026 · status: backend en interface klaar (06/10), wacht op review van Mark*

## Status (06/10)

Backend en interface staan op `develop`. Nog niet gepusht. `MASSPOST_SUGGEST_MAPPING_MODEL=mistral/mistral-small` staat op Vercel (Production en Preview) en lokaal in `.env.local`.

Geverifieerd in de browser (`preview_start` met de naam `dev`):
- de schakelaar en de hovertip "Koppel de kolommen volgens het voorstel van AI (Mistral Small)";
- zonder aanmelding: 401, melding met "Aanmelden" in een nieuw tabblad, schakelaar terug uit;
- de body van de aanvraag bevat enkel gemaskeerde waarden (`Jxx`, `Kxxxstraat`, `Gxxx`);
- met een nagebootst antwoord (het echte voorstel van Mistral Small voor de voorbeeldlijst): aan, `✦` in de keuzelijsten, zelf een keuze wijzigen, uit (vorige keuze terug, `✦` blijft), weer aan zonder nieuwe aanvraag;
- donker en smal scherm.

Niet in de browser geverifieerd: een echte oproep met aanmelding (vraagt een Google-login van Mark), en het losstaande bestand (het browserpaneel opent geen `file://`; zonder `aiModel` toont de code geen schakelaar).

## Context

**De POC** staat op `/masspost/poc` (`src/app/(tools)/masspost/poc/`), plan [2026-10-05-masspost-poc-formaatvalidatie.md](2026-10-05-masspost-poc-formaatvalidatie.md).
- Alles draait in de browser: geen login, niets wordt bewaard.
- **Koppelen:** `MappingStep.tsx`, met de rollen uit `columns.ts`: `name`, `companyDepartment`, `streetHouseBox`, `postcodeCity`, `country`, `context` ("Tonen bij het verbeteren") en `ignore`.
- **Volgorde binnen een vak:** `PocFlow` houdt `columnOrder` bij; de pijltjes ‹ › op de envelop roepen `moveInBlock` op.
- **Beginwaarde:** `initialRoles()` met `suggestColumnMapping` (regels op de kolomtitels). De AFT is de enige herkende indeling (web-flow besluit 50); de AFT-zwakte uit de eerste versie van dit plan is daarmee opgelost.

## Besluiten van Mark

1. **Knop in de POC.** De gebruiker vraagt het voorstel zelf en bevestigt het.
2. **De AI kiest ook** "Tonen bij het verbeteren", "Niet gebruiken" en de volgorde binnen een vak.
3. ~~Adressen zoals ze zijn~~: herzien door besluit 7.
4. **Bouwen in een nieuwe sessie.**
5. **De AI koppelt op basis van titel en inhoud.** We hoeven niet vooraf te weten welke kolom een adres is.
6. **Letters maskeren met behoud van de vorm.**
7. **Het masker** (06/10), in alle kolommen:
   - elk woord houdt de eerste letter, de rest `X`/`x` (`Jan Peeters` → `Jxx Pxxxxxx`, `Kerkstraat` → `Kxxxstraat`); geen laatste letter;
   - postcode met gemeente in één waarde blijft leesbaar (`1020 Brussel`);
   - trefwoorden blijven leesbaar: straattypes, bus, rechtsvormen, tussenvoegsels, aansprekingen en landen;
   - tot 6 cijfers per waarde, langer wordt `9`;
   - per kolom gesorteerd;
   - de prompt legt het masker uit, met één voorbeeld.
8. **Login enkel voor de AI-knop:** sessie of bearer, met een gekoppeld account.
9. **Eén route:** `POST /api/masspost/suggest-mapping`, met een nieuw contract. De oude vorm is weg.
10. **Volgorde:** de AI zet `columnOrder`; de pijltjes blijven.
11. **Het ontwerp van de bestaande pagina's volgen.** Een knop met icoon en zo weinig mogelijk tekst.
12. **Deel van de POC, maar productiewaardig:** de backend moet zonder herschrijven mee kunnen naar het webplatform.
13. **Eén schakelaar "AI-voorstel"** (06/10) in de kop van "Gebruiken als". Aan neemt het voorstel over, uit zet de vorige keuze terug. De `✦` staat vóór de keuze van de AI in de keuzelijsten, ook bij uit. Het model staat enkel in de hovertip, tussen haakjes. Zie "Interface".

Vastgelegd in ADR 0006, DEC-008 (herzien), Q-007 (aangevuld) en web-flow besluit 61.

## Gebouwd (backend, 06/10)

- **`src/core/masspost/mask.ts`:** `maskValue` en `maskExamples`. Puur en browserveilig, idempotent, met tests (`tests/core/masspost/mask.test.ts`).
- **`src/lib/masspost/suggest-mapping-ai.ts`:** `suggestColumnRolesWithAi`.
  - Maskeert de voorbeelden opnieuw, voor elke oproeper.
  - Gebruikt `generateText` met `Output.object`, een time-out van 20 s, 1 nieuwe poging en een maximum aan uitvoertokens.
  - Controleert het antwoord met Zod: elke kolom precies één keer, en een vergeten kolom gaat naar `context`.
  - Logt één regel per oproep, zonder inhoud.
- **Route** `src/app/api/masspost/suggest-mapping/`: aanmelding nakijken, invoer parsen met Zod, de AI-module oproepen. Antwoordt met 400, 401, 403, 422, 502 of 503.
- **`scripts/eval-ai-mapping.ts`** (`npm run eval:ai-mapping -- --model=provider/model`): AI tegen de regels op de evaluatieset, met de opties `--mask`, `--only` en `--verbose`.

## Open

- **Q-007:** aanbieder en regio. Voorkeur van Mark (06/10): een Europese aanbieder zoals Mistral. Voorstel voor de evaluatie: `mistral/mistral-small` ($0,15 / $0,60 per miljoen tokens in/uit, gestructureerde uitvoer). Het model komt uit `MASSPOST_SUGGEST_MAPPING_MODEL`; lokaal is er geen ingesteld.
- **Meer metingen:** één run per masker op een kleine set geeft een richting, geen bewijs. Herhalen met meer lijsten (echte, geanonimiseerde indelingen van Contrapunt) en eventueel een tweede model.
- **Lege kolommen** (bv. `UNSTRUCTURED_COMPANY_DEPARTMENT`) zet het model soms onder `context` in plaats van `ignore`. Onschadelijk; eventueel deterministisch rechtzetten (filled 0 → `ignore`).
- **Limiet per tenant:** nodig voor de route opengaat voor veel gebruikers (ADR 0006).

## Interface

Ontwerp van Mark (06/10, besluit 13): één bediening, in de stijl van de bestaande pagina's (`poc.module.css`, tokens voor licht en donker). Vervangt het eerdere ontwerp met knop, paneel "Dit sturen we", AI-pill en toast.

- **Schakelaar in de kop van de kolom "Gebruiken als"** van de kolomtabel in `MappingStep`. Daar zie je waarop hij invloed heeft.
  - Een nieuwe schakelaar met `role="switch"` en `aria-checked`.
  - Ernaast `IconSparkles` (14 px, stroke 1,75) en het label "AI-voorstel".
  - **Hovertip** (`data-tip`): "Koppel de kolommen volgens het voorstel van AI (Mistral Small)". Enkel wat hij doet; het model tussen haakjes, zonder uitleg. De leesbare naam wordt afgeleid uit de id (`mistral/mistral-small` → "Mistral Small"), zonder lijst met modellen in de code.
  - **Geen schakelaar** zonder ingesteld model of in het offline bestand. `page.tsx` geeft het model (`MASSPOST_SUGGEST_MAPPING_MODEL`, als `isProviderModel`) door aan `PocFlow`; `standalone.tsx` geeft niets door.
- **Aan:**
  - de rollen en `columnOrder` uit het AI-voorstel overnemen (pure functie in `columns.ts`, met tests);
  - tijdens het wachten draait het wieltje in de schakelaar, en kan je er niet op klikken;
  - het voorstel wordt per bestand onthouden: aan, uit en weer aan vraagt het model niet opnieuw.
- **Uit:** de keuze van vóór het aanzetten komt terug (het voorstel van de regels plus de eigen aanpassingen van daarvoor).
- **Markering `✦`** vóór de tekst van de keuze die de AI voorstelde ("✦ Naam", Mark 06/10). Een native keuzelijst toont in het vakje en in de open lijst dezelfde tekst; vooraan staat de `✦` op beide plaatsen en vormen de tekens een rechte kolom.
  - Zichtbaar zodra er voor dit bestand een AI-voorstel bekend is, **ook als de schakelaar uit staat**.
- **Fouten:** de schakelaar springt terug naar uit, met een korte melding (`.alert`) onder de kop van de tabel. Teksten volgens `.agent/prompts/customer-facing-agent.md`.
  - **401:** "Je kan de AI-functies enkel gebruiken als je aangemeld bent." met de link "Aanmelden" naar `/api/auth/signin` in een nieuw tabblad (Mark, 06/10). De lijst staat enkel in het geheugen.
  - **403:** "Je account is nog niet volledig ingesteld, dus de AI-functies werken nog niet."
  - **503:** "De AI-functies zijn hier niet beschikbaar."
  - **422, 502 of geen netwerk:** het voorstel is mislukt; probeer het later opnieuw.
- **De aanvraag** komt in een klein bestand `ai-suggestion.ts` in de POC-map. Het bouwt de body uit `columnExamples` en `columnFillCounts` (die `MappingStep` al heeft) met `maskExamples`, doet de `fetch` en geeft een resultaat terug dat per uitkomst een eigen vorm heeft.
- **De route blijft ongewijzigd:** het model komt van de pagina, niet uit het antwoord.
- **Docs:**
  - klantenpagina `docs/documentatie/webapp/adreslijst-nakijken.md`: "Wat er met je gegevens gebeurt" (met een voorbeeld van een gemaskeerde kolom), en de schakelaar met de `✦` bij stap 2;
  - `docs/ontwikkelaars/website.md`;
  - `CHANGELOG.md`.

## Evaluatieset

Het repo is publiek: nooit echte adressen erin. `scripts/eval-ai-mapping.ts` bevat:
- `testadressen.xlsx` (Contrapunt, via de synoniemen);
- `testadressen-200-aft.xls` (AFT);
- `demo-rows.ts`;
- kleine lijsten in het geheugen: Franse en Engelse titels, "Adres 1" met "Woonplaats/Gemeente" vóór "Postnr", generieke titels ("Kolom A", …), en één kolom "Adres" met alles samen (enkel tonen, zonder score).

### Resultaten (06/10, `mistral/mistral-small`, één run per masker)

Adresvakken juist, in volgorde; lege kolommen tellen niet mee.

| Geval | Regels | Eerste letter (standaard) | Zonder eerste letter | Sterretjes |
|---|---|---|---|---|
| contrapunt | 4/4 | 4/4 | 4/4 | 4/4 |
| aft | 3/3 | 3/3 | 3/3 | 2/3 |
| demo | 4/4 | 4/4 | 4/4 | 4/4 |
| fr | 3/3 | 3/3 | 2/3 | 3/3 |
| en | 4/5 | 5/5 | 5/5 | 4/5 |
| odd-nl | 2/3 | 3/3 | 3/3 | 3/3 |
| generic | 0/3 | 3/3 | 2/3 | 2/3 |
| **Totaal** | **20/25** | **25/25** | **23/25** | **22/25** |

- **De eerste letter helpt bij namen.** Zonder eerste letter of met sterretjes mist het model naamkolommen: "Kolom A" (`Xxx Xxxxxxx`) gaat naar `ignore`, "Contact" en `UNSTRUCTURED_NAME` naar `context`. Zonder eerste letter staat bij de Franse lijst `Nom` vóór `Prénom`.
- **Volgorde:** `Postnr` vóór `Woonplaats/Gemeente` en `Prénom` vóór `Nom` kiest het model juist; de regels volgen het bestand.
- **Eén kolom "Adres" met alles samen:** het model zet ze onder naam. Splitsen kan niet; de interface toont dan dat straat en postcode ontbreken.
- **Kost en snelheid:** ±1.200-1.700 tokens in, 40-260 uit per oproep, 0,7-3,8 s. Met de prijzen van Mistral Small minder dan 0,05 cent per oproep.
- **Limiet:** de AI Gateway laat voor dit team 5 aanvragen per minuut toe voor dit model. Daarom `--pause=13000`.

## Verificatie (interface)

- **Controles:** `npm test`, `npx tsc --noEmit`, `npm run lint:fix` en `npm run docs:check`.
- **In de browser** (`preview_start` met de naam `dev`):
  - de knop en het paneel;
  - met `read_network_requests`: in de aanvraag enkel gemaskeerde waarden;
  - het resultaat wordt toegepast en kan ongedaan gemaakt worden;
  - de foutgevallen;
  - donker en mobiel.
