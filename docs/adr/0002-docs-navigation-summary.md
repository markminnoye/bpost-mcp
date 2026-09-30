# ADR 0002: Docs-navigatie met SUMMARY.md voor twee doelgroepen

## Status

Accepted

## Context

Alles onder `docs/` wordt naar branch `docs` gepubliceerd en door GitBook gelezen. Zonder navigatiebestand bouwt GitBook de zijbalk uit de mapstructuur, en dan verschijnen ook `docs/internal/`, `docs/superpowers/` en `docs/samples/`. De lezers zijn eindgebruikers en integrators; beheer hoort bij de integrators.

## Decision

- `docs/SUMMARY.md` (handgeschreven) bepaalt de volgorde en zichtbaarheid. Pagina's die er niet in staan, horen niet in de zijbalk.
- Drie secties: Gebruiker (Vlaams, niet-technisch), Integratie en Beheer (hosting, release, documentatie, ADR's).
- `docs/internal/` blijft staan voor ontwikkelaars in de repo en staat niet in de navigatie. Geen uitsluitingsregel in de publicatie-workflow.
- Gegenereerde mappen (`docs/library/`, `docs/service-api/`) blijven ongewijzigd en worden alleen gelinkt.

## Consequences

`SUMMARY.md` moet bij elke nieuwe pagina bijgewerkt worden. Bestanden buiten de navigatie blijven wel op branch `docs` staan en zijn mogelijk nog via hun directe URL bereikbaar. Dat is alleen af te vangen met een uitsluitingsfilter in `publish-docs.yml`, wat we bewust niet doen.
