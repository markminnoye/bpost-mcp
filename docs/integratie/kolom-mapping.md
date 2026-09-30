# Kolom-mapping

De library koppelt kolomtitels aan de ongestructureerde adresvelden van bpost (Comp 90, 91, 92, 93). Er wordt niets gesplitst: de gebruiker of de caller bepaalt welke kolommen in welk blok komen, en ze worden met een spatie samengevoegd.

| Blok | Comp | Kolommen (voorbeeld) |
|---|---|---|
| `name` | 90 | voornaam, familienaam |
| `companyDepartment` | 91 | bedrijf, afdeling (optioneel) |
| `streetHouseBox` | 92 | straat, huisnummer, bus |
| `postcodeCity` | 93 | postcode, gemeente |

Elk blok is maximaal 50 tekens (`UNSTRUCTURED_MAX_LENGTH`). Wat langer is, wordt afgekapt en gemeld als afkapping.

## Volgorde: heuristiek eerst, AI alleen bij twijfel

Bron: `suggestColumnMapping` in `src/core/masspost/suggest-mapping.ts`.

1. **Preset.** Bevat het bestand de titels van de Contrapunt-export (`presetId: "contrapunt-export"`, of zonder id als de titels overeenkomen), dan wordt die vaste koppeling gebruikt.
2. **Synoniemen.** Anders scoort een lijst van NL/FR/EN-synoniemen elke titel (bijvoorbeeld `voornaam`, `prenom`, `first name`). Accenten en hoofdletters tellen niet mee.
   - Een score vanaf 60 wordt toegewezen.
   - Vanaf 80 is de zekerheid `high`.
   - Liggen twee kandidaten binnen 10 punten, dan is het resultaat dubbelzinnig.
   - `localeHints` (`nl`, `fr`, `en`) geven een kleine voorkeur voor die taal.
3. **AI-fallback.** `needsAi` staat op `true` als een verplicht blok (`name`, `streetHouseBox`, `postcodeCity`) niet ingevuld raakt of de zekerheid `low` is. Alleen dan roept `POST /api/masspost/suggest-mapping` het model aan.

De uitkomst van de AI is ook een voorstel: de zekerheid is `medium` en de caller bevestigt altijd.

## Wat het model krijgt

Alleen de kolomtitels en `localeHints`, geen adresrijen. Het model mag alleen kolommen kiezen die in het bestand staan. Kiest het er een die niet bestaat, dan volgt `422`.

## Foutgedrag van de route

| Status | `code` | Wanneer |
|---|---|---|
| 503 | `ai_not_configured` | `MASSPOST_SUGGEST_MAPPING_MODEL` is niet ingesteld |
| 422 | `ai_invalid_output` | Het model koos een onbestaande kolom |
| 502 | `ai_failed` | De aanroep mislukte |

In alle drie de gevallen zit het heuristische resultaat in `suggestion`.

## Configuratie

| Variabele | Gebruik |
|---|---|
| `MASSPOST_SUGGEST_MAPPING_MODEL` | Model in de vorm `provider/model` (Vercel AI Gateway). Zonder waarde blijft de AI-stap dicht |
| `AI_GATEWAY_API_KEY` | Optioneel. Op Vercel kan OIDC gebruikt worden als die ontbreekt |

## Mapping in de MCP-pipeline

`apply_mapping_rules` gebruikt een andere koppeling: gestructureerde velden via aliassen (`lastName`, `street`, …). Zie [Comp-codes en aliassen](comp-codes.md).
