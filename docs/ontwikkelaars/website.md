# Website

De mailings-webapp (overzicht, flow, Instellingen, library) staat in de repository `e-masspost-webapp`. Deze dienst houdt de koppeling met een assistent.

## Pagina's

| Pad | Bestand | Wat |
|---|---|---|
| `/` | `src/app/page.tsx` | Uitleg. Zonder bpost-gegevens zegt de pagina dat je die in de mailings-toepassing invult. De OAuth-flow stuurt daarheen |
| `/install` | `src/app/install/page.tsx` | Installatie-instructies voor de assistent |
| `/reference` | `src/app/reference/page.tsx` | Statische pagina met tool- en instructieteksten (`src/generated/tool-registry.json`) |

`/mcp` is het MCP-eindpunt. `/oauth` en `/.well-known` zijn de OAuth-server. `POST /api/batches/upload` bewaart een CSV-batch.

## Wat hier niet meer staat

Mailings, archief, deposits, planning, Instellingen en `src/core/masspost/` horen bij de webapp. De databasekolommen die die app nog gebruikt blijven in `src/lib/db/schema.ts`, zodat een push ze niet verwijdert.
