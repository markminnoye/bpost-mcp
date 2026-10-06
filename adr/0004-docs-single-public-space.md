# ADR 0004: Eén publieke GitBook-space op het gratis plan

## Status

Accepted. Supersedes ADR 0003.

## Context

ADR 0003 gebruikte vier GitBook-secties (tabbladen). Secties zijn alleen beschikbaar in het Ultimate-plan. De proefperiode van de organisatie (Pro) eindigt op 11/10/2026; daarna valt de site terug op Basic. We willen geen betaald plan. Het gratis plan heeft één gebruiker, geen privé deellinks en geen toegangscontrole. Privé gedeelde inhoud voor het team is dus niet mogelijk op GitBook.

## Decision

- Eén publieke space voor de hele site. `docs/gitbook-docs.yaml` bevat één space met `content.directory: ./` (de map `docs/` van branch `docs`).
- `docs/SUMMARY.md` is de inhoudsopgave, met vijf families als groepen: Documentatie, Ontwikkelaars, Naslag bpost, Changelog en Projectdossier. Mappen met subgroepen krijgen hun mapnaam als voorvoegsel in de groepstitel.
- Het Projectdossier (`docs/projectdossier/`) is bewust publiek: het is een concept en wordt gesynchroniseerd naar dezelfde (publieke) repository.
- De regels uit ADR 0003 blijven gelden: technische info in `docs/ontwikkelaars/`, schrapbaar in één keer; pagina's elders verwijzen er niet naar; gegenereerde output staat daar.
- Wat privé moet blijven, staat niet in GitBook maar alleen in de repository, buiten `docs/`-publicatie (`docs/internal/`, `.agent/plans/`).

## Consequences

Relatieve links tussen groepen werken weer, maar blijven te vermijden naar Ontwikkelaars. Een nieuwe pagina moet in de root-`SUMMARY.md` én in de `SUMMARY.md` van haar map. Groepen kunnen later opnieuw in secties of spaces gesplitst worden als we upgraden. De site draait op één GitBook-gebruiker (de eigenaar); het team leest via de site of GitHub.
