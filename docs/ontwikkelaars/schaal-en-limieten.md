# Schaal en limieten

Er zijn limieten, ze liggen op bekende plaatsen, en hun grootteorde is ongeveer bekend. Dat is wat deze pagina aangeeft. **Status: voorlopig.** De cijfers zijn grootteordes uit lokale metingen op één machine (01/10/2026), niet uit metingen op Vercel. De webapp voor het indienen van lijsten bestaat nog niet.

## Verwacht gebruik

Gewone lijsten van Contrapunt: **tienduizenden adressen**, soms meer dan 100.000. Onze inschatting is dat ze niet boven ongeveer **200.000** komen. Dat is nog te bevestigen met Frank. Het ontwerp richt zich op dat bereik.

## Waar de limieten liggen

| Soort | Waar de limiet zit | Grootteorde | Wat het betekent |
|---|---|---|---|
| **Werkgeheugen** | Vercel: 2 GB standaard, 4 GB op Pro | Alles in één keer in het geheugen kost ongeveer 10 KB per rij: 100.000 rijen ≈ 1 GB, 200.000 ≈ 2 GB, 300.000 ≈ 2,8 GB. Per deel of streamend is het enkele honderden MB, ongeacht de grootte. | Veilig tot ongeveer 150.000 rijen op 2 GB en 300.000 op 4 GB, als alles in één keer gaat |
| **Grootte van één aanvraag** | Vercel: 4,5 MB | Een Excel met 8 kolommen is ongeveer 50 B per rij. Dat haalt de grens bij ongeveer 90.000 rijen, en bij veel kolommen al rond 45.000. | Grote lijsten moeten in delen binnenkomen |
| **Opslag** | Database en object-opslag, naargelang het gekozen plan (nog na te kijken) | Per lijst van 100.000 adressen, **schatting, niet gemeten**: tientallen MB in de database gedurende 30 dagen, enkele tientallen MB blijvend, en enkele MB aan gecomprimeerde bestanden | Opslag groeit met het aantal lijsten, niet met de duur van één lijst |
| **Doorvoer en tijd** | Onze kant: rekenwerk. Bpost: verwerking. | Onze keten haalt ongeveer 35.000 rijen per seconde (600.000 rijen in 18 s). Een antwoord van 100.000 adressen lezen duurt streamend 0,1 s. | De trage schakel is bpost, niet wij |
| **Duur van één aanvraag** | Vercel: 300 s standaard, 800 s op Pro. De masspost-routes staan nu op 60 s. | Rekenwerk past ruim, het wachten op bpost niet | Het wachten op bpost gebeurt buiten de aanvraag |
| **Bpost zelf** | Gedocumenteerd, zie hieronder | Tot 600.000 adressen per bestand. MAIL ID binnen 90 minuten, OptiAddress binnen 2 uur, met 12 uur marge. | Het antwoord komt later, soms uren |

## Wat bpost zegt en wat we zien

| Soort | Wat | Grens |
|---|---|---|
| **Bewezen met bpost** (echt verstuurd) | Create en Check via het portaal | **500 adressen**: Check en Create in testmodus, en Create in productie. In certificatie maximaal 5 adressen. |
| **Gedocumenteerd door bpost** | Limieten per modus | Test 200, certificatie 2000, productie geen. Verwerking tot 600.000 adressen per bestand. Een commercieel minimum van 500 adressen (Frank). |
| **In de praktijk** | Testmodus | Bpost aanvaardde **500 adressen in testmodus**, dus het plafond van 200 wordt niet afgedwongen. Waar de echte grens ligt, is onbekend. |

Boven de 500 adressen is er nog **nooit iets naar bpost gestuurd**. Dat geldt ook voor de verwerkingstijd van grote bestanden. Omdat testmodus meer aanvaardt dan de documentatie zegt, kan een grotere proef mogelijk gewoon in testmodus.

## Meting van de library

Synthetische lijsten in de Contrapunt-indeling (8 kolommen, wisselende namen en huisnummers, straten uit het voorbeeldbestand). De keten loopt van het inlezen van de Excel tot het gzip-bestand. Er zit **geen database, geen FTP en geen bpost** in.

| Rijen | Excel | Tijd | Piekgeheugen | XML | XML na gzip |
|---|---|---|---|---|---|
| 10.000 | 0,5 MB | 1 s | 256 MB | 1,8 MB | 0,2 MB |
| 100.000 | 4,6 MB | 3,3 s | 1,04 GB | 18,3 MB | 1,8 MB |
| 200.000 | 9,3 MB | 6,1 s | 1,95 GB | 36,6 MB | 3,6 MB |
| 300.000 | 14,0 MB | 9,0 s | 2,79 GB | 55,0 MB | 5,4 MB |
| 600.000 | 28,0 MB | 17,9 s | 3,48 GB | 110,1 MB | 10,7 MB |

## Inlezen en nakijken in de browser

Gemeten op 05/10/2026 met de [POC formaatvalidatie](website.md#poc-formaatvalidatie). De meting gebruikt het losstaande bestand (productiebouw van React), Chrome, een zichtbaar tabblad, een Mac met Apple-chip, en synthetische lijsten van `npm run generate:large-xlsx` (8 kolommen, ±3 % formaatfouten).
- **Inlezen:** `parseExcelAddresses` op de main thread, met SheetJS sinds ADR 0005. Tussen haakjes de eerste meting met exceljs.
- **Controle:** `findFormatIssues`.
- **Tonen:** van het einde van de controle tot het scherm getekend is.
- **Geheugen:** de JS-heap na het inlezen (`performance.memory`). Die schommelt met de garbage collector, dus het is een grootteorde.

| Adressen | Excel | Inlezen | Controle | Tonen | Formaatfouten | Geheugen |
|---|---|---|---|---|---|---|
| 789 (`testadressen.xlsx`) | 49 KB | 21 ms (56 ms) | 2 ms | 16 ms | 2 | ±7 MB (±9 MB) |
| 25.000 | 1,0 MB | 0,26 s (0,30 s) | 34 ms | 13 ms | 674 | ±40 MB (±55 MB) |
| 35.000 | 1,4 MB | 0,33 s (0,35 s) | 44 ms | 11 ms | 901 | ±60 MB (±130 MB) |
| 100.000 | 4,1 MB | 0,95 s (1,0 s) | 107 ms | 10 ms | 2.634 | ±120 MB (±190 MB) |
| 150.000 | 6,1 MB | 1,3 s (1,4 s) | 165 ms | 15 ms | 3.954 | ±190 MB (±330 MB) |

Dezelfde lijsten in Node (lezen alleen, piekgeheugen van het proces):

| Adressen | exceljs | SheetJS |
|---|---|---|
| 25.000 | 0,39 s, 343 MB | 0,30 s, 204 MB |
| 100.000 | 1,25 s, 720 MB | 1,09 s, 371 MB |
| 150.000 | 1,93 s, 1.028 MB | 1,60 s, 501 MB |

**Wat dat zegt:**
- **Tot 150.000 adressen** is inlezen in de browser geen probleem op deze machine. De pagina bevriest even tijdens het inlezen, maar het wieltje (een CSS-animatie) blijft draaien.
- **SheetJS tegenover exceljs:** iets sneller, en het gebruikt ongeveer de helft van het geheugen. De waarden per cel zijn identiek.
- **Een hele groep overnemen:** alle voorstellen van een groep in één keer (2.294 rijen) kost 21 ms.
- **Vergelijking met de Node-meting hierboven:** daar was het geheugen veel hoger (1 GB bij 100.000 rijen), want die meting omvat de hele keten tot XML en gzip. Deze meet enkel het inlezen en de controle.
- **De ontwikkelserver** (`next dev`) is 1,5 à 2 keer trager.
- **Een verborgen of geminimaliseerd tabblad** is veel trager, tot 10 keer voor de controle: de browser geeft het minder rekentijd. Wie meet, houdt het tabblad dus zichtbaar.
- **Een .xls-bestand** bevat maximaal 65.535 adressen; dat is een grens van het formaat.
- **Nog te meten:** een gewone kantoor-pc van Contrapunt. Reken op 2 à 4 keer trager. Daarvoor dient het losstaande bestand: het meetpaneel kopieert de cijfers als JSON.

## Het antwoord van bpost inlezen

Nagebootste antwoorden, gekloond uit de echte antwoorden van 01/10 (425 B per adres voor een Create, 691 B voor een Check). De bestaande parser leest het hele antwoord als boom. Streamend betekent: een adres tegelijk, zonder alles te bewaren.

| Antwoord | Bestand | Als boom (huidige parser) | Streamend |
|---|---|---|---|
| Create, 100.000 adressen | 40 MB | 2,4 s, 470 MB | 0,1 s, 116 MB |
| Create, 300.000 adressen | 122 MB | 7,1 s, 1,12 GB | 0,2 s, 156 MB |
| Check, 100.000 adressen | 66 MB | **mislukt** | 0,1 s, 141 MB |

**De huidige parser mislukt op echte antwoorden vanaf ongeveer 250 adressen.** Elk adres heeft in het echte antwoord vier `&quot;` in zijn XPath, en `fast-xml-parser` stopt standaard bij 1000 vervangingen ("Entity expansion limit exceeded"). Bewezen op het echte antwoord van 500 adressen van 29/09, dat 2002 vervangingen bevat. De functie wordt vandaag nergens in een echte flow gebruikt (alleen in tests en in de HTTP-client die niet werkt), dus er is nu geen schade. Een parser voor antwoorden per adres moet dit meenemen en streamend werken.

## Als we later naar Docker gaan

De grenzen verschuiven, de kosten per rij niet.
- Geen limiet van 4,5 MB per aanvraag en geen vaste duur per aanvraag.
- Het geheugen is wat de host geeft, niet 2 of 4 GB.
- Opslag en database zijn onze eigen keuze.
- Mogelijk een vast IP-adres, als de host dat biedt. Dat is relevant voor de whitelist bij bpost's FTP.
- Per rij blijft het gelijk: ongeveer 10 KB geheugen als alles in één keer gaat, 190 B XML per adres en 425 tot 690 B antwoord per adres.

## Wat nog niet gemeten is

- Schrijven naar Postgres, en de opslag per lijst.
- De FTP-upload van grote bestanden (het inloggen op bpost's FTP lukt nog niet).
- Alles op Vercel zelf. Dat doen we later op een preview-deploy.
- Echte data. De proefadressen zijn minder uniek dan een echte lijst, dus de compressie valt in de praktijk iets lager uit.
- Waar bpost's echte grens in testmodus ligt.
