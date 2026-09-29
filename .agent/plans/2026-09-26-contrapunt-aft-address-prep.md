# Adressen klaarmaken voor bpost — voorstel voor Contrapunt

*Sonic Rocket · september 2026 · ter bespreking*

## Status: Superseded (28/09/2026)

Vervangen door [`2026-09-28-bpost-library-web-app.md`](2026-09-28-bpost-library-web-app.md). De
strategische keuze hieronder ("lokaal-only, nooit koppelen met e-MassPost, nooit MCP") is bewust
omgekeerd: we bouwen nu een library + webapp die wél rechtstreeks via HTTP/FTP naar bpost
verstuurt. De inhoudelijke bevindingen hieronder (MID-codes, ARR-drempels, kolomdrift-waarschuwing,
OptiAddress-onderzoek) blijven geldige referentie en worden hergebruikt in het nieuwe plan.

---

## 1. Wat we willen bereiken

Jullie vertrekken van een klantenlijst en moeten daar een adressenbestand van maken dat bpost
herkent. Minstens 96%, want daaronder mag je niet opladen. Vanaf 98% komt de Data
Quality-korting van 0,5% erbovenop.

Vandaag gebeurt dat met de hand, en je weet pas of het gelukt is nadat je hebt opgeladen. Als je
op 95% uitkomt, begint het zoekwerk: welke adressen zijn afgekeurd, en wat is er mis mee?

**Wij willen die rondes korter en gerichter maken.** Niet één magisch commando, maar gereedschap
dat bij elke ronde zegt: dit zijn de adressen die bpost niet aanvaardde, dit stellen we voor als
correctie, en hoeveel je nog te kort komt voor de vloer van 96% en voor de korting vanaf 98%.

Daarnaast komt er een uitbreiding voor Claude ("skill") die die rondes voor jullie doorloopt, zodat
je geen commando's hoeft te typen.

### Wat dit niet is

Geen koppeling met e-MassPost. Geen inloggegevens, geen PRS-nummer, geen afgifteaankondiging.
**Wij laden niets op en wij kondigen niets aan.** Elke upload doen jullie zelf in AFT, zoals nu.

Wij hebben ook een dienst draaien die de volledige keten tot en met de afgifte kan afhandelen.
Die staat hier bewust buiten, en de skill wordt zo gebouwd dat hij er niet naar grijpt. Zo kan er
nooit per ongeluk een afgifte vertrekken.

---

## 2. De werkwijze

Dit is jullie eigen werkwijze. Wij bouwen gereedschap voor de stappen waar wij iets kunnen
betekenen; stap 2 en 3 blijven bij jullie in e-MassPost.

```
   ruwe klantenlijst
          │
      ① bestand klaarmaken            ← ons gereedschap
          │   correcte kolommen, vormregels, AFT-formaat
          ▼
      ② opladen in AFT                ← jullie, in e-MassPost
          │
      ③ antwoordbestand ophalen       ← jullie, in e-MassPost
          │
          ▼
      ③ antwoord uitlezen             ← ons gereedschap
          │   correct · aangepast · niet herkend + hoeveel je nog te kort komt
          │
          ├──── 96% gehaald? ──ja──► opladen mag  ·  98% = extra korting ──► klaar
          │
          nee
          ▼
      ④ correcties zoeken             ← ons gereedschap + jullie oog
          │   Belgisch adresregister, bpost-adresvalidatie, of jullie eigen kennis
          ▼
      ⑤ terug naar ①
```

In de praktijk zijn dat twee, hooguit drie rondes. De eerste haalt het grove werk eruit, de
tweede de rest.

### Hoeveel heb je nog nodig?

Elk commando eindigt met dezelfde regels:

```
  Ronde 2 · 4.812 adressen
  Nu 97,5%  ·  vloer 96% gehaald  ·  korting vanaf 98%
  Opladen mag nu al. Voor de korting nog 25 adressen nodig.
```

Die laatste regel is het punt. Niet "er zijn 124 fouten" — dat ontmoedigt. Wel: van die 124 moet
je er 25 oplossen om aan de korting te komen. Dat is een ander gesprek.

En er zijn drie manieren om die 25 te halen:

| | Wat het doet | Wanneer |
|---|---|---|
| **Corrigeren** | Het adres verbeteren | Altijd eerst proberen |
| **Schrappen** | De rij uit de mailing halen | Als het adres echt niet meer bestaat. Je verliest die ontvanger, maar het percentage stijgt — 25 corrigeren of 26 schrappen komt op hetzelfde neer |
| **Aanvaarden** | Op 97,5% blijven | Je verliest de korting van 0,5%, maar boven 96% mag je gewoon opladen |

Na een ronde die niets meer oplevert, is doorgaan zinloos: wat overblijft zijn meestal adressen
die niet meer bestaan. Dan is schrappen of aanvaarden de juiste beslissing, geen derde ronde.

---

## 3. Het gereedschap

Vier commando's, één per stap waar wij iets doen.

---

### ① `maak-bestand` — van ruwe lijst naar AFT-bestand

Leest jullie Excel of CSV, stelt voor welke kolom waar hoort, lost de vormproblemen op, en
schrijft het AFT-bestand.

```
Bestand:  klantenlijst-najaar.xlsx · 4.812 rijen

Kolommen herkend
  Naam           → LAST_NAME
  Voornaam       → FIRST_NAME
  Straat + nr    → ⚠ straat en huisnummer zitten samen in één kolom
                     voorstel: splitsen naar ADDRESS_LINE_1 + HOUSE_NUMBER
                     4.780 rijen splitsen probleemloos · 32 rijen niet, die krijg je te zien
  Postcode       → POST_CODE
  Gemeente       → CITY
  E-mail         → niet gebruikt (hoort niet in een AFT-bestand)

Nog nodig
  PRIORITY       → P (D+1) of NP (D+2)?

Vormfouten opgelost — hiermee zou AFT het hele bestand geweigerd hebben
  3 × straatnaam langer dan 42 tekens   → ingekort, voorstel ter nazicht
  1 × postcode met "B-" ervoor          → verwijderd
  7 × priority in kleine letters        → naar hoofdletters

Geschreven: mailing-najaar-r1.csv
  Kolomtitels identiek aan het bpost-sjabloon ✓
  SEQ 1–4.812, oplopend en uniek ✓
```

Dat laatste blok is belangrijker dan het lijkt: één verkeerde kolomtitel of één priority in kleine
letters en AFT weigert het **volledige** bestand. Dat is geen ARR-kwestie maar een vormkwestie, en
die kan je vooraf volledig uitsluiten.

---

### ③ `lees-antwoord` — wat zegt bpost?

Leest het antwoordbestand dat jullie uit e-MassPost halen, en splitst het in jullie drie
categorieën.

```
Antwoordbestand ronde 1 · 4.812 rijen

  Correct                4.512    93,8%    MID-4030
  Aangepast door bpost     176     3,7%    MID-4000, MID-4060
  Niet herkend             124     2,6%    MID-4010, MID-4020

  ARR: 97,5%   ·   vloer 96% gehaald   ·   voor de korting (98%) nog 25 adressen

  De 124 niet-herkende rijen staan in: niet-herkend-r1.csv
```

De middelste categorie is de interessante: bpost heeft het adres wél gevonden, maar er zat iets
scheef aan. Die rijen tellen mee voor de ARR, maar het is de moeite om ze op te schonen in jullie
bronbestand — anders komen ze elke mailing terug.

---

### ④ `zoek-correcties` — de niet-herkende adressen oplossen

Neemt de niet-herkende rijen en probeert ze op te lossen. Eerst met het Belgisch adresregister
(lokaal, gratis, instant), en voor wat daarmee niet lukt, met de adresvalidatiedienst van bpost.

```
124 niet-herkende adressen

  Opgelost met het Belgisch adresregister        71
     bv. "2000 Berchem"  →  2600 Berchem

  Opgelost via de bpost-adresvalidatie           29
     bv. "Rue Edouard dekoster 64, 1140 Bruxelles"
          →  EDWARD DEKOSTERSTRAAT 64, 1140 EVERE

  Meerdere mogelijkheden — jullie kiezen          9
     bv. "Kerkstraat 6, Dilbeek"  →  1700, 1701 of 1703?

  Niets gevonden                                 15

Voorstellen: correcties-r1.csv
```

Dat bestand opent gewoon in Excel: één regel per adres, oud en nieuw naast elkaar. Jullie schrappen
wat jullie niet willen — en jullie vullen zelf aan wat jullie herkennen maar de tools niet. Daarna
draai je `maak-bestand` opnieuw en ben je klaar voor ronde 2.

Waarom die tussenstap? Omdat bpost het zelf aanraadt: *"The feedback returned by the bpost service
should be reviewed before being integrated."* Een adres kan zo dubbelzinnig zijn dat hun
interpretatie niet oplevert wat je verwacht. Jullie zien dat sneller dan een programma.

Het originele bestand blijft altijd staan. Elke ronde maakt een nieuwe versie.

---

### `ververs` — het adresregister bijwerken

Het Belgisch adresregister wordt wekelijks bijgewerkt. Dit haalt de recentste versie op. De datum
van de gebruikte gegevens staat in elk rapport, zodat niemand ongemerkt op oude data werkt.

---

## 4. Persoonsgegevens

Een adressenbestand bevat persoonsgegevens. Wij willen niet dat het in handen komt van een
taalmodel of van derden. Dus:

**De bestanden blijven op jullie eigen computer.** Het gereedschap draait lokaal, in een
terminalvenster of via Claude Code op de laptop. Er wordt geen bestand geüpload naar Claude.

Wij hadden ook overwogen om het bestand rechtstreeks in een Claude-gesprek te laten slepen. Dat is
comfortabeler, maar dan staat het bestand op de servers van Anthropic. **Dat scenario laten we
vallen.**

Blijft er dan nog iets over? Ja, twee dingen, en we zeggen ze liever nu:

- Wat het programma **op het scherm toont**, ziet Claude wel. Daarom staan er in de rapporten
  tellingen en patronen, geen namen en geen e-mailadressen.
- Of daar **voorbeeldadressen** in mogen, is een keuze van jullie. Vergelijk deze twee meldingen:

  > `61 × straat bestaat niet in deze postcode`
  >
  > `61 × straat bestaat niet in deze postcode, bijvoorbeeld: Kerkstraat in 9000 Gent`

  De tweede is veel bruikbaarder — je ziet meteen wat er scheelt. Maar het is wel een adres dat op
  het scherm verschijnt. Wij kunnen drie kanten op: enkel tellingen, of straat en gemeente zonder
  huisnummer (zoals hierboven), of het volledige adres. Wij stellen de middelste voor: een straat
  zonder huisnummer verwijst naar niemand in het bijzonder.

De enige externe partij die adressen te zien krijgt, is **bpost zelf** — via `zoek-correcties`. Dat
is verdedigbaar: bpost krijgt diezelfde adressen sowieso bij de afgifte. Namen sturen we niet mee;
enkel straat, nummer, postcode en gemeente.

**Vraag aan jullie:** is "lokaal draaien" werkbaar in de praktijk? Het betekent dat er iets op de
laptop geïnstalleerd staat in plaats van dat je een bestand in een chatvenster sleept. Met Claude
Code blijft het bedienen wel eenvoudig — je wijst een map aan en zegt wat je wil — maar we willen
niet dat het zo omslachtig wordt dat niemand het gebruikt.

---

## 5. Wat we van jullie nodig hebben

Zeven punten voor Contrapunt, vier voor ons. Niets kost veel tijd, maar sommige blokkeren de rest.

### Voor Contrapunt

**A. Een echt antwoordbestand ⭐ het belangrijkste punt**
Een antwoordbestand van een eerdere afgifte, met de FEEDBACK-kolom ingevuld. Namen en huisnummers
mogen weggehaald zijn — wij hebben enkel de kolom met de codes nodig.

*Waarom:* wij kennen de MID-codes uit de documentatie, maar wij hebben nog nooit gezien hoe een
échte respons eruitziet. Welke codes komen er in de praktijk voor, en tellen de WARN-codes mee voor
de ARR zoals wij vermoeden? Zonder dit bestand bouwen we op een aanname.

**B. Het lege CSV-sjabloon**
In AFT, tab **Ondersteuning** → **Leeg CSV sjabloon**. Doorsturen.

*Waarom:* zie punt 6. Wij hebben een versie, maar willen zeker zijn dat het de actuele is.

**C. Certificatiestatus**
In e-MassPost onder **Information**: staat er bij `Check certified` en `Create certified` tweemaal
*Ja*? Een schermafbeelding volstaat.

**D. Werkt de Test-modus?**
Bij het opladen staat *Uitvoeringsmodus: Productie / Test / Certificatie*. Kan je in **Test** een
bestand opladen en een antwoordbestand terugkrijgen zonder dat het een echte afgifte wordt? Zijn er
kosten aan? Hoe lang duurt het voor je het antwoord hebt?

*Waarom:* jullie werkwijze draait op opladen-en-meten. Kan dat gratis en snel, dan zijn drie rondes
geen probleem. Kost elke ronde een echte afgifteaankondiging, dan moeten we vooraf veel meer zelf
wegvangen en verandert het ontwerp.

**E. Een representatief ruw bestand**
Hoe ziet een klantenlijst er bij jullie uit vóór er iets aan gedaan is? Uit welk systeem komt hij?
Geanonimiseerd mag — wij hebben de structuur nodig, niet de inhoud.

**F. Waar staan jullie vandaag?**
Welke ARR halen jullie doorgaans? Hoeveel rondes doen jullie nu gemiddeld? Hoeveel tijd kruipt er
in één bestand?

*Waarom:* zonder vertrekpunt kunnen we achteraf niet aantonen of dit iets opgeleverd heeft.

**G. Kennen jullie andere bronnen?**
Jullie zitten dieper in het bpost-verhaal dan wij. Diensten, bestanden of contactpersonen voor
adreskwaliteit die wij over het hoofd zien? Wij hebben gekeken naar het federale adresregister,
OptiAddress en de adresvalidatie-API van bpost.

### Voor Sonic Rocket

**H.** API-sleutel aanvragen voor de adresvalidatiedienst (`addressvalidation@bpost.be`), met drie
vragen: wat kost het en is er een limiet, komt hun oordeel overeen met de ARR bij een afgifte, en is
er een testomgeving. De technische documentatie hebben we al volledig.

**I.** Het Belgisch adresregister omzetten naar een compacte, snel doorzoekbare vorm.

**J.** Onze kolomdocumentatie rechtzetten (punt 6).

**K.** Uitzoeken hoe "lokaal draaien" er in de praktijk uitziet voor iemand die geen ontwikkelaar
is, zodat we punt 4 concreet kunnen maken in plaats van als principe.

---

## 6. Eén vondst die we willen aankaarten

Bij het uitwerken botsten we op iets dat jullie mogelijk al kennen — of waar jullie tot nu toe
toevallig niet tegenaan gelopen zijn.

De AFT-kolomtitels verschillen tussen onze bronnen:

- Het **lege CSV-sjabloon** dat wij hebben telt **39 kolommen**, met achteraan `FIELDTOPRINT1..3`,
  `ORGINFO`, `PRINTORDER`.
- De **handleiding van de Address File Tool** — gedateerd september 2010 — toont **32 kolommen**,
  met achteraan `DISTRIBUTIONOFFICE`, `ROUTENAME`, `ROUTESEQ`, `FEEDBACK`.
- Enkele namen verschillen ronduit: `POSTAL_CODE` tegenover `POST_CODE`, `LANGUAGE` tegenover
  `LANG`, `UNSTRUCTURED_NAME` tegenover `NAME_UNSTRUCTURED`.

AFT weigert een bestand bij één afwijkende kolomtitel, met een melding als *"Ongeldige kolom titel:
Verwachte titel: 'ROUTENAME', maar is 'ROUTESEQ'"*.

Onze aanpak: wij typen de kolomtitels **nooit over**. Het programma neemt de titelregel letterlijk
uit het meegeleverde bpost-sjabloon. Verandert bpost het sjabloon, dan zetten wij het nieuwe erin
en is het opgelost, zonder programmawerk.

Daarom is punt B hierboven belangrijk: wij willen werken met het sjabloon dat vandaag in jullie AFT
staat.

---

## 7. Wat we nog niet weten

- **Hoe een echt antwoordbestand eruitziet.** Wij kennen de MID-codes uit de documentatie en
  hebben ze in drie categorieën ingedeeld, maar wij hebben er nog nooit een gezien. Punt A.
- **Of de WARN-codes meetellen voor de ARR.** Wij gaan ervan uit van wel — die adressen kregen een
  MID-nummer en worden dus bezorgd. Te bevestigen met punt A.
- **Wat de adresvalidatiedienst van bpost kost.** Wij hebben hun volledige handleiding gelezen: er
  staat geen prijs, geen volumelimiet en geen quotum in. Dat is geen gat in ons onderzoek maar in
  hun documentatie. Vraag loopt.
- **Of die dienst hetzelfde oordeelt als de ARR bij een afgifte.** bpost schrijft zelf dat hun
  databank *"may vary from time to time"*, maar bevestigt nergens dat de webservice exact hetzelfde
  zegt als de afgifteberekening.
- **Welke tekenset AFT verwacht.** Staat niet in de handleiding. We testen het met accenten in
  Waalse en Vlaamse straatnamen.
- **`MID-4200` en `MID-4210`** staan in de codelijst als *"DataQuality is no longer supported"* en
  *"RS is no longer supported"*. Weten jullie waar dat over gaat? Het klinkt alsof er iets is
  uitgefaseerd.
- **OptiAddress of de adresvalidatie-webservice — of allebei?** Er zijn twee bpost-diensten die
  adressen nakijken zonder afgifte. De webservice is een gewone REST-API en technisch eenvoudiger.
  OptiAddress werkt met gestructureerde bestanden en vraagt certificatie, **maar draait op het
  Mail ID-platform — hetzelfde systeem dat bij de afgifte de ARR berekent.** Mogelijk is dat dus
  het oordeel dat echt telt. bpost bevestigt nergens dat beide hetzelfde zeggen. Wij hebben de
  OptiAddress-koppeling (MailingCheck, met correctiesuggesties) al gebouwd in onze MCP-service.
  Hebben jullie OptiAddress-certificatie, wat kost het, en wat geeft het jullie dat een
  AFT-upload in Test-modus niet geeft?

---

## 8. Waar we jullie antwoord op willen

1. Klopt de werkwijze in punt 2 met hoe jullie het vandaag doen? Ontbreekt er een stap?
2. Kloppen de vier commando's in punt 3? Doet er één iets wat jullie niet nodig hebben, of ontbreekt
   er iets?
3. Is lokaal draaien werkbaar? (punt 4)
4. Voorbeeldadressen in de rapporten: enkel tellingen, straat zonder huisnummer, of volledig?
   (punt 4)
5. Hebben jullie zelf al een sleutel voor de adresvalidatiedienst van bpost, of vragen wij die aan?
6. De zeven punten van punt 5 — wie pakt wat op, en tegen wanneer?

*De cijfers in de voorbeelden hierboven zijn verzonnen ter illustratie. Ze komen niet uit een echte
meting.*

---
---

# Bijlage — technisch plan (intern, Sonic Rocket)

*Niet bestemd voor Contrapunt. Bij goedkeuring splitsen we dit af naar de skills-repo.*

## Correctie op eerder onderzoek

Ik meldde eerder dat het AFT-antwoordbestand binair is (`MID-4030` / `MID-4010`). **Dat klopt
niet.** Uit `errors/mailing-error-codes.md` r. 91–108 en `resources/status_codes.xls`:

| Categorie | Codes | Severity |
|---|---|---|
| Correct | `MID-4030` (MID-nummer/pre-sorteercode toegekend) | INFO |
| Aangepast | `MID-4000` onjuiste componentwaarde · `MID-4001` lege component genegeerd · `MID-4060` gebouw gevonden, geen perfecte match · `MID-4050` ronde maar geen PDP · `MID-4100` niet MID+-conform · `MID-4300` onvoldoende PDP-match | WARN |
| Niet herkend | `MID-4010` geen match · `MID-4011` geen match, distributiekantoor wel · `MID-4020` meerdere matches · `MID-4070` ronde maar geen PDP · `MID-4080` straat maar geen ronde/PDP | ERROR |
| Informatief | `MID-4040` compliance rate berekend · `MID-4061/4062` PDP-ID · `MID-4090` | INFO |
| Fataal | `MID-4200` DataQuality niet meer ondersteund · `MID-4210` RS niet meer ondersteund | FATAL |

Twee gevolgen. **`MID-4040` suggereert dat bpost de ARR zelf meegeeft** — als dat in het
antwoordbestand terechtkomt, hoeven we hem niet te berekenen. En **de ARR-formule is een aanname**:
wij nemen INFO+WARN als herkend, ERROR als niet herkend. Te valideren tegen een echt
antwoordbestand (fase 0 punt A). `MID-4200`/`MID-4210` als FATAL verdient navraag.

## Beslissing over de volgorde — nu vastgelegd

Contrapunt heeft hun werkwijze beschreven en die is **opladen-eerst**: bestand maken → indienen →
feedback → corrigeren → opnieuw indienen. De eerdere open vraag "eigen check eerst of AFT eerst" is
daarmee beantwoord. Gevolgen:

- De lokale BeSt-index verschuift van *voorscreening* naar *het oplossen van de niet-herkende
  adressen in stap 4*. Dat is ook precies waar Contrapunt om vroeg.
- Er is **geen apart `controleer`-commando** meer. De vormcontrole (die het bestand zou doen
  afkeuren) zit in `maak-bestand`; de inhoudelijke controle zit in `zoek-correcties`.
- `bekijk` verdwijnt als los commando. Het gaf enkel een inventaris; de mapping-analyse die er wél
  toe doet, is deel van `maak-bestand`.
- Vier commando's in plaats van zeven.

## Onderzoeksresultaten

**OptiAddress — open, niet afgevoerd.** Gestructureerde bestandsuitwisseling (`.xml`/`.txt`) over
FTP/HTTPS met MailingCheck-syntax, plus bpost-certificatie. Bron: `flows/optiaddress-flows.md`.

Eerder schreef ik dat dit "de verkeerde deur" was. Dat was te stellig. Wat wél klopt: het is geen
REST-API en dus geen laagdrempelig startpunt voor een lokaal Python-script. Wat ik onderbelichtte:

- **Wij hebben het al geïmplementeerd.** `src/lib/batch/check-batch.ts` bouwt een MailingCheck-
  request over HTTP, met `suggestionsCount` en `suggestionsMinScore` — dus mét correctiesuggesties.
  Het staat als `check_batch` in de MCP-service. De certificatie- en transportdrempel is dus deels
  al genomen.
- **OptiAddress draait op het Mail ID-platform** — hetzelfde systeem dat bij de afgifte de ARR
  berekent. De adresvalidatie-webservice is een apart product op `api.mailops.bpost.cloud`. bpost
  bevestigt nergens dat beide identiek oordelen. Als ze verschillen, is OptiAddress het oordeel
  dat overeenkomt met de beoordeling. Dat is een argument dat zwaarder weegt dan
  implementatiegemak.
- Open vraag voor Frank: OptiAddress en een AFT-upload in Test-modus zijn allebei een
  bestandsronde heen en terug. Het verschil volgens de docs is dat OptiAddress geen afgifte nodig
  heeft en suggesties met een score teruggeeft. Klopt dat in de praktijk?

**Beslissing uitgesteld tot na het gesprek met Contrapunt.** Het ontwerp in fase 4 gebruikt een
adapter-interface, dus een derde bron (`OptiAddressSource`) past er zonder herbouw naast
`LocalIndexSource` en `BpostApiSource`.

**bpost Address Formatting & Validation Web Services** — de bruikbare REST-API. Volledige
documentatie in `reference/bpost_Address_Formatting_and_Validation_API_Manual_v1.7/`.

| | |
|---|---|
| Validatie | `POST https://api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingRest/validateAddresses` (r. 718) |
| Formatting | `.../formatAddresses` (r. 719) |
| Testomgeving | OpenAPI-spec wijst naar `api.mailops-np.bpost.cloud`, pad `/roa-info-st/`. Toegang bevestigen |
| Auth | header `x-api-key`, via `addressvalidation@bpost.be` (r. 53, 728) |
| Batch | **max 100 adressen per call** (r. 91) |
| Prijs/quota | **staat nergens** — gericht gezocht |
| Invoer | structured, semi-structured, address block lines |

Responsmodel (uit `External/*-response.txt`): geen `Error`-blok = schoon. Anders `Error[]` met
`ComponentRef`, `ErrorCode` ∈ {`address_not_recognized`, `anomaly_in_field`, `field_not_recognized`,
`missing_field`, `delivering_country_not_supported`}, `ErrorSeverity` ∈ {`warning`, `error`}.
`ValidatedAddress[]` bevat de gecorrigeerde versie in HOOFDLETTERS met `AddressLanguage`.
Meerdere treffers = meerdere items. Er is ook een **Address feedback service** waarmee je met de
`TransactionID` kan terugmelden dat bpost' oordeel fout was.

⭐ De API controleert **huisnummers** (*"number 12 does not exist in this street"*) — de blinde vlek
van de lokale index.

**BeSt Address (BOSA)** — CC BY 4.0, wekelijks. `postalstreets-latest.zip` = 2,2 MB
(postcode ↔ straat ↔ gemeente, NL/FR/DE). Volledige regio-CSV's met huisnummers: 18–153 MB, niet
bundelen. `gratis-postcodedata.nl` is een herverpakking hiervan door een Nederlands eenmansbureau —
geen LICENSE, stale. Niet gebruiken.

**`spatie/bpost-address-webservice`** — PHP, MIT, laatste push jan. 2024. Niet bruikbaar als
dependency, wél als referentie voor het platslaan van het diep geneste request/response-model.
⚠️ Mogelijk nog op het oude endpoint `webservices-pub.bpost.be`.

**ARR-drempels** (tarievengidsen 2026): ≥96% toegangsvoorwaarde, ≥98% → 0,5% Data Quality-korting,
stapelbaar met Mail ID+ (+1%).

**⚠️ Kolomdrift.** `resources/template.csv` = 39 kolommen; PDF (sept. 2010) = 32; en
`schemas/address-file-tool.md` gebruikt namen die in géén van beide staan. Kolommen A–AB zijn
stabiel. **Header nooit hardcoden — lezen uit `template.csv`.**

**Netwerk en sandbox.** claude.ai/Desktop heeft *"varying network access"*; Claude Code en terminal
hebben gewoon netwerk. Aangezien we nu **lokaal-only** gaan, is dit geen beperking meer — maar
stdlib-only blijft de regel, want de gebruiker mag niets moeten installeren buiten Python zelf.

## ⚠️ Afbakening tegenover de MCP-service

Mark's account heeft zowel de skill `bpost-e-MassPost` als de gehoste MCP-server `bpost-emasspost`
binnen bereik. Claude kan in hetzelfde gesprek naar MCP-tools grijpen in plaats van naar onze
scripts. Twee daarvan zijn **onomkeerbaar**: `submit_ready_batch` en `bpost_announce_deposit` /
`bpost_announce_mailing` dienen een echte afgifte in bij bpost.

Vereisten voor `SKILL.md`:

1. Expliciet verbod met de tools bij naam: `upload_batch_file`, `get_upload_instructions`,
   `get_raw_headers`, `apply_mapping_rules`, `get_batch_errors`, `check_batch`, `apply_row_fix`,
   `submit_ready_batch`, `bpost_announce_deposit`, `bpost_announce_mailing`. Mét reden — een verbod
   zonder reden wordt weggeredeneerd.
2. Positief: alle bewerkingen lopen via `scripts/` in deze skill.
3. Niets gaat naar bpost of naar een eigen server, behalve de validatie-API in `zoek-correcties`, en
   enkel na expliciete instemming.

Twee punten om na te kijken:

- **Triggerbotsing.** De bestaande skill heeft *"address validation (OptiAddress)"* in zijn
  description. Overlapt met de nieuwe. Scherp uit elkaar trekken.
- **Frontmatter.** `name` mag enkel kleine letters, cijfers en koppeltekens bevatten. De bestaande
  skills heten `bpost-e-MassPost`, `bpost-e-MassPost Tips`, `bpost-e-MassPost Browser Automation` —
  hoofdletters én spaties. Nagaan of dat geweigerd of getolereerd wordt; de nieuwe hoe dan ook
  conform (`bpost-adressen-voorbereiden`).

## Structuur — `skills/bpost-adressen/`

```
SKILL.md · index.md
workflow/    01-bestand-maken.md · 02-antwoord-lezen.md · 03-correcties-zoeken.md · 04-de-ronde.md
reference/   aft-columns.md · mid-codes.md · arr-en-kortingen.md · address-rules.md
             data-sources.md · privacy.md
scripts/
  bpost_address/  table.py · aft.py · mapping.py · index.py · normalize.py
                  response.py · fixes.py · scoreboard.py · report.py
                  sources/  local_index.py · bpost_api.py
  make_file.py · read_response.py · find_fixes.py · refresh_index.py
data/        template.csv · best-index.tsv.gz · best-index.meta.json
tools/       build_index.py          ❌ niet in de zip
tests/                               ❌ niet in de zip
```

## Beslissingen

| # | Beslissing | Waarom |
|---|---|---|
| 1 | Thuis = repo `bpost-epostmasspost-skills` | Scripts moeten in de zip; die repo bouwt al per-skill zips |
| 2 | Nieuwe skill naast `e-masspost-protocol` | Protocol-skill blijft naslagwerk, deze is workflow |
| 3 | Python, **stdlib only** | Geen `pip install`, ook niet lokaal |
| 4 | `.xlsx` via `zipfile` + `xml.etree` | Vermijdt de openpyxl-afhankelijkheid |
| 5 | Enkel pipe-CSV schrijven, geen `.xls` | AFT-CSV heeft geen rij- of groottelimiet |
| 6 | Code Engels, output en docs Vlaams | Volgt `AGENTS.md` |
| 7 | **Lokaal-only**; geen bestandsupload naar Claude | Klantbeslissing: adresbestanden gaan niet naar Anthropic |
| 8 | Rapport: geen namen; adresvoorbeelden instelbaar, standaard straat+gemeente zonder huisnummer | GDPR-keuze ligt bij de klant, met een verdedigbare standaard |
| 9 | Header wordt gelezen uit `template.csv`, nooit gehardcodeerd | Kolomdrift; zie onderzoeksresultaten |
| 10 | `find_fixes.py` past niets toe — het schrijft voorstellen | bpost schrijft het voor; en de mens ziet foute correcties sneller |
| 11 | Elk commando eindigt met hetzelfde scorebord | Het project levert een cijfer op, geen rapport |
| 12 | ⚠️ De skill gebruikt **nooit** de MCP-tools | Veiligheidsvereiste, zie afbakening |

## Taken

**Fase 1 — Stap ① `make_file.py`** *(levert meteen waarde, geen externe afhankelijkheden)*

1. `reference/aft-columns.md` uit `template.csv`; corrigeer `schemas/address-file-tool.md`; issue
   tegen de skills-repo. Maxlengtes uit `addressing-rules.md` tabel 79.
2. `table.py` — `.csv` (delimiter sniffen, encoding-ladder UTF-8/BOM → cp1252 → latin-1) en
   `.xlsx` (`sharedStrings.xml` + `sheet1.xml`). `read_table(path) -> (headers, rows)`.
3. `mapping.py` — kolomnamen herkennen (synoniemenlijst NL/FR/EN), samengestelde velden
   detecteren (straat+nummer in één kolom) en een splitsvoorstel doen met slaagpercentage.
   Voorstel tonen, nooit stil toepassen.
4. `aft.py` — `load_template_header()`, `write_aft()` (pipe, CRLF, header byte-identiek),
   `validate_field()` (maxlengte, verboden tekens, `PRIORITY` hoofdletters, `SEQ` uniek/oplopend,
   groepen 1–5 niet mengen). **Weigert enkel op vormfouten**, nooit op inhoudelijke twijfel — een
   verdacht adres moet mee kunnen om gemeten te worden.
5. `scoreboard.py` — `gap_to_target(n, recognized, target=0.98) -> (corrections_needed,
   rows_to_drop)` met `corrections_needed = max(0, ceil(target*n) - recognized)` en
   `rows_to_drop = max(0, ceil(n - recognized/target))`. `--json` voor de skill. Elk commando
   sluit hiermee af.

**Fase 2 — Stap ③ `read_response.py`** *(gate: een echt antwoordbestand, punt A)*

6. `response.py` — MID-codes naar de drie categorieën volgens de tabel bovenaan, ARR berekenen,
   niet-herkende rijen wegschrijven **in het formaat dat `find_fixes.py` inleest**.
   Onbekende codes nooit stil negeren: apart tonen en een issue voorstellen.
   *Risico:* `.xls` lezen kan niet met de stdlib. **Eerst nagaan of het antwoord als CSV terugkomt
   bij een CSV-upload.** Zo niet: instructie "opslaan als CSV". Geen BIFF8-parser bouwen.

**Fase 3 — Stap ④ `find_fixes.py`, lokaal deel**

7. `tools/build_index.py` → `best-index.tsv.gz` uit `postalstreets-latest.zip`:
   `postcode ⇥ street_key ⇥ street_nl/fr/de ⇥ city_nl/fr`. `street_key` genormaliseerd
   (kleine letters, accenten weg, leestekens weg, straattype-afkortingen uit tabel 80).
   Meta-JSON met bron, datum, aantal.
8. `local_index.py` — postcode↔gemeente herstellen, straat fuzzy matchen binnen de postcode,
   meerdere kandidaten teruggeven in plaats van gokken.
9. `fixes.py` + voorstellenbestand — één regel per adres, oud en nieuw naast elkaar, met reden en
   bron. Kolom die de gebruiker leeg kan maken om te weigeren, en een kolom om zelf in te vullen.

**Fase 4 — Stap ④ `find_fixes.py`, bpost-deel** *(gate: API-key, punt H)*

10. `bpost_api.py` — stdlib `urllib.request`, batches van exact 100, `x-api-key`,
    `CallerIdentification.CallerName`. Enkel `PostalAddress` meesturen, geen namen (de API
    valideert die toch niet). Bouwen tegen non-prod als die toegankelijk is.
    Voorbeeldresponses in `External/*.txt` zijn de fixtures — fase 4 is volledig testbaar zonder key.
11. Terugval naar `local_index.py` bij ontbrekende key of netwerkfout, met expliciete melding.

**Fase 5 — De skill**

12. `SKILL.md` — conforme `name`, scherp afgebakende `description`, body <500 regels.
    Stuurt de **ronde** aan, niet losse commando's: bestand maken → gebruiker laadt op → antwoord
    lezen → scorebord met tekort → correcties zoeken → voorstellen tónen → gebruiker beslist →
    opnieuw. Stoppen zodra 96% gehaald is en de gebruiker de extra korting niet verder najaagt, of bij ≥98%, of bij een ronde zonder vooruitgang (dan schrappen of aanvaarden
    voorleggen, geen derde ronde forceren). Nooit zelf opladen. Het volledige MCP-verbod.
13. `build-skills.yml` bouwt nu enkel `e-masspost-protocol` (r. 29) → matrix over `skills/*`,
    `tools/` en `tests/` uitsluiten, zipgrootte in de job summary.

## Verificatie

Unit tests met `unittest` (stdlib). Fixtures: propere set, set met bekende vormfouten, de zes
voorbeeldbestanden uit `External/` (dekken alle vijf de API-foutcodes), en het echte
antwoordbestand van Contrapunt zodra beschikbaar.

```bash
python3 scripts/make_file.py klantenlijst.xlsx --out mailing-r1.csv
head -1 mailing-r1.csv | diff - <(head -1 data/template.csv)   # moet leeg zijn
python3 scripts/read_response.py antwoord-r1.csv
python3 scripts/find_fixes.py niet-herkend-r1.csv --out correcties-r1.csv
```

Sluitstuk: één echte ronde met Contrapunt — bestand maken, opladen in Test-modus, antwoord
terugvoeren, en nagaan of onze categorie-indeling en ARR-berekening overeenkomen met wat bpost zegt.

## Risico's

| Risico | Aanpak |
|---|---|
| Geen echt antwoordbestand beschikbaar | Punt A is de belangrijkste gate; zonder dit is fase 2 giswerk |
| ARR-formule (WARN telt mee) blijkt fout | Formule op één plek in `response.py`; kalibreren op het echte bestand |
| Antwoordbestand enkel als `.xls` | Eerst verifiëren; anders "opslaan als CSV" |
| Test-modus bestaat niet of kost geld | Dan verschuift het zwaartepunt naar meer voorafgaande controle; ontwerp herzien |
| API-key blijft uit | Fase 4 is geïsoleerd achter een adapter; fase 1–3 en 5 gaan door |
| **Skill grijpt naar de MCP-tools** | Benoemd verbod + afgebakende description. `submit_ready_batch` is onomkeerbaar — ernstigste faalwijze |
| Lokaal draaien blijkt te omslachtig | Punt K: eerst uitzoeken hoe dit er in de praktijk uitziet vóór we de skill schrijven |
| Index veroudert stil | Datumstempel verplicht in elk rapport + `refresh_index.py` |
