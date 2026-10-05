# Documentatie beheren

De documentatie staat in `docs/` en wordt door GitBook (Git Sync) gelezen. Er is geen aparte docs-app.

## Indeling

`docs/gitbook-docs.yaml` definieert één space die naar de hele map `docs/` wijst (gratis GitBook-plan: geen secties, geen tabbladen). `docs/SUMMARY.md` bepaalt wat er in de zijbalk staat. Alleen pagina's die in `SUMMARY.md` staan, zijn bereikbaar.

| Groep(en) in de zijbalk | Map | Inhoud |
|---|---|---|
| Documentatie | `docs/documentatie/` | Skill, webapp, MCP (handgeschreven, alfa) |
| Ontwikkelaars | `docs/ontwikkelaars/` | Alle technische info. Staat los van de rest en kan in één keer geschrapt worden |
| Naslag bpost | `docs/internal/e-masspost/docs/` | Submodule `bpost-e-masspost-skills`, dezelfde inhoud als de skill |
| Changelog | `docs/changelog/` | Kopie van `CHANGELOG.md`, gemaakt bij het publiceren |
| Projectdossier | `docs/projectdossier/` | Requirements, beslissingen, open vragen en architectuur (concept) |

Elke map heeft zijn eigen `SUMMARY.md`; die blijft de bron voor de volgorde binnen de map. In de root-`SUMMARY.md` staan dezelfde pagina's als groepen, met de mapnaam als voorvoegsel (`Naslag bpost: Flows`). Wijzig je een map-`SUMMARY.md`, werk dan ook de root-`SUMMARY.md` bij.

Pagina's buiten `docs/ontwikkelaars/` verwijzen niet naar `docs/ontwikkelaars/`. Relatieve links tussen groepen werken wel (het is één space), maar vermijd ze waar het kan, zodat een groep schrapbaar blijft.

Niet gepubliceerd: `docs/adr/`, `docs/install/`, `docs/internal/` (behalve de submodule), `docs/samples/`, `docs/superpowers/`, `docs/external/`. Ze staan niet in `SUMMARY.md` en zijn dus onzichtbaar op de site.

## Gegenereerd

| Pad | Bron | Script |
|---|---|---|
| `ontwikkelaars/library/` | TSDoc op `src/core/masspost/index.ts` | `npm run docs:code` |
| `ontwikkelaars/api/openapi.yaml` | Zod-schema's van de HTTP-routes | `npm run docs:api` |

Beide: `npm run docs:build`. `npm run docs:check` faalt als ze achterlopen. Al het andere is met de hand geschreven.

## Publiceren

Een push naar `develop` draait `.github/workflows/publish-docs.yml`. Die bouwt de docs, haalt de submodule op, kopieert `CHANGELOG.md` naar `docs/changelog/README.md` en force-pusht de inhoud van `docs/` naar de branch `docs`. Ze commit nooit terug naar `develop`. GitBook leest branch `docs` (project directory `/`, één space).

## Ontwikkelaars later schrappen

1. Verwijder de map `docs/ontwikkelaars/` en de groepen `Ontwikkelaars…` uit `docs/SUMMARY.md`.
2. Verwijder `docs:code`, `docs:api` en `docs:check` uit `package.json`, samen met `typedoc.json`, `scripts/generate-openapi.ts` en `scripts/check-generated-docs.mjs`, en de `docs:check`-stap in `.github/workflows/mcp-ci.yml`.
3. Pas de documentatiestandaard in `AGENTS.md` en `.cursor/rules/documentation.mdc` aan.

Zie ADR 0004 in `docs/adr/`.
