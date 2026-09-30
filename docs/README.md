# Documentatie

Drie referentie-mappen, plus de overige projectdocs. GitBook (Git Sync) of Mintlify, Redocly en Scalar lezen deze bestanden. Er is geen aparte docs-app.

## Mappen

```
docs/
├── README.md                 deze pagina
├── service-api/
│   └── openapi.yaml          OpenAPI 3.1 van de HTTP-service
├── library/                  TypeDoc-markdown van src/core/masspost
│   ├── README.md
│   ├── classes/
│   ├── functions/
│   ├── interfaces/
│   ├── type-aliases/
│   └── variables/
├── mcp/
│   └── README.md             MCP valt buiten de service-spec
├── adr/                      korte beslissingen
├── install/
├── internal/
├── samples/
└── superpowers/
```

`docs/service-api/` is de HTTP-service (health, upload, OAuth, install-prompt, …). `docs/library/` is de masspost-library. `docs/mcp/` is alleen de notitie dat MCP niet in die spec zit. De map `docs/api-reference/` bestaat niet meer.

## Vernieuwen

| Pad | Bron | Script |
|-----|------|--------|
| `library/` | TSDoc op de publieke library-entry | `npm run docs:code` |
| `service-api/openapi.yaml` | Zod-schema's van de HTTP-routes | `npm run docs:api` |

Beide: `npm run docs:build`. `npm run docs:check` faalt als `docs/library/` of `docs/service-api/openapi.yaml` achterloopt. `docs/mcp/README.md` is met de hand geschreven en hoort niet bij die check.

`/api/auth/[...nextauth]` staat in de spec als externe Auth.js-route, zonder request- of response-schema. MCP staat er niet in. De officiële MCP-URL is `/mcp`; `/api/mcp` blijft een legacy-alias. De verplaatsing zit in branch `refactor/mcp-route-at-root` (aparte draft-PR).

## GitBook

Op `main` liggen de bestanden onder `docs/`. Een push naar `main` draait `.github/workflows/publish-docs.yml`: die bouwt de docs en force-pusht **alleen** deze map naar branch `docs` (de root van die branch is de inhoud van `docs/`). De action commit nooit terug naar `main` en luistert niet naar branch `docs`, dus ze triggert zichzelf niet.

Git Sync: branch `docs`, content root `/`. Hetzelfde OpenAPI-bestand werkt in Redocly, Scalar en Mintlify. Pull requests blijven `docs:check` draaien in de gewone CI.
