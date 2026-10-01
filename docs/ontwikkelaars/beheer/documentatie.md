# Documentatie beheren

De documentatie staat in `docs/` en wordt door GitBook (Git Sync) gelezen. Er is geen aparte docs-app.

## Tabbladen

`docs/gitbook-docs.yaml` definieert vier tabbladen (secties), elk met één space dat naar een map wijst. Een space ziet alleen zijn eigen map, met een eigen `README.md` en `SUMMARY.md`. Links tussen tabbladen kunnen dus niet relatief zijn.

| Tab | Map | Inhoud |
|---|---|---|
| Documentatie | `docs/documentatie/` | Skill, webapp, MCP (handgeschreven, alfa) |
| Ontwikkelaars | `docs/ontwikkelaars/` | Alle technische info. Staat los van de rest en kan in één keer geschrapt worden |
| Naslag bpost | `docs/internal/e-masspost/docs/` | Submodule `bpost-e-masspost-skills`, dezelfde inhoud als de skill |
| Changelog | `docs/changelog/` | Kopie van `CHANGELOG.md`, gemaakt bij het publiceren |

Pagina's in Documentatie, Naslag en Changelog verwijzen niet naar Ontwikkelaars.

Niet gepubliceerd in een tab: `docs/adr/`, `docs/install/`, `docs/internal/` (behalve de submodule), `docs/samples/`, `docs/superpowers/`, `docs/external/`.

## Gegenereerd

| Pad | Bron | Script |
|---|---|---|
| `ontwikkelaars/library/` | TSDoc op `src/core/masspost/index.ts` | `npm run docs:code` |
| `ontwikkelaars/api/openapi.yaml` | Zod-schema's van de HTTP-routes | `npm run docs:api` |

Beide: `npm run docs:build`. `npm run docs:check` faalt als ze achterlopen. Al het andere is met de hand geschreven.

## Publiceren

Een push naar `develop` draait `.github/workflows/publish-docs.yml`. Die bouwt de docs, haalt de submodule op, kopieert `CHANGELOG.md` naar `docs/changelog/README.md` en force-pusht de inhoud van `docs/` naar de branch `docs`. Ze commit nooit terug naar `develop`. GitBook leest branch `docs` (project directory `/`).

## Ontwikkelaars later schrappen

1. Verwijder de map `docs/ontwikkelaars/` en de sectie `ontwikkelaars` uit `docs/gitbook-docs.yaml`.
2. Verwijder `docs:code`, `docs:api` en `docs:check` uit `package.json`, samen met `typedoc.json`, `scripts/generate-openapi.ts` en `scripts/check-generated-docs.mjs`, en de `docs:check`-stap in `.github/workflows/mcp-ci.yml`.
3. Pas de documentatiestandaard in `AGENTS.md` en `.cursor/rules/documentation.mdc` aan.

Zie ADR 0003 in `docs/adr/`.
