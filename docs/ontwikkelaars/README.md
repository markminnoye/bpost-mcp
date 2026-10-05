# Overzicht

De dienst heeft vier onderdelen. De webapp staat centraal; de andere onderdelen praten met dezelfde kern.

| Onderdeel | Wat | Waar |
|---|---|---|
| **Website** | Webapp met aanmelding en dashboard | [Website](website.md) |
| **HTTP-API** | Routes voor upload, kolomvoorstel, OAuth en gezondheid | [API-overzicht](api/overzicht.md) |
| **Library** | `src/core/masspost/`: Excel, mapping, validatie, XML, transport | [Library](library.md) |
| **MCP** (alfa) | AI-assistent als interface | Tabblad Documentatie → MCP |

Bouwvolgorde: eerst de library en de API, daarna de interfaces erbovenop. Interfaces blijven dun en vervangbaar.

## Authenticatie per onderdeel

| Onderdeel | Hoe |
|---|---|
| Website | Google-aanmelding (Auth.js), sessie |
| HTTP-API (upload, kolomvoorstel) | Bearer-token **of** sessie |
| OAuth-routes en gezondheidsroutes | Geen |
| MCP | Bearer-token (OAuth 2.1 of app-token), scope `mcp:tools` |

## Code-kaart

| Pad | Inhoud |
|---|---|
| `src/app/` | Routes en pagina's (Next.js App Router) |
| `src/core/masspost/` | De library |
| `src/lib/` | Dienstcode: auth, OAuth, batch, config, MCP |
| `src/schemas/` | Zod-schema's van de bpost-bestanden |
| `scripts/` | Generatie en CLI-scripts |

## In dit tabblad

- [Website](website.md) en [Architectuurmodellen](architectuurmodellen.md)
- [API-overzicht](api/overzicht.md), [HTTP-API](api/http-api.md) en de [OpenAPI-referentie](api/openapi.yaml)
- [Library](library.md), [Kolom-mapping](kolom-mapping.md), [Comp-codes](comp-codes.md) en de [library-referentie](library/README.md)
- Beheer: [Hosting en omgevingsvariabelen](beheer/hosting-en-omgevingsvariabelen.md), [Releaseprocedure](beheer/release.md), [Documentatie beheren](beheer/documentatie.md)

Het bpost-protocol zelf staat in het tabblad **Naslag bpost**.
