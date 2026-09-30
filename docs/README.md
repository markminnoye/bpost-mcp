# Documentatie

Deze map is de bron voor GitBook via Git Sync, en voor andere readers (Mintlify, Redocly, Scalar). Er is hier geen aparte docs-site geconfigureerd.

## Inlezen

1. Koppel de Git-repository met Git Sync.
2. Zet de content root van de space op `docs/` (of sync de repo en wijs de space naar die map).
3. Markdown-pagina's worden gewone pagina's, inclusief `docs/adr/` en `docs/api-reference/library/`.
4. Voeg `docs/api-reference/openapi.yaml` toe als OpenAPI-referentie. Hetzelfde bestand is OpenAPI 3.1 en werkt ook in Redocly, Scalar en Mintlify.

## Wat gegenereerd is

| Pad | Bron | Vernieuwen |
|-----|------|------------|
| `api-reference/library/` | TSDoc op de publieke library-entry, via TypeDoc | `npm run docs:code` |
| `api-reference/openapi.yaml` | Zod-schema's die een route-handler effectief parset | `npm run docs:api` |

Beide: `npm run docs:build`. Commit het resultaat. `npm run docs:check` faalt als die map niet meer klopt met de bron.

## OpenAPI dekt alleen routes met een Zod-schema

`POST /oauth/register` staat in de spec (`RegisterRequestSchema`). Deze routes hebben geen Zod-schema en zijn daarom niet gegenereerd:

- `POST /api/batches/upload` (multipart)
- `GET /api/install/prompt` (Markdown-body)
- `GET` en `POST /api/auth/[...nextauth]` (NextAuth)
- `GET /health`, `GET /ready`, `GET /version`
- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/oauth-protected-resource`
- `GET /oauth/authorize`
- `POST /oauth/token`

`/api/mcp` hoort niet in deze spec. Een nieuwe route krijgt eerst een goedgekeurd Zod-contract, daarna een `registerPath` in `scripts/generate-openapi.ts`.
