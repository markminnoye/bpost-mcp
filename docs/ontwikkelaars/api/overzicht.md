# API-overzicht

Alle HTTP-routes van de dienst. De exacte request- en responsevormen staan in de [OpenAPI-referentie](openapi.yaml) (gegenereerd uit de Zod-schema's) en worden hier niet herhaald.

| Methode en pad | Doel | Authenticatie |
|---|---|---|
| `GET /health` | Levend | Geen |
| `GET /ready` | Gereed (database en Redis); `503` bij een fout | Geen |
| `GET /version` | Naam en versie | Geen |
| `POST /api/batches/upload` | CSV-bestand uploaden (multipart, veld `file`) | Bearer of sessie |
| `POST /api/masspost/suggest-mapping` | Kolomkoppeling voorstellen (heuristiek, AI als terugval) | Bearer of sessie |
| `GET /api/install/prompt` | Installatieprompt als Markdown | Geen |
| `GET /.well-known/oauth-authorization-server` | OAuth-metadata | Geen |
| `GET /.well-known/oauth-protected-resource` | Metadata van de beschermde resource | Geen |
| `POST /oauth/register` | OAuth-client registreren | Geen |
| `GET /oauth/authorize` | Autorisatiecode-flow starten (PKCE, `S256`) | Geen (toont aanmelding) |
| `POST /oauth/token` | Code of refresh-token inwisselen | Client-gegevens in de body |
| `/api/auth/*` | Auth.js | Door Auth.js beheerd |

MCP (`/mcp`) staat niet in deze lijst: zie Documentatie → MCP.

## Foutvorm

De routes antwoorden met JSON `{ "error": "…" }`. De OAuth-routes volgen het OAuth-formaat (`error`, `error_description`).

| Status | Betekenis |
|---|---|
| 400 | Ongeldige invoer |
| 401 | Geen, ongeldig of verlopen token of sessie |
| 403 | Account heeft geen tenant |
| 413 | Te veel rijen in de upload (maximum 1.000) |
| 422, 502, 503 | Alleen bij `suggest-mapping`, wanneer de AI-terugval mislukt |

## Nieuwe route toevoegen

Eerst het Zod-contract laten goedkeuren, dan implementeren, het schema registreren in `scripts/generate-openapi.ts` en `npm run docs:build` draaien.
