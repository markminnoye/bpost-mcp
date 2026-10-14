# ADR 0010: De modus kiezen per mailing

## Status

Accepted (Mark, 13/10/2026). Ontwerp: `.agent/plans/2026-10-13-adrescontrole-indienen-design.md`, besluiten 4 en 14–17.

## Context

`FORCE_TEST_MODE` in `src/core/masspost/build-request.ts` zet elk verzoek in Test (`T`). Enkel het script `generate:mailing-xml` mocht het openen met `allowNonTestMode`. De webapp gaat nu zelf mailings indienen, ook echt.

## Decision

- **Een controle (`MailingCheck`) gaat altijd in Test.** Een controle maakt niets aan bij e-MassPost.
- **De modus is een gegeven van de mailing:** Test (`T`), Certificatie (`C`) of Productie (`P`), gekozen in stap 1 ("Modus"). Een nieuwe mailing krijgt de standaard uit Instellingen → Standaardwaarden; die is Productie, en een account kan ze op Test zetten.
- **Geen bevestiging bij het indienen.** De modus staat bij de mailing (een pill bij Test of Certificatie).
- **De webapp zet `allowNonTestMode` enkel voor de `MailingCreate` van die mailing**, met haar modus. Geen HTTP-route en geen ander deel van de webapp zet het.
- **Na een geslaagde indiening, in elke modus, kan de mailing niet meer gewijzigd worden.**
- **Geen grens van 200 adressen in Test:** een test met meer dan 500 adressen werkte (Mark, 13/10).

## Consequences

- Productie is de standaard en er is geen bevestiging: wie wil testen, zet de modus (of de standaard van de account) op Test.
- `FORCE_TEST_MODE` blijft voor de rest van de code.
- De modus komt in `mailing.json` (optioneel veld, `schemaVersion` blijft 1) en in de standaardwaarden van de tenant (een kolom in `tenant_preferences`).
