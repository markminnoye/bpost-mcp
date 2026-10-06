# Ontwerp

Schetsen en mock-ups van schermen die nog niet gebouwd zijn. Ze dienen als referentie bij het bouwen en om voor te leggen aan Contrapunt. Deze map wordt niet gepubliceerd op GitBook (ze staat niet in `docs/SUMMARY.md`), want GitBook toont geen HTML-pagina's. De repository is wel publiek: zet hier geen echte adressen of andere privégegevens.

## Webapp: flow voor mailings

Brainstorm van 2 oktober 2026. Het besluitenlog staat in [`.agent/plans/2026-10-02-masspost-web-flow-design.md`](../../.agent/plans/2026-10-02-masspost-web-flow-design.md). De diagrammen (flow en toestanden) staan als SVG in [`docs/ontwikkelaars/afbeeldingen/`](../ontwikkelaars/afbeeldingen/) en worden getoond op de ontwikkelaarspagina [Website](../ontwikkelaars/website.md).

| Schets | Wat |
|---|---|
| [formaatvalidatie.html](webapp/formaatvalidatie.html) | Stap 3: formaatfouten nakijken en bevestigen, met toetsenbord, undo en uitsluiten |
| [adrescontrole.html](webapp/adrescontrole.html) | Stap 4: score van bpost met fantoomlijn, adressen zonder of met meerdere treffers, voorstellen van bpost |
| [statusiconen.html](webapp/statusiconen.html) | De iconen per toestand, in licht en donker |

De schetsen zijn interactief en volgen de lichte of donkere modus van je systeem. Openen in je browser:

```bash
open docs/ontwerp/webapp/formaatvalidatie.html
```

De gegevens in de schetsen zijn verzonnen. De regels voor de controles zijn vereenvoudigd.
