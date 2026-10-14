# Contrapunt's AFT Converter (Frank) — referentie & analyse

*Ontvangen 28/09/2026, opgeslagen ter referentie. Auteur: Frank (Contrapunt), niet Sonic Rocket.*

Een werkende Windows-desktoptool (Python + tkinter) die Contrapunt vandaag zelf gebruikt om:

1. **Stap 1** — een ruwe klantenlijst (Excel) om te zetten naar een AFT-bestand voor de
   Address File Tool van e-MassPost, plús een `ORIGIN_<naam>.xlsx`-kopie (origineel + `SEQ`-kolom)
   die als lokale referentie dient.
2. **Stap 2** — het antwoordbestand dat bpost teruggeeft, via `SEQ` terug te koppelen aan het
   ORIGIN-bestand tot een `TPD_merged_<naam>.xlsx`.

Bestanden: [`aft_converter.py`](aft_converter.py) · [`install.bat`](install.bat) · [`start.bat`](start.bat)

## Waarom dit relevant is

Dit is **geen mockup** — het is een tool die vandaag in productie draait bij onze klant. Alles
erin is gevalideerd door de praktijk: wat bpost effectief aanvaardt, welke kolommen er echt toe
doen, en welke aannames uit onze eigen documentatie/plannen niet klopten.

## Kernbevindingen

### 1. Contrapunt gebruikt de **unstructured** velden, niet de structured

`AFT_TARGETS` mapt bronkolommen naar precies drie doelvelden:

| AFT-kolom (Frank) | Officiële AFT-kolom | Comp-code | Max lengte (doc) |
|---|---|---|---|
| `UNSTRUCTURED_NAME` | `NAME_UNSTRUCTURED` | **90** | 50 |
| `UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX` | `STREET_HOUSE_BUILDING_UNSTRUCTURED` | **92** | 50 |
| `UNSTRUCTURED_POST_CODE_CITY` | `POSTCODE_CITY_UNSTRUCTURED` | **93** | 50 |

Bron: `docs/internal/e-masspost/docs/schemas/address-file-tool.md`.

**Dit is de belangrijkste vondst.** Geen straat/huisnummer-splitsing, geen structured-field
mapping — gewoon vrije tekst samenvoegen (`build_value`, spatie-gescheiden) in drie blokken. Dat
is precies wat bpost toelaat (kolommen U/W/X in het sjabloon) en het omzeilt het hele
splitsingsprobleem dat het oude AFT-plan (26/09) als risico zag ("32 rijen splitsen niet
probleemloos"). Onze library neemt deze strategie over als eerste, eenvoudigste pad.

**Belangrijk voor onze XML-route:** Comp-codes 90/92/93 bestaan al letterlijk in onze eigen
`CompCodeSchema` (`src/schemas/mailing-request.ts`). AFT en de volledige `MailingRequest`-XML
delen hetzelfde datamodel (`Item/Comps/Comp[@code]`) — AFT is puur een vereenvoudigde
upload-wrapper errond. Onze Excel→XML-conversie voor vandaag kan dus dezelfde
kolom-naar-Comp-mapping gebruiken als Frank, maar rechtstreeks naar `Comp[code=90/92/93]`
i.p.v. naar AFT-kolommen — en zo de AFT-upload-stap (en zijn eigenaardigheden, zie punt 3)
volledig overslaan.

### 2. Silent truncation naar 42 tekens — geen waarschuwing aan gebruiker

`sanitize()` knipt elke waarde af op `MAX_CHARS = 42` zonder dit te tonen. De officiële max lengte
voor de unstructured velden is echter **50** (zie tabel doc). Twee dingen om te verbeteren in onze
versie:
- Niet stil afkappen — tonen wat wordt ingekort, zoals het oude plan al voorstelde.
- 42 is nodeloos conservatief; 50 is toegelaten. Nagaan of Frank een reden had (bv. praktijkervaring
  met afkeuring boven 42) voor we dit optrekken.

### 3. AFT-upload wil `.xls` (BIFF8), niet `.xlsx`

Code-commentaar: bpost's e-MassPost-upload weigerde `.xlsx`-bestanden van `openpyxl` — ontbrekende
metadata die Excel er zelf bij schrijft — tot ze manueel in Excel heropend en heropgeslagen
werden. Frank schrijft daarom met `xlwt` naar echt `.xls`.

**Dit corrigeert Beslissing #5 uit het oude plan** ("Enkel pipe-CSV schrijven, geen `.xls`"), die
op documentatie was gebaseerd zonder praktijktoets. Sterk argument om voor **stap ①-conversie
(indien we via AFT-upload zouden gaan) niet blind op CSV te vertrouwen. Voor onze eigen route
(directe `MailingRequest`-XML via HTTP/FTP) is dit probleem irrelevant: we bouwen zelf XML, geen
Excel/CSV die bpost's AFT-parser moet inlezen — dit hele bestandsformaat-mijnenveld vervalt.

### 4. Verplicht minimum van 500 adressen

`MIN_ROWS = 500`: is de lijst korter, dan vult de tool aan met een vast Contrapunt-adres
("P. Nollekensstraat 95, 3010 Kessel-Lo") tot 500 rijen. Dit staat nergens in onze schemas of
protocol-docs — commerciële/contractuele ondergrens (geen XSD-regel).

**Bevestigd 28/09/2026 (Frank, Contrapunt):** die 500-rijen-regel **geldt breder** dan we eerst
aanname (niet beperkt tot één specifiek contract). Onze library/webapp moet dit expliciet afhandelen
(waarschuwing of gecontroleerde opvulling); kleine smoke-tests (`--simple`, 1 adres) blijven nuttig
voor bestandsnaam/XML, maar zijn **geen** representatieve portal-acceptatie voor een echte mailing.

### 5. SEQ-round-trip is het officiële en enige koppelmechanisme

`SEQ` gaat mee de deur uit, komt exact zo terug in het antwoordbestand, en Frank koppelt via een
simpele Excel-join (`set_index("SEQ")`). Filler-rijen (`SEQ` > aantal echte adressen) worden bij de
merge genegeerd. Dit bevestigt 1-op-1 wat het oude plan al aannam voor stap ③ (`lees-antwoord`) —
goede validatie dat die aanpak klopt, nu concreet met echte kolomnamen: `MIDNUMBER`,
`PRESORTING_CODE`, `FEEDBACK`, `FIELDTOPRINT1-3`, `PRINTORDER`.

`FEEDBACK` wordt door Frank's tool niet geïnterpreteerd — puur doorgekopieerd. De inhoud (MID-codes
als tekst, gescheiden? formaat?) is dus nog steeds een open vraag (zie oude plan, punt A: een echt
antwoordbestand nodig).

### 6. UX-patroon: mapping met live preview, foutmeldingen in het Vlaams

`MappingDialog` laat de gebruiker kolommen aanvinken (meerdere = samenvoegen met spatie) en toont
meteen een preview van de eerste 4 rijen. Foutmeldingen zijn doordacht Nederlandstalig en leggen
oorzaak + oplossing uit (bv. ontbrekend `xlrd`-pakket). Dit is een goed patroon om over te nemen in
de webinterface: kolom-mapping met live preview, geen stille aannames.

## Wat dit betekent voor het lopende werk

Dit script is de **AFT-route** (Excel → bestand voor hándmatige upload via de e-MassPost-website).
De library die we vandaag bouwen kiest de **directe route**: Excel → gevalideerde `MailingRequest`
XML → automatisch versturen via HTTP of FTP, zonder tussenstop in de AFT-webinterface. Beide routes
delen hetzelfde onderliggende datamodel (Comp-codes 90/92/93 voor de unstructured aanpak), dus de
kolom-mapping-logica van Frank is rechtstreeks herbruikbaar; enkel de output-stap verschilt
(AFT-bestand vs. XML + transport-client).

Zie het bijgewerkte plan: `.agent/plans/2026-09-28-bpost-library-web-app.md`.
