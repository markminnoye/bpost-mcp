# ADR 0009: Een tenant is een Google Workspace-domein

## Status

Accepted (Mark, 11/10/2026).

## Context

**Vandaag** mag iedereen met een Google-account aanmelden. Elke nieuwe gebruiker krijgt automatisch een eigen tenant ("<naam>'s Tenant", `src/lib/auth.ts`).

**Met de opslag op een Gedeelde drive** (ADR 0007) moet de app weten bij welke organisatie iemand hoort. Die organisatie heeft één set instellingen: bpost-gegevens, de Drive-map en de standaardwaarden. Sonic Rocket test op het eigen domein `sonicrocket.be`, Contrapunt werkt op het hare.

**Opties die we niet namen:**
- **Elk domein mag zichzelf aanmelden:** te open tijdens de alfa.
- **Een uitnodigingslijst per tenant:** elke nieuwe collega moet met de hand toegevoegd worden.
- **Losse extra adressen per tenant, met een tenantwissel:** het tweede domein moet dan zijn Drive extern delen.

## Decision

- **Een tenant hoort bij precies één Workspace-domein** (`tenants.domain`, uniek).
- **Sonic Rocket voegt domeinen toe** met `npm run tenant:add`.
- **Bij het aanmelden moet Google een Workspace-domein meegeven** (`hd`), en dat domein moet bij een tenant horen. Anders volgt "Geen toegang". Een gewoon Gmail-adres komt dus niet binnen.
- **Een account hoort bij één tenant.** Er is geen tenantwissel.
- **Tenants worden niet meer automatisch aangemaakt.**
- **Links bovenaan staan de naam van de tenant en het favicon van het domein**, met de beginletter als terugval.

## Consequences

- Testen bij Contrapunt vraagt een Contrapunt-account met toegang tot hun Gedeelde drive.
- De huidige tenant van Mark krijgt het domein `sonicrocket.be`. Gebruikers in een tenant zonder domein verliezen de toegang.
- Wie een organisatie wil toevoegen, gaat langs Sonic Rocket. Een beheerscherm voor tenants kan later.
- Rollen binnen een tenant (beheerder of gebruiker) zijn er nog niet: elke gebruiker van het domein mag alles.
