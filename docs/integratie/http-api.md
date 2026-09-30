# HTTP-API

De HTTP-routes van de dienst staan in [`service-api/openapi.yaml`](../service-api/openapi.yaml) (OpenAPI 3.1). Dat bestand wordt gegenereerd uit de Zod-schema's. Pas het niet met de hand aan: wijzig het schema en draai `npm run docs:build`.

## Routes

| Route | Doel |
|---|---|
| `GET /health`, `GET /ready`, `GET /version` | Levend, gereed, versie |
| `POST /api/batches/upload` | CSV uploaden (multipart, veld `file`) |
| `POST /api/masspost/suggest-mapping` | Kolomkoppeling voorstellen, zie [Kolom-mapping](kolom-mapping.md) |
| `GET /api/install/prompt` | Installatieprompt als Markdown |
| `/.well-known/*`, `/oauth/*` | OAuth, zie [Authenticatie](authenticatie.md) |
| `/api/auth/*` | Auth.js (extern, niet beschreven) |

## Voorbeeld: kolomkoppeling voorstellen

```bash
curl -X POST "$BASE_URL/api/masspost/suggest-mapping" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"headers":["Voornaam","Familienaam","Straat","Huisnummer","Postcode","Gemeente"]}'
```

Het antwoord bevat `mapping`, `confidence`, `rationale`, `unmatchedHeaders`, `needsAi` en `source` (`heuristic` of `ai`).

## Niet in deze spec

MCP (`/mcp`). Zie [MCP-tools](mcp-tools.md).
