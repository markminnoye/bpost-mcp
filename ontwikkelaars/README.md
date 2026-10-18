# Overzicht

Deze repository is de MCP-dienst: de assistent, OAuth, de batch-upload en de pagina's om te koppelen. De mailings-webapp en de library `src/core/masspost/` staan in `e-masspost-webapp`.

| Onderdeel | Wat | Waar |
|---|---|---|
| **Website** | Landingspagina, installatie en referentie | [Website](website.md) |
| **HTTP-API** | Routes voor upload, OAuth en gezondheid | [API-overzicht](api/overzicht.md) |
| **MCP** (alfa) | AI-assistent als interface | Tabblad Documentatie → MCP |

## Authenticatie per onderdeel

| Onderdeel | Hoe |
|---|---|
| Landingspagina en OAuth-aanmelding | Google-aanmelding (Auth.js), sessie |
| HTTP-API (upload) | Bearer-token **of** sessie |
| OAuth-routes en gezondheidsroutes | Geen |
| MCP | Bearer-token (OAuth 2.1 of app-token), scope `mcp:tools` |

## Code-kaart

| Pad | Inhoud |
|---|---|
| `src/app/` | Routes en pagina's (Next.js App Router) |
| `src/lib/` | Dienstcode: auth, OAuth, batch, config, MCP |
| `src/schemas/` | Zod-schema's van de bpost-bestanden |
| `scripts/` | Manifest, OpenAPI en het demo-tenant-script |

## In dit tabblad

- [Website](website.md) en [Architectuurmodellen](architectuurmodellen.md)
- [API-overzicht](api/overzicht.md), [HTTP-API](api/http-api.md) en de [OpenAPI-referentie](api/openapi.yaml)
- Beheer: [Hosting en omgevingsvariabelen](beheer/hosting-en-omgevingsvariabelen.md), [Releaseprocedure](beheer/release.md), [Documentatie beheren](beheer/documentatie.md)

Het bpost-protocol zelf staat in het tabblad **Naslag bpost**.
