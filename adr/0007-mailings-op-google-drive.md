# ADR 0007: Mailings op de Gedeelde drive van de tenant

## Status

Accepted (Mark, 11/10/2026). Ontwerp: `.agent/plans/2026-10-11-sr-112-webapp-shell-design.md`.

## Context

De webapp krijgt een overzicht van alle mailings (SR-112). De POC bewaart niets, dus een mailing moet ergens blijven bestaan. De keuze tussen de architectuurmodellen stond nog open (`docs/ontwikkelaars/architectuurmodellen.md`, Q-004, DEC-005).

Opties die we niet namen:
- **Centraal model:** mailing en adressen in onze database.
- **Gesplitst model:** gegevens van de mailing in onze database, adressen in de browser.
- **IndexedDB:** enkel op één toestel, en Safari wist na 7 dagen.
- **Een Google Sheet of één JSON-bestand als register:** iemand kan het met de hand breken, en twee gelijktijdige wijzigingen overschrijven elkaar.

## Decision

- **Elke tenant kiest in Instellingen een Gedeelde drive en een hoofdmap.**
- **Per mailing komt er een map in die hoofdmap** (`<code> <titel>`), met:
  - `mailing.json`, met een Zod-schema en een versie;
  - de Excel;
  - `exports/`;
  - later de XML en de antwoorden van bpost.
- **Een samenvatting staat als `appProperties` op de map**, zodat één Drive-oproep de hele lijst geeft.
- **Elke keer dat de app bewaart, controleert ze een revisienummer** in `mailing.json`, zodat niemand ongemerkt het werk van een ander overschrijft.
- **De library krijgt `MailingStore`**, met `DriveMailingStore` en `MemoryMailingStore`, in `src/core/masspost/store/`.
- **Onze database bewaart geen mailings en geen adressen.** Ze blijft voor login, tenants, bpost-logingegevens en voorkeuren.

## Consequences

- **Toegang:** wie de gegevens mag zien, regelt de klant zelf in Drive. Dat is nodig voor de GDPR, en Sonic Rocket bewaart geen adressen.
- **Samenwerken:** een collega kan een mailing hervatten, op elk toestel, zolang hij toegang heeft tot de map.
- **Afhankelijkheid van Google:** de app hangt af van de Drive API, inclusief quota, de verificatie van de Drive-toestemming (ADR 0008) en storingen.
- **Bewaartermijn:** wissen na afronding moet in Drive gebeuren. Dat is nog open (Q-008).
- **Taken op de server:** wat op de server moet draaien zonder dat iemand de app open heeft (FTP naar bpost, antwoorden ophalen), heeft geen toegang tot Drive en krijgt de bestanden van de browser.
- **Gewijzigde besluiten:** de besluiten 15, 20, 27 en 28 van 02/10, die van een database uitgingen, gelden niet meer voor de opslag van mailings.
