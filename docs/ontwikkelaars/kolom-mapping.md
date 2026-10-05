# Kolom-mapping

De library koppelt kolomtitels aan de ongestructureerde adresvelden van bpost (Comp 90, 91, 92, 93). Er wordt niets gesplitst: de gebruiker of de caller bepaalt welke kolommen in welk blok komen, en ze worden met een spatie samengevoegd.

| Blok | Comp | Kolommen (voorbeeld) |
|---|---|---|
| `name` | 90 | voornaam, familienaam |
| `companyDepartment` | 91 | bedrijf, afdeling (optioneel) |
| `streetHouseBox` | 92 | straat, huisnummer, bus |
| `postcodeCity` | 93 | postcode, gemeente |
| `country` | 17 of 18 | land, als code of als naam (optioneel; niet voor België) |

Elk blok is maximaal 50 tekens (`UNSTRUCTURED_MAX_LENGTH`). Wat langer is, wordt afgekapt en gemeld als afkapping.

## Twee voorstellen: de regels, en op vraag AI

### De regels (library)

Bron: `suggestColumnMapping` in `src/core/masspost/suggest-mapping.ts`. Kijkt enkel naar de kolomtitels en draait ook in de browser.

1. **Preset.** Bevat het bestand de titels van de Address File Tool van bpost, dan wordt die vaste koppeling gebruikt en meldt het resultaat `preset: "aft"`. Er valt dan niets voor te stellen. Er is geen vaste export van Contrapunt: hun voorbeeldbestand gaat via de synoniemen.
2. **Synoniemen.** Anders scoort een lijst van NL/FR/EN-synoniemen elke titel (bijvoorbeeld `voornaam`, `prenom`, `first name`). Accenten en hoofdletters tellen niet mee.
   - Een score vanaf 60 wordt toegewezen.
   - Vanaf 80 is de zekerheid `high`.
   - Liggen twee kandidaten binnen 10 punten, dan is het resultaat dubbelzinnig.
   - `localeHints` (`nl`, `fr`, `en`) geven een kleine voorkeur voor die taal.
3. **`needsAi`** staat op `true` als een verplicht blok (`name`, `streetHouseBox`, `postcodeCity`) niet ingevuld raakt of de zekerheid `low` is. Het is een signaal voor de interface; de library roept zelf geen AI aan.

### Het AI-voorstel (route)

`POST /api/masspost/suggest-mapping` vraagt een model om een voorstel, enkel als de gebruiker erom vraagt (ADR 0006). Aanmelding is verplicht (bearer of sessie, met een gekoppeld account). Het model kiest per kolom een van zeven rollen: de vijf blokken hierboven, `context` (niet op de envelop, wel te zien bij het verbeteren) of `ignore`. Binnen een blok is de volgorde van de lijst de volgorde op de envelop, en die mag afwijken van de volgorde in het bestand. Het resultaat is een voorstel: de caller bevestigt altijd.

Bron: `suggestColumnRolesWithAi` in `src/lib/masspost/suggest-mapping-ai.ts`.

## Wat het model krijgt

Per kolom de titel, het aantal gevulde rijen (`filled`, naast `rowCount`) en tot 5 voorbeeldwaarden. De voorbeelden worden gemaskeerd met `maskValue` (`src/core/masspost/mask.ts`): de browser doet het voor het versturen, en `suggestColumnRolesWithAi` doet het opnieuw, wat de caller ook stuurt. `maskValue` is idempotent.

| Waarde | Naar het model | Regel |
|---|---|---|
| `Jan Peeters` | `Jxx Pxxxxxx` | Elk woord houdt de eerste letter; de rest wordt `X` (hoofdletter) of `x` |
| `Kerkstraat 12 bus 3` | `Kxxxstraat 12 bus 3` | Straatachtervoegsels, straattypes en `bus` blijven leesbaar |
| `1020 Brussel` | `1020 Brussel` | Postcode met gemeente in één waarde blijft leesbaar |
| `Brussel` | `Bxxxxxx` | Een gemeente zonder postcode niet (geen lijst met gemeenten) |
| `0475 12 34 56` | `9999 99 99 99` | Meer dan 6 cijfers per waarde: elk cijfer wordt `9` |
| `jan@telenet.be` | `jxx@txxxxxx.be` | De extensie van een e-mailadres blijft |
| `Peeters BV`, `Van de Velde`, `Dhr.`, `België` | `Pxxxxxx BV`, `Van de Vxxxx`, `Dhr.`, `België` | Rechtsvormen, tussenvoegsels, aansprekingen en landen blijven |

De voorbeelden staan per kolom gesorteerd, zodat voorbeelden van verschillende kolommen niet per rij aan elkaar te koppelen zijn. De instructies voor het model (`SUGGEST_MAPPING_INSTRUCTIONS`) leggen het masker uit en bevatten één uitgewerkt voorbeeld. Pas de trefwoordenlijsten in `mask.ts` en die uitleg samen aan.

## Wat het model teruggeeft

`{ mapping: { name, companyDepartment, streetHouseBox, postcodeCity, country }, context, ignore }`, elke kolom precies één keer. Zod kijkt het antwoord na. Een onbestaande of dubbel gebruikte kolom geeft `422`; een kolom die het model vergeet, komt onder `context`.

## Foutgedrag van de route

| Status | `code` | Wanneer |
|---|---|---|
| 400 | | Ongeldige JSON of body, bv. dubbele kolomtitels of meer dan 5 voorbeelden |
| 503 | `ai_not_configured` | `MASSPOST_SUGGEST_MAPPING_MODEL` is niet ingesteld |
| 422 | `ai_invalid_output` | Het model gaf geen geldig voorstel |
| 502 | `ai_failed` | De aanroep mislukte of duurde langer dan 20 s |

## Grenzen en logging

- Maximaal 100 kolommen, 5 voorbeelden per kolom en 200 tekens per waarde of titel.
- Per oproep: een time-out van 20 s, één nieuwe poging en een maximum aan uitvoertokens.
- Eén logregel per oproep (`[masspost/suggest-mapping]`) met het model, de duur, de tokens en de uitkomst (`ok`, `invalid_output`, `timeout`, `failed`), nooit met titels, voorbeelden of het antwoord. Een rate-limit van de gateway waarop de SDK te lang wacht, komt als `timeout` in de log en als `502` bij de caller.
- Nog geen limiet per tenant: nodig voor de route opengaat voor veel gebruikers.

## Configuratie

| Variabele | Gebruik |
|---|---|
| `MASSPOST_SUGGEST_MAPPING_MODEL` | Model in de vorm `provider/model` (Vercel AI Gateway). Zonder waarde blijft de AI-stap dicht. De keuze van aanbieder en regio is open vraag Q-007 |
| `AI_GATEWAY_API_KEY` | Optioneel. Op Vercel, of lokaal na `vercel env pull`, kan OIDC gebruikt worden als die ontbreekt |

## Kwaliteit meten

`npm run eval:ai-mapping -- --model=provider/model` vergelijkt het AI-voorstel met de regels op de evaluatieset: de Contrapunt-export, de AFT, de voorbeeldlijst van de POC en kleine lijsten met vreemde titels (`scripts/eval-ai-mapping.ts`). Het roept een echt model aan en hoort dus niet in CI. Met `--mask=no-initials` of `--mask=star` vergelijk je andere maskers, met `--verbose` zie je wat er verstuurd wordt, en `--pause=13000` blijft onder een limiet van 5 aanvragen per minuut. Eerste meting (06/10, `mistral/mistral-small`): de regels 20 van 25 adresvakken, het AI-voorstel 25 (zonder eerste letter 23, met sterretjes 22).

## Mapping in de MCP-pipeline

`apply_mapping_rules` gebruikt een andere koppeling: gestructureerde velden via aliassen (`lastName`, `street`, …). Zie [Comp-codes](comp-codes.md) en de pagina Mapping-aliassen in Documentatie → MCP.
