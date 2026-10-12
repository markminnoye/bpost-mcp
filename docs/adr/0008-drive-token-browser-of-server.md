# ADR 0008: Het Drive-token: via de browser of via de server

## Status

Accepted, voorlopig (Mark, 11/10/2026). Na ervaring met de app herbekijken.

## Context

De browser praat rechtstreeks met de Google Drive API, met het Google-account van de gebruiker (ADR 0007). Daarvoor heeft de browser een access token met de Drive-toestemming nodig, en dat kan op twee manieren.

| | A. Via de browser (Google Identity Services) | B. Via de server (NextAuth) |
|---|---|---|
| Hoe | Aanmelden vraagt enkel naam en e-mail. De browser vraagt de Drive-toestemming zelf, in een Google-venster. | Aanmelden vraagt meteen ook de Drive-toestemming. De server bewaart de verversingssleutel versleuteld en geeft de browser telkens een token van 1 uur. |
| Onze server en Drive | Heeft nooit toegang | Kan met de verversingssleutel bij de Drive van de gebruiker |
| Gebruiker | Een tweede Google-venster de eerste keer, en na een uur soms opnieuw een klik | Eén toestemming, nooit een tweede venster |
| Bij een datalek bij ons | Geen Drive-sleutels | Verversingssleutels, versleuteld |
| Taken zonder gebruiker (bv. antwoorden van bpost verwerken) | Kunnen niet bij Drive | Kunnen bij Drive |

In beide gevallen staat het token in de browser, dus een XSS-lek geeft toegang zolang het token geldig is. De strikte Content-Security-Policy is de echte bescherming.

## Decision

- **We kiezen voorlopig A.** Google Identity Services vraagt de toestemming, met `login_hint` op het e-mailadres van de aangemelde gebruiker. Achteraf vergelijkt de app het Drive-account.
- **Het token staat in `sessionStorage`:** per tabblad, weg bij het sluiten, maximaal 1 uur geldig.
- **De store krijgt enkel een functie `getAccessToken()`.** Overschakelen naar B betekent die functie vervangen, niet de store.

## Consequences

- De lijst toont de eerste keer "Verbinden met Drive", want een browser opent een Google-venster enkel na een klik.
- Bij een verlopen token probeert de app eerst stil te verversen. Lukt dat niet, dan verschijnt de balk "Opnieuw verbinden", zonder werk te verliezen.
- Taken op de server kunnen niet zelf bij Drive. Wordt dat nodig (bv. antwoorden van bpost verwerken terwijl niemand de app open heeft), dan is B of een eigen opslag op de server te herbekijken.
- De toestemming `drive` is bij Google "beperkt". Voor een app over meerdere domeinen kan dat verificatie en een jaarlijkse audit vragen, in A en in B. `drive.file` volstaat niet: een gebruiker ziet dan de mailings van een collega niet. Dit is een open vraag in het ontwerp.
