# Releaseprocedure

Beschreven wat er vandaag in de repo staat. Een stap die nergens vastligt, staat onder "Niet vastgelegd".

## Branches

- `develop` is de integratielijn en blijft altijd bestaan.
- `main` is productie. Een push naar `main` deployt automatisch op Vercel.
- Wijzigingen lopen via een pull request naar `develop`.

## Voor elke commit

1. Werk `CHANGELOG.md` bij onder `## [Unreleased]` bij een wijziging die gebruikers of gedrag raakt. Structuur: een Nederlandse samenvatting (**Nieuw**, **Aanpassingen**, **Oplossingen**) en de Engelse secties Added, Changed, Fixed.
2. `npm run lint:fix`
3. `npx tsc --noEmit`
4. `npm test`
5. Na een wijziging aan publieke exports of routeschema's: `npm run docs:build`.

`npm run check:all` draait lint, typecontrole, tests en de controle op vastgecodeerde URL's.

## Wat CI controleert

De workflow *MCP CI* draait bij elke pull request en elke push naar `main`: lint, `tsc`, tests, `validate:server-manifest` en `docs:check`. `docs:check` faalt als `docs/library/` of `docs/service-api/openapi.yaml` achterloopt.

## Documentatie publiceren

Een push naar `develop` draait *Publish docs branch*. Die bouwt de docs en force-pusht de inhoud van `docs/` naar de branch `docs`. GitBook leest die branch via Git Sync. Zie [Documentatie](documentatie.md).

## Release

Afgeleid uit de opbouw van `CHANGELOG.md` (versiekoppen met datum). Dit is geen geautomatiseerde procedure.

1. Zet `## [Unreleased]` in `CHANGELOG.md` om naar een versiekop met datum en voeg een nieuwe lege `Unreleased` toe.
2. Verhoog `version` in `package.json`.
3. Merge naar `main`. Vercel deployt.
4. Controleer met `vercel inspect <url>` en `vercel logs <url> --level error`.

## Niet vastgelegd

- Er is geen geautomatiseerde release (geen versietag of GitHub Release uit CI).
- De MCP-registry-publicatie is een handmatige stub.
- Git-tags (`v1.0.1` … `v1.1.0`) en `package.json` (`0.4.0`) wijzen naar verschillende versiereeksen. Welke leidend is, moet nog beslist worden.
