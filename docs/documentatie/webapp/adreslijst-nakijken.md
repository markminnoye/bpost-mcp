# Adreslijst nakijken (proefversie)

{% hint style="warning" %}
Proefversie. Ze toont de eerste stappen van een mailing. Er gaat nog niets naar bpost, en de schermen kunnen nog veranderen.
{% endhint %}

Met deze pagina lees je een adreslijst in, kies je welke kolommen het adres vormen, kijk je na of elk adres aan de regels van bpost voldoet, en download je een bestand voor de drukker. Je vindt ze op `https://bpost.sonicrocket.app/masspost/poc`. Je hoeft niet aan te melden.

**Wat er met je gegevens gebeurt:** niets verlaat je computer. De pagina leest het bestand in je browser, verstuurt geen adressen en bewaart niets. Sluit je het tabblad, dan is alles weg.

Er bestaat ook een versie als één los bestand, die je zonder internet opent door erop te dubbelklikken. Die werkt op dezelfde manier.

## Stap 1: opladen

Sleep je Excel-bestand in het vak, of klik op **Kies een bestand**.

- **Formaten:** .xlsx en .xls (Excel 97-2003). Een .csv-bestand kan nog niet.
- **De eerste rij** bevat de kolomtitels, elke volgende rij is één adres. Lege rijen slaan we over.
- **Enkel het eerste werkblad** wordt ingelezen.
- **Hoeveel adressen:** gewoon tot 25.000. Tot 150.000 kan, met een waarschuwing: dit is een proef, en we meten hoe snel het gaat. Een .xls-bestand bevat er nooit meer dan 65.535; dat is een grens van het formaat.

Geen bestand bij de hand? **Probeer met een voorbeeldlijst** laadt 30 verzonnen adressen met de typische fouten.

## Bovenaan: de stappen en de pills

Links bovenaan staan de stappen. Hun icoon is grijs tot de stap een status heeft: geel als er in die stap iets te doen is (de koppeling is onvolledig, of er staan formaatfouten open), groen als ze in orde is. Klik op een vorige stap om terug te gaan. Wil je een ander bestand, klik dan op **1. Opladen**.

Rechts op dezelfde regel staat een rij pills: een icoon met een getal. Ga er met de muis over voor de uitleg.

| Pill | Betekenis |
|---|---|
| **AFT** of **Contrapunt** (blauw) | We herkennen de indeling: de Address File Tool van bpost, of de export van Contrapunt. De kolommen zijn automatisch gekoppeld. |
| Envelop met getal | Het aantal adressen in je lijst (de naam van het bestand staat in de uitleg). Oranje boven 25.000. |
| Wereldbol (oranje) | Adressen in het buitenland: kijk het land na. |
| Kolommen | Hoeveel kolommen aan het adres gekoppeld zijn (stap 2). |
| abc (oranje of groen) | Open formaatfouten, of "formaat in orde" (stap 3 en 4). |
| Verbodsteken | Rijen die je uitsloot (stap 3 en 4). |
| Envelop met pijl | Hoeveel adressen meegaan (stap 4). |

## Stap 2: kolommen koppelen

Bpost krijgt een adres in vakken: naam, bedrijf of afdeling, straat met nummer en bus, postcode met gemeente, en het land. Hier kies je per kolom van je lijst wat er mee gebeurt.

**Herken je bestand een gekende indeling** (de AFT van bpost of de export van Contrapunt), dan koppelen we de kolommen zelf en sla je deze stap over. Je kan ze toch bekijken via **2. Koppelen** bovenaan.

| Keuze | Wat ermee gebeurt |
|---|---|
| **Naam** | Gaat naar bpost in het vak naam, en komt op de envelop. |
| **Bedrijf of afdeling** | Gaat naar bpost in het vak bedrijf of afdeling. Niet verplicht. |
| **Straat, nummer en bus** | Gaat naar bpost in het vak straat. |
| **Postcode en gemeente** | Gaat naar bpost in het vak postcode en gemeente. |
| **Land** | Een landnaam of een code van 2 letters (NL, FR). Gaat enkel mee bij een adres buiten België. Niet verplicht. |
| **Tonen bij het verbeteren** | Gaat **niet** naar bpost en komt niet op de envelop. Je ziet de waarde wel naast een adres dat je moet verbeteren, als extra uitleg. Bijvoorbeeld een lidnummer of een afdeling. Zo weet je over wie het gaat, zonder dat het op de brief komt. |
| **Niet gebruiken** | We doen er niets mee. |

**Voorbeelden:** naast elke kolom staat een pill met een druppel die zegt in hoeveel rijen de kolom gevuld is, bv. "787/789". Daarnaast staan vijf voorbeeldwaarden. Klik op de naam van de kolom voor meer: tot 20 verschillende waarden, hoeveel verschillende waarden ze heeft, en hoe lang de langste waarde is. Dat kan enkel bij een kolom met waarden.

**Lege kolommen** (zonder één waarde) staan onderaan, onder **Kolommen zonder waarden**, zodat ze niet tussen de rest staan.

**Hoe we een voorstel maken:** we kijken naar de kolomtitels.
- **De export van Contrapunt en de AFT** herkennen we exact.
- **Andere bestanden:** we zoeken Nederlandse, Franse en Engelse woorden, zoals *voornaam*, *prénom*, *straat*, *rue*, *huisnummer*, *bus*, *postcode*, *gemeente*, *land* of *pays*. Kleine tikfouten mogen.
- **Een kolom die we niet herkennen,** zetten we op **Tonen bij het verbeteren**, zodat er niets ongewild op de envelop komt. In een AFT-bestand zetten we die kolommen op **Niet gebruiken**: daar staat hetzelfde adres ook nog eens in andere kolommen.

**Meerdere kolommen voor één vak** mag. We voegen ze samen met een spatie, en lege cellen slaan we over. Zo worden "Kerkstraat", "12" en "bus 3" samen "Kerkstraat 12 bus 3". Elke kolom kan maar één keuze hebben.

**De enveloppen rechts** tonen het adres zoals het op de envelop komt: de tekst uit je lijst, zonder verbeteringen.
- **De eerste envelop (Koppeling)** toont per regel de gekoppelde kolommen. Met de pijltjes ‹ › op een kolom verander je de volgorde binnen een vak. Zo maak je van "Peeters An" weer "An Peeters".
- **Daaronder volgt één envelop per soort adres:** Eenvoudig, Met bus of bijvoegsel, Met bedrijf of afdeling, Buitenland, Lang (meer dan 45 tekens in een vak) en Onvolledig (een verplicht vak is leeg). Met ‹ › blader je door de adressen van die soort. Een soort zonder adressen tonen we niet. Bij een lange lijst kijken we enkel naar de eerste 20.000 rijen.
- **Het land** staat enkel op de envelop bij een adres buiten België.

**Verder naar formaatvalidatie** (rechts bovenaan) wordt pas actief als naam, straat en postcode met gemeente elk minstens één kolom hebben.

## Stap 3: formaatvalidatie

We kijken elk adres na op de regels van bpost: de tekens, de lengte van elk vak, de verplichte vakken en de gekoppelde kolommen. Alle regels staan op de pagina [Formaatvalidatie](formaatvalidatie.md).

De gevonden formaatfouten staan in groepen: vreemde tekens, een schuine streep in het adres, te lang, en jouw input nodig. Per rij zie je het rijnummer in je Excel, het vak, de huidige waarde, wat er mis is en, als dat veilig kan, een voorstel. Klik je op een rij, dan zie je ook de rest van het adres en de kolommen die je op **Tonen bij het verbeteren** zette.

| Je wil | Met de muis | Met het toetsenbord |
|---|---|---|
| Het voorstel overnemen | De knop ↵ naast het voorstel | `Enter` |
| Alle overige voorstellen van een groep overnemen | **Overige … voorstellen overnemen** | |
| Zelf aanpassen | Klik in het veld | `E`, daarna `Enter` om te bevestigen of `Esc` om terug te zetten |
| De oorspronkelijke waarde terugzetten | De knop ↶ in het veld | `⌘Z` (laatste actie ongedaan) |
| De rij uitsluiten of opnieuw opnemen | De knop ✕ | `X` |
| Naar een andere rij | Klik op de rij | `↑` `↓` |
| Verborgen rijen tonen of verbergen | **Toon de … andere rijen** | `→` `←` |

- **Een uitgesloten rij** blijft bewaard, maar gaat niet mee in de mailing.
- **Het vinkje** wordt groen zodra een waarde aan de regels voldoet.
- **Verder naar adrescontrole** wordt rood zodra er geen formaatfouten meer open staan. Zijn er geen formaatfouten, dan ga je meteen door naar stap 4.
- **Ga je terug naar Koppelen,** dan vervallen je aanpassingen.

## Stap 4: adrescontrole

De adrescontrole bij bpost zit nog niet in deze proefversie. Wel kan je hier het bestand voor de drukker downloaden.

**Download voor de drukker (.xlsx)** geeft je bestand zoals je het opliet:
- **elke rij blijft op haar plaats,** ook lege rijen, met je kolommen ongewijzigd;
- **twee kolommen komen erbij:**
  - *Meesturen*: "ja", of "nee, uitgesloten" voor een rij die je uitsloot. Die rij mag niet gedrukt worden.
  - *Volgnummer bpost*: het nummer waarmee bpost het adres kent, het rijnummer in je bestand. Leeg voor een uitgesloten rij.

Zo blijven je bestand, wat naar bpost gaat en wat er van bpost terugkomt rij per rij aan elkaar gekoppeld. Later komen ook de barcode en het adres zoals het bij bpost aangekondigd is in deze export.

## Meting

Onderaan staat **Meting (POC)**. Het toont hoe lang inlezen en nakijken duurden en hoeveel geheugen de browser gebruikte. Met **Kopieer meting** stuur je die cijfers door. Ze helpen ons bepalen hoe groot een lijst mag zijn.
