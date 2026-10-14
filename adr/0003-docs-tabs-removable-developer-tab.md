# ADR 0003: GitBook-tabbladen, met technische info in één schrapbare tab

## Status

Superseded by ADR 0004 (het gratis GitBook-plan ondersteunt geen secties).

## Context

De site, de MCP-service en de API worden nog gebouwd. Wat al af is: de skill, het bpost-protocolnaslagwerk (submodule `docs/internal/e-masspost/`) en de communicatie met bpost (library, Zod, XML, transport). Alle technische informatie moet later uit deze GitBook-site kunnen verdwijnen. Eén space met een handgeschreven `SUMMARY.md` (ADR 0002) liet het protocol buiten de site en maakte schrappen lastig.

## Decision

- `docs/gitbook-docs.yaml` definieert vier tabbladen (GitBook-secties), elk met één space:
  - **Documentatie** (`docs/documentatie/`): skill, webapp, MCP. Handgeschreven, alfa.
  - **Ontwikkelaars** (`docs/ontwikkelaars/`): alle technische info (API, OpenAPI, library, Zod/bpost-communicatie, hosting, release). Staat los van de rest en kan in één keer geschrapt worden.
  - **Naslag bpost** (`docs/internal/e-masspost/docs/`): de submodule, dezelfde inhoud als de skill.
  - **Changelog** (`docs/changelog/`): kopie van `CHANGELOG.md`, gemaakt bij het publiceren.
- Pagina's in de andere tabs verwijzen niet naar Ontwikkelaars.
- Gegenereerde output staat in Ontwikkelaars: `docs/ontwikkelaars/library/` en `docs/ontwikkelaars/api/openapi.yaml`.
- Onderdelen in opbouw krijgen één landingspagina met status, geen lege pagina's.
- ADR's, `docs/install/`, `docs/samples/` en de rest van `docs/internal/` krijgen geen tab.

## Consequences

Links tussen tabs zijn geen relatieve links; verwijzingen zijn tekst. `publish-docs.yml` haalt de submodule op en kopieert `CHANGELOG.md`. Ontwikkelaars schrappen betekent: de map en de sectie verwijderen, plus de generatiescripts, `docs:check` en de documentatiestandaard in `AGENTS.md` aanpassen (stappen in `docs/ontwikkelaars/beheer/documentatie.md`). Overschakelen naar een site met secties kan een eenmalige handeling in GitBook vragen en wijzigt URL's.
