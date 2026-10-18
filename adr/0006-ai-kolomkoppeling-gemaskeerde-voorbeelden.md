# ADR 0006: AI-voorstel voor de kolomkoppeling, met gemaskeerde voorbeelden

## Status

Accepted (Mark, 06/10/2026).

## Context

**De regels op de kolomtitels** (DEC-008) volstaan voor de AFT en voor gangbare titels, maar niet voor onbekende indelingen: titels als "Kolom A" of "Adres 1", of een gemeente vóór de postcode. Op de evaluatieset (`npm run eval:ai-mapping`) halen de regels 20 van de 25 adresvakken.

**Een model met enkel kolomtitels** ziet niet wat er in een kolom staat. Voorbeeldwaarden helpen wel, maar dat zijn persoonsgegevens. Twee bestaande afspraken bakenen dat af:
- REQ-N-003 laat hoogstens kolomkoppen en gemaskeerde voorbeeldcellen toe;
- `architectuur.md` zegt: geen adressen naar externe AI-modellen.

**Opties die we niet namen:**
- **Adressen leesbaar meesturen** (besluit 3 van 05/10, hiermee herzien): vraagt een herziening van REQ-N-003.
- **Letters door elkaar:** alle letters en de lengte blijven staan, zodat een korte naam te raden is.
- **Sterretjes:** wissen het verschil tussen hoofd- en kleine letters, en dat is net een signaal voor het model.
- **Eerste én laatste letter:** samen met de lengte maken die korte namen bijna te raden.

**Gemeten** (06/10, `mistral/mistral-small`, één run per masker, 25 adresvakken): de regels 20, eerste letter 25, zonder eerste letter 23, sterretjes 22. Zonder eerste letter of met sterretjes mist het model vooral naamkolommen.

## Decision

- **Op vraag van de gebruiker.** Een knop in het koppelscherm vraagt het voorstel; de gebruiker bevestigt het. De interface volgt in een volgende ronde.
- **Wat naar het model gaat:** per kolom de titel, het aantal gevulde rijen en tot 5 voorbeelden, gemaskeerd met `maskValue` (`src/core/masspost/mask.ts`):
  - elk woord houdt zijn eerste letter; de rest wordt `X` (hoofdletter) of `x`, dus `Jan Peeters` → `Jxx Pxxxxxx`;
  - postcode met gemeente in één waarde blijft leesbaar, want de postcode bepaalt de gemeente al;
  - trefwoorden blijven leesbaar: straattypes en -achtervoegsels (`Kxxxstraat`), bus, rechtsvormen, tussenvoegsels, aansprekingen en landen;
  - tot 6 cijfers per waarde blijven staan; een langere reeks (telefoon, rekeningnummer) wordt `9`;
  - de voorbeelden staan per kolom gesorteerd, zodat voorbeelden van verschillende kolommen niet per rij aan elkaar te koppelen zijn.
- **Twee keer maskeren.** De browser maskeert voor het versturen, zodat de gebruiker ziet wat er weggaat. De server maskeert opnieuw in `suggestColumnRolesWithAi`, voor elke oproeper. `maskValue` is idempotent.
- **De prompt legt het masker uit** (`SUGGEST_MAPPING_INSTRUCTIONS`) en bevat één uitgewerkt voorbeeld.
- **Eén route:** `POST /api/masspost/suggest-mapping`, met aanmelding (sessie of bearer, met een gekoppeld account). De oude vorm verdwijnt (enkel titels, eerst de regels, AI enkel bij `needsAi`). De regels draaien als library-functie in de client.
- **Het antwoord:** zeven rollen (vijf adresvakken, `context` en `ignore`), en elke kolom precies één keer. Binnen een vak is de volgorde de volgorde op de envelop.
  - Zod kijkt het antwoord na.
  - Een dubbele of onbekende kolom geeft 422.
  - Een kolom die het model vergeet, komt onder `context`.
- **Grenzen:**
  - 100 kolommen, 5 voorbeelden en 200 tekens per waarde;
  - een maximum aan uitvoertokens;
  - een time-out van 20 s;
  - één nieuwe poging.
- **Het model** komt uit `MASSPOST_SUGGEST_MAPPING_MODEL`, via de Vercel AI Gateway. De keuze van aanbieder en regio is open vraag Q-007.

## Consequences

- **AVG.** Sonic Rocket blijft subverwerker. De AI-aanbieder krijgt geen leesbare namen of straten.
  - Wat wel meegaat: beginletters, de vorm, postcode met gemeente en korte cijfers zoals een huisnummer. Een adres is daarmee niet volledig onherkenbaar.
  - Daarom sorteren we per kolom en sturen we weinig voorbeelden.
  - Q-007 (aanbieder, regio, verwerkersovereenkomst) moet beantwoord zijn voor productie.
- **Logging:** één regel per oproep, met het model, de duur, de tokens en de uitkomst, nooit met inhoud. Daarmee volgen we de kost per oproep.
- **Nog niet:** een limiet per tenant. Die is nodig voor de route opengaat voor veel gebruikers.
- **Samen bijhouden:** de trefwoordenlijsten in `mask.ts` en de uitleg in de prompt. De kwaliteit meten we met `npm run eval:ai-mapping`.
- **Een gemeente in een eigen kolom** wordt gemaskeerd, want er is geen lijst met gemeenten. Dat kan later met de postcodelijst van bpost.
- **De route wijzigt zonder overgang.** Er waren geen gebruikers: geen MCP-tool en geen scherm.
