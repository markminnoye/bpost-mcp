# Adrescontrole en indienen via de brievenbus (ontwerp)

*Sonic Rocket · 13 oktober 2026 · status: spec goedgekeurd door Mark (13/10), bijgewerkt na de schetsronde (besluiten 14–23, schets v4.6); deel A+B gebouwd (14/10), wacht op review en testronde e-MassPost; deel 3 en 4 hieronder gelden waar ze niet in strijd zijn met 14–23; implementatieplan: [2026-10-13-adrescontrole-indienen-implementatie.md](2026-10-13-adrescontrole-indienen-implementatie.md)*

Linear: [SR-130](https://linear.app/sonicrocket/issue/SR-130/adrescontrole-en-indienen-via-de-brievenbus-stap-4). Stap 4 van de webapp (SR-112 v1): de adrescontrole met OptiAddress (`MailingCheck`) en het indienen (`MailingCreate`), via de "brievenbus" uit [2026-10-12-sr-112-v1-design.md](2026-10-12-sr-112-v1-design.md). Ontwerp van het scherm: [`docs/ontwerp/webapp/adrescontrole.html`](../../docs/ontwerp/webapp/adrescontrole.html).

## Besluitenlog (Mark, 13/10)

| # | Besluit | Alternatieven | Waarom |
|---|---|---|---|
| 1 | **Enkel de XML-weg** (OptiAddress `MailingCheck`). AFT (SR-80) valt buiten de scope en de MVP; de AFT-export wordt uitgeschakeld (deel 3). | XML en AFT-antwoord · eerst AFT | Pad van 29/09; enkel OptiAddress geeft voorstellen (`7001`) en de ARR. |
| 2 | **Eén spec voor adrescontrole en indienen**, gebouwd in twee delen (eerst de adrescontrole). | enkel adrescontrole | Hetzelfde mechanisme (XML eruit, antwoord erin) twee keer gebruikt. |
| 3 | **Wijzigen tijdens het wachten mag, zonder slot.** Het antwoord koppelt per `seq`; na een wijziging toont stap 4 "Je wijzigde de lijst na het versturen · Opnieuw controleren". | alleen-lezen · wijziging wist het wachten | Het antwoord blijft bruikbaar. |
| 4 | **Modus per mailing bij het indienen:** Test (`T`), Certificatie (`C`) of Productie (`P`), met een bevestiging bij `C` en `P`. De webapp mag `FORCE_TEST_MODE` openen, enkel via die keuze. | alles in `T` · modus per tenant | Bewuste keuze per mailing. *(vervangen door 14, 15)* |
| 5 | **Geen grens van 200 adressen in `T`:** Mark testte `T` met meer dan 500 adressen en dat werkte. Toe te voegen aan `field-findings.md` in de skills-repo. | – | Feit (Mark, 13/10). |
| 6 | **Corrigeren met de voorstellen van OptiAddress**, met de bron bij elk voorstel ("OptiAddress"). Later andere bronnen (postcode.eu, de bpost Address Validation Webservice in `docs/internal/e-masspost/reference/bpost_Address_Formatting_and_Validation_API_Manual_v1.7/`), nog uit te zoeken. | postcode.eu nu · gratis alternatief | Starten met wat bpost geeft; een voorstel krijgt een `source`. |
| 7 | **Na het indienen:** Mail ID's per rij bewaren en meegeven in het bestand voor de drukker (barcode en adres zoals aangekondigd, besluit 45 en 48 van 02/10). | enkel status · apart barcodebestand | Zonder barcodes kan de drukker niet drukken. |
| 8 | **Indienen staat in stap 4**, als laatste blok onder de adrescontrole. | vijfde stap | Keuze Mark. *(vervangen door 16)* |
| 9 | **Bouwen voor de eindsituatie** (Drive en een script): "Controleren bij bpost" en "Indienen bij bpost" zetten de XML in de brievenbus; de app verwerkt een antwoord **vanzelf**. De manuele versie is enkel een tijdelijk blok in de wachttoestand (XML opnieuw opslaan, antwoord opladen). | eigen manuele schermen | Later zo weinig mogelijk aanpassen. |
| 10 | **De XML wordt in de browser gemaakt.** De server geeft enkel de bpost-nummers van de tenant (PRS, account-ID, MID-versie), geen wachtwoord, geen adressen. | op de server · gemengd | Adressen gaan niet langs onze server (ADR 0007). |
| 11 | **Brievenbus als plug-in:** in de code een lijst met soorten brievenbus. In Instellingen een blok "Verbinding met bpost": "Manueel" gekozen, "Google Drive" grijs met "binnenkort". Geen databasekolom tot er een tweede brievenbus werkt. | meteen een instelling per tenant · ook FTP via onze server tonen | Eenvoudig; een keuze in de database pas als er iets te kiezen valt. |
| 12 | **Elke modus geeft "Ingediend"**, met een pill "Test" of "Certificatie" bij de mailing. Opnieuw indienen blijft mogelijk (bv. na Test in Productie). | enkel Productie geeft Ingediend | Keuze Mark. *(vervangen door 17)* |
| 13 | **Eigen Linear-issue** "Adrescontrole en indienen via de brievenbus" onder SR-78; SR-80 krijgt een notitie dat AFT buiten de MVP valt. | verder onder SR-80 | SR-80 gaat over AFT. |
| 14 | **Modus in stap 1**, veld "Modus" bij de gegevens van de mailing, met de standaard uit Instellingen → Standaardwaarden ("Modus", standaard **Productie**). Zo kan een hele account op Test. | modus bij het indienen | Mark, 13/10 (schetsronde). |
| 15 | **Geen bevestiging bij het indienen**, ook geen aparte knoptekst of tooltip. | bevestiging bij `C`/`P` · enkel bij `P` | Mark, 13/10. |
| 16 | **Indienen is een knop bovenaan de pagina**, naast "Opnieuw controleren" (wit, altijd actief); "Indienen bij e-MassPost" is actief vanaf 96 %. Geen blok Indienen onderaan. | blok onderaan stap 4 | Mark, 13/10. |
| 17 | **Na een geslaagde indiening, in elke modus (T, C, P), kan er niets meer gewijzigd worden.** Stap 4 toont enkel "Ingediend · … Mail ID's" en het bestand voor de drukker. | opnieuw indienen na Test | Mark, 13/10. |
| 18 | **Het bestand voor de drukker enkel na een geslaagde indiening**, in een kader "Voor de drukker". | ook vóór het indienen, zonder Mail ID | Mark, 13/10. |
| 19 | **"Nog niet gecontroleerd" en "Wachten" zijn één scherm** met Uitgaand (naar e-MassPost) en Inkomend (van e-MassPost). Manueel: open; Google Drive: ingeklapt onder "Bestanden van en naar e-MassPost · enkel nodig als er iets misloopt". Geen voortgangsregel. | twee schermen | Mark, 13/10. |
| 20 | **Kleuren van de ARR:** statusicoon, ARR-kaart en balkje: geel onder 96 %, groen vanaf 96 %. De ARR-pill is neutraal met een oranje bolletje (< 96 %), een groen bolletje (96–98 %) of een gouden ster (≥ 98 %). Op de ARR-kaart wordt het eindpunt (ook de fantoomlijn) een gouden ster vanaf 98 %; tooltips bij de streepjes van 96 en 98 %. | rood/oranje/groen | Mark, 13/10. |
| 21 | **Balkje onder stap 4:** de (geschatte) ARR van 90 % (leeg) tot 96 % (vol), geel/groen zoals 20. | aandeel afgehandelde adressen · ARR/96 | Mark, 13/10. |
| 22 | **Stap 4 in de stijl van de Formaatvalidatie:** geen eigen titel, uitleg en hulpregel, kolomkoppen, groepskop met pill "open" of "(zichtbaar)/open", "Alles overnemen", envelop-iconen om uit te sluiten; een groep klapt dicht als alles in orde is. "Pas het adres aan" en "Kies uit N adressen" zijn gewone tekst. | eigen opmaak (v2) | Mark, 13/10. |
| 23 | **In de interface "e-MassPost" in plaats van "bpost"** waar het over de dienst gaat (knoppen, uitleg, Instellingen). | bpost | Mark, 13/10. |

## Ontwerp

### 1. Library (goedgekeurd 13/10)

In `src/core/masspost/`, draait in de browser.

- **Brievenbus** (`mailbox/`): interface `Mailbox` met `send(fileName, xml)` en `responses()`. Nu `ManualMailbox` (versturen = download, antwoorden = wat de gebruiker oplaadt); later `DriveMailbox`.
- **Verzoeken:** `buildMailingCheckRequest`, `buildMailingRequest`, `buildMailingRequestFileName` (bestaan). Nieuw: items maken uit een mailing (rijen, correcties, uitsluitingen; uitgesloten rijen niet mee; `seq` = rijnummer; het verbeterde adres). De modus wordt een verplichte parameter. `mailingRef`: per controle uniek (max. 20 tekens, bv. `<code>-C<n>` als dat past, anders een korte variant); bij de eerste indiening de code van de mailing, bij een volgende `<code>-2`, `-3` …
- **Antwoorden inlezen** (`parse-response.ts`), getest op `docs/samples/contrapunt/bpost-roundtrip/`: `parseAck`, `parseCheckResponse` (bestandsnaam van het verzoek, `mailingRef`, status 100/998/999, ARR `MID-4040`, per `seq` de codes en voorstellen met `source: 'OptiAddress'`; `7001` en `MID-7001`), `parseCreateResponse` (plus Mail ID per `seq`, `MID-4030` `midNum`), `classifyResponse`.
- **Toepassen:** `matchResponse` (op de bestandsnaam in `RequestProps`/`FileReceived`), `groupCheckResult` (de groepen van `adrescontrole.html`; enkel hoofdletters = in orde, besluit 37 van 02/10).

### 2. Gegevens bij de mailing (goedgekeurd 13/10)

De bestanden zijn de bron; `mailing.json` houdt het logboek en een samenvatting bij.

- **Bestanden bij de mailing** (nu IndexedDB, later de map op Drive): `e-masspost/` met elk verzoek (`…_0RQ.XML`) en elk antwoord (`_1AK`, `_2RS`). Met Drive kopieert het script naar `_io/responses/`; de app verplaatst een antwoord daarna naar `e-masspost/` van de mailing. `MailingStore` krijgt `saveFile`, `getFile` en `listFiles` per mailing (IndexedDB-upgrade). De naam is `e-masspost/`, niet `bpost/` (Mark, 13/10: verwarrend).
- **`mailing.json`**, optionele velden (`schemaVersion` blijft 1):
  - `exchanges`: per verzoek de soort (`check`/`create`), bestandsnaam, `mailingRef`, modus, aantal adressen, verstuurd op en door, een vingerafdruk van de verstuurde adressen (wijziging na versturen, besluit 3), en de stand: verstuurd → ontvangen → verwerkt, of geweigerd (code).
  - `counts`: aantallen per groep van de laatste controle. `arr` bestaat al.
  - Resultaten per adres (codes, voorstellen, Mail ID's) niet in `mailing.json`: de app leest ze bij het openen uit het antwoordbestand.
- **Correcties uit stap 4** in dezelfde `corrections` en `excludedRows` als stap 3.
- **Status:** wachten volgt uit de laatste `exchange` (samenvatting `waiting`, icoon wachten). `checked` na een verwerkt controleantwoord; `submitted` na een aanvaard indienen (100), in elke modus; de modus staat bij de `exchange` en wordt een pill (Test, Certificatie). Geweigerd (998/999) blijft `checked`.

### 3. Het scherm van stap 4 (goedgekeurd 13/10)

Opbouw zoals de andere stappen: titel "Adrescontrole" met uitleg, de hoofdknop rechts op de lijn van de titel (`StepAction`), de pills (adressen die meegaan, ARR) rechts op de lijn van de stappen.

| Toestand | Hoofdknop | Inhoud |
|---|---|---|
| Nog niet gecontroleerd | **Controleren bij bpost** | "bpost kijkt elk adres na en stelt verbeteringen voor." |
| Wachten op bpost | uit, wieltje, "Wachten op bpost" | De stand (✓ Verstuurd 14:05 · 789 adressen → Ontvangen door bpost → Antwoord) en het tijdelijke manuele blok: ① XML opnieuw opslaan ② sleepvak "Antwoord van bpost". Statusicoon: wachten. |
| Antwoord verwerkt, onder 96 % | **Opnieuw controleren** | Het resultaat (hieronder). |
| Antwoord verwerkt, vanaf 96 % | **Indienen bij bpost** (springt naar het blok Indienen, deel 4) | Idem; Opnieuw controleren als gewone knop naast de ARR. |

- **Resultaat** zoals `adrescontrole.html`: de ARR-balk met de grenzen 96 en 98 % en de fantoomlijn (besluit 39 van 02/10); de groepen geen adres, meerdere adressen, voorstel van bpost, opmerking zonder voorstel, in orde.
- **Voorstellen:** het adresveld krijgt een keuzelijst met de voorgestelde adressen; elke optie toont het adres en klein de bron (**OptiAddress**). Bij "meerdere adressen" de kandidaten van bpost (als ze in het antwoord staan, anders zelf invullen); bij "voorstel van bpost" ook naast het veld met ↵. Later komen andere bronnen in dezelfde keuzelijst.
- **Corrigeren** met de componenten en toetsen van de formaatvalidatie (Enter, E, Esc, X, ⌘Z, Alles overnemen).
- **Wijziging na versturen:** één regel boven de groepen, "Je wijzigde de lijst na het versturen · Opnieuw controleren".
- **Stappenbalk:** het balkje onder stap 4 is geel zolang er niet gecontroleerd is of de ARR onder 96 % ligt; groen vanaf 96 %.
- **AFT-export: uitgeschakeld** (Mark, 13/10: geen deel van de MVP). Grijs en niet klikbaar, ook in het menu "…" van het overzicht; de code blijft. Het bestand voor de drukker verhuist naar het blok Indienen.
- **Eerst het ontwerp:** `adrescontrole.html` bijwerken met de toestanden "nog niet gecontroleerd", "wachten" (met het manuele blok) en het blok Indienen; Mark keurt goed voor het scherm gebouwd wordt.

### 4. Indienen en het bestand voor de drukker (goedgekeurd 13/10)

**Het blok Indienen**, onderaan in stap 4, verschijnt na een controle en is actief vanaf 96 % (besluit 1 en 38 van 02/10).

- **Samenvatting:** adressen die meegaan, afgiftedatum, formaat, prioriteit, barcode, met "Aanpassen in stap 1".
- **Waarschuwingen (niet blokkerend):** 96–98 % ("Vanaf 98 % krijg je extra korting"); adressen zonder oplossing ("Nog N adressen zonder oplossing gaan mee zoals ze zijn, of sluit ze uit"); lijst gewijzigd na de laatste controle.
- **Blokkerend:** afgiftedatum voorbij of geen werkdag ("Pas de afgiftedatum aan in stap 1").
- **Modus:** Test (standaard), Certificatie of Productie. Bij `C` en `P` eerst een bevestiging ("Je dient deze mailing in bij bpost in productie. [Indienen] [Annuleren]").
- **Indienen bij bpost:** `MailingCreate` via de brievenbus, daarna dezelfde wachttoestand als bij de controle. `mailingRef` zie deel 1.
- **Antwoord:** status 100 → Ingediend (besluit 12), met de modus, het aantal aanvaarde adressen, het aantal Mail ID's, de ARR en de adressen met een melding van bpost. 998/999 → de meldingen in gewone taal; corrigeren en opnieuw indienen kan.
- **Na een indiening** blijft het blok bruikbaar voor een nieuwe indiening (bv. na Test in Productie).

**Het bestand voor de drukker** (`buildPrinterExport`) staat in dit blok en blijft in het menu "…" van het overzicht. Na het indienen komen de kolommen **Mail ID** en **adres zoals aangekondigd** erbij (besluit 45 en 48 van 02/10); ervoor blijven ze leeg. Mail ID's uit Test of Certificatie krijgen de vermelding "TEST, niet drukken".

### 5. Fouten, testen en documentatie (goedgekeurd 13/10)

**Fouten** (Vlaams, met één volgende stap):

| Wat | Melding |
|---|---|
| Geen antwoord van bpost | "Dit is geen antwoord van bpost. Kies het XML-bestand dat eindigt op _2RS of _1AK." |
| Antwoord van een andere mailing | "Dit antwoord hoort bij een andere mailing (CP-2026-14)." Niet bewaard. |
| Antwoord van een vorige controle | Bewaard, niet gebruikt: "Dit antwoord hoort bij een vorige controle; we tonen het nieuwste." |
| Hetzelfde antwoord twee keer | Niets, geen melding. |
| bpost weigert (fout in `_1AK`, `FATAL`, 998/999) | De meldingen in gewone taal met de code; "Opnieuw controleren" of "Opnieuw indienen". |
| bpost-gegevens ontbreken | "Vul eerst je klantnummer en account-ID in bij Instellingen." met een link. |
| Onbekende code | De code met "Onbekende melding van bpost"; notitie voor `field-findings.md`. |

**Testen:**
- **Library (Vitest):** parsers op `docs/samples/contrapunt/bpost-roundtrip/`; `matchResponse`, `groupCheckResult`, items uit een mailing (uitsluitingen, correcties, `seq`), `mailingRef`, de modusparameter; `ManualMailbox`; de bestandsfuncties in de contracttest van de store (geheugen en IndexedDB).
- **`MID-4010` en `MID-4020`:** synthetische testbestanden, als zodanig gemarkeerd (geen echte voorbeelden). Later aanvullen met een echte controle van de lijst van Contrapunt.
- **Componenttests** voor de toestanden van stap 4 (jsdom).
- **Preview:** een volledige ronde met bpost in Test: Mark laadt de XML op via het portaal, de app verwerkt het antwoord.
- **DoD:** `npm run lint:fix`, `npx tsc --noEmit`, `npm test`, `npm run docs:build` en na de commit `npm run docs:check`.

**Documentatie:**
- `CHANGELOG.md`, TSDoc op de nieuwe exports.
- **ADR 0010:** de webapp mag `FORCE_TEST_MODE` openen via de keuze per mailing.
- `docs/documentatie/webapp/`: een pagina over de adrescontrole (ook in beide `SUMMARY.md`).
- Pull request in de skills-repo: `field-findings.md` (`T` met meer dan 500 adressen).
- Deze spec in `.agent/plans/INDEX.md`.
- De bpost-nummers via een server action (geen HTTP-route, dus geen OpenAPI-wijziging).

## Bouwvolgorde

Library eerst, dan de interface (AGENTS.md).

**Deel A, adrescontrole:**
1. `adrescontrole.html` bijwerken (nog niet gecontroleerd, wachten met het manuele blok, blok Indienen); akkoord van Mark.
2. Library: items uit een mailing, modusparameter (ADR 0010), `mailingRef`, parsers, `matchResponse`, `groupCheckResult`, `Mailbox` en `ManualMailbox`, bestanden in de store, `exchanges` in het schema.
3. Server action voor de bpost-nummers; blok "Verbinding met bpost" in Instellingen.
4. Stap 4: de toestanden, het resultaat met de groepen en de keuzelijst, corrigeren; AFT uitschakelen.
5. Ronde met bpost in Test.

**Deel B, indienen:**
6. Library: `parseCreateResponse`, Mail ID's, kolommen in `buildPrinterExport`.
7. Het blok Indienen met de modus en de bevestiging; status en pill.
8. Ronde met bpost in Test.

## Open punten

- Mag dezelfde `mailingRef` opnieuw in een andere modus (Test, daarna Productie)? Nu `<code>-2`; na te gaan bij bpost.
- Geeft bpost bij `MID-4020` de kandidaten mee in een `MailingCheck` (`Suggestions`, nooit live gezien)? Zo niet: zelf invullen.
- `copyRequestItem` blijft `Y` (het oorspronkelijke adres komt terug in het antwoord).
- Zaterdag als werkdag (open vraag uit de overdracht van 13/10) raakt de blokkering op de afgiftedatum.
