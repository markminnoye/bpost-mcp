# Changelog

Wat er nieuw, aangepast en opgelost is in deze webapp.

## \[Unreleased]

### Samenvatting

**Aanpassingen**

* **Volgorde van de velden bij het aanmaken en bewerken van een mailing.** De velden in het formulier van stap 1 (`DetailsForm`) staan nu in een logischere operatorvolgorde: Geplande afgiftedatum, Klant, Titel, Code, Formaat, Presortering, Ronde en sequentie, Prioriteit, Barcode, E-mail bij klaar, Modus.

### Changed

* Reordered fields in `DetailsForm` across the 3-column layout: scheduled delivery date, customer, title, code, format, presorting, round and sequence, priority, barcode, notification email, mode.

## \[0.7.1] - 2026-10-21

### Samenvatting

**Aanpassingen**

* **Aanmelden is alleen nog de sessiecookie.** `POST /api/masspost/suggest-mapping` accepteert geen bearer-JWT of `bpost_`-app-token meer. Afmelden wist de cookie; Firebase-refresh-tokens blijven geldig tot ze verlopen (ADR 0016).

**Oplossingen**

* **Build-id op Firebase App Hosting:** de korte commit in het profielmenu herkent App Hosting nu via `FIREBASE_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT` (en nog steeds `FIREBASE_CONFIG`), niet alleen via `FIREBASE_CONFIG`.

### Changed

* Session-only HTTP auth (ADR 0016): removed bearer JWT / `bpost_` lookup (`verify-token`, `jwt`, `extract-token`, `accepted-issuers`, `tenant/resolve`, `apiTokens`). `OAUTH_JWT_SECRET` and `AUTH_ACCEPTED_ISSUERS` dropped from `env.ts`, `.env.example` and `apphosting.yaml`. Sign-out still deletes `__session` only (no `revokeRefreshTokens`). Leftover Firestore collections `accounts`, `sessions`, `verificationTokens`, `apiTokens` may be deleted in the Firebase console. `.env.example` lists only site, seed and local library-script variables (no MCP/OAuth leftover).

### Fixed

* Profile-menu build id on App Hosting: detect the Cloud Build via `FIREBASE_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT` (and still `FIREBASE_CONFIG`), not `FIREBASE_CONFIG` alone (`next.config.ts`).

## \[0.7.0] - 2026-10-20

### Samenvatting

**Nieuw**

* **CSV als adreslijst** naast Excel en LibreOffice. Je sleept een `.csv` in hetzelfde vak. We herkennen het scheidingsteken (puntkomma, komma, tab of `|`) en de tekenset (UTF-8 of Windows). Het bestand voor de drukker blijft Excel. (Linear [SR-146](https://linear.app/sonicrocket/issue/SR-146/csv-als-invoer-naast-excel).)

**Aanpassingen**

* **Aanmelden via Firebase.** _Aanmelden met Google_ loopt nu via Firebase Authentication in plaats van Auth.js. Je account en je organisatie blijven; na de overstap meld je één keer opnieuw aan. Een sessie blijft 14 dagen geldig (ADR 0016).
* **De site draait op Firebase, niet meer op Vercel.** Hosting via Firebase App Hosting, gegevens in Cloud Firestore (project `e-masspost-webapp`). Testomgeving: `mailings.sonicrocket.app`; productie komt later op `mailings.contrapunt.be` (ADR 0014, ADR 0015).
* **Cijfers van e-MassPost bij de mailing.** Na een geslaagde controle of indiening bewaart het dossier, naast de ARR, ook het percentage presorteercodes en het percentage adressen met een naam.

**Oplossingen**

* **Modus in de XML van de adrescontrole.** Controle en indiening schrijven nu dezelfde modus als in stap 1.

## \[0.6.0] - 2026-10-19

### Samenvatting

**Nieuw**

* **Versie in het profielmenu**, organisatie-icoon, e-mail bij klaar, wie de mailing aanmaakte.

**Aanpassingen**

* MCP-restanten uit de webapp; Firebase/App Hosting-pad; mailingoverzicht en stappenbalk-verbeteringen.

***

Older releases (0.5.0 and earlier) remain in the repository `CHANGELOG.md`.
