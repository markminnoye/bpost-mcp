# Formaatvalidatie: de regels van bpost

{% hint style="warning" %}
Proefversie. De regels en de schermen kunnen nog veranderen.
{% endhint %}

Voor je adreslijst naar bpost gaat, kijken we na of elk adres aan de regels van bpost voldoet: de tekens, de lengte van elk vak, de verplichte vakken en de gekoppelde kolommen. Dat is de **formaatvalidatie**. Een probleem dat we vinden, heet een **formaatfout**.

We passen niets aan zonder jouw akkoord. Bij een formaatfout doen we een voorstel als dat veilig kan. Je neemt het over, je past de waarde zelf aan, of je sluit de rij uit. Een uitgesloten rij blijft bewaard, maar gaat niet mee in de mailing.

## De vier vakken van een adres

Een adres gaat in vier vakken naar bpost, met het land erbij voor een adres in het buitenland. Bij het koppelen kies je per kolom van je lijst in welk vak ze komt. Kolommen voor hetzelfde vak voegen we samen met een spatie, in de volgorde van je bestand. Zo worden "Kerkstraat", "12" en "bus 3" samen "Kerkstraat 12 bus 3".

| Vak | Verplicht | Maximaal | Extra regel |
|---|---|---|---|
| Naam | Ja (onze keuze) | 50 tekens | |
| Bedrijf of afdeling | Nee | 50 tekens | |
| Straat, nummer en bus | Ja (bpost) | 50 tekens | Geen schuine streep (/) |
| Postcode en gemeente | Ja (bpost) | 50 tekens | Geen schuine streep (/), nooit afgekort |
| Land | Nee | 42 tekens | Enkel meegestuurd bij een adres buiten België. Een code van 2 letters (NL, FR) gaat als landcode mee. Nooit afgekort. |

- **Verplicht volgens bpost:** de straat en de postcode met gemeente vormen samen de basis van een adres in België.
- **Verplicht volgens ons:** een naam. Bpost eist die niet, maar een brief zonder naam komt zelden goed aan.
- **De gekoppelde kolommen:** je kan pas verder als elk verplicht vak minstens één kolom heeft.

## Regels voor elk vak

- **Enkel tekens die bpost kent.** Dat zijn de letters, cijfers en leestekens van een gewoon West-Europees toetsenbord, ook met accenten zoals é, ü, ç of ß. Wie het technisch wil weten: bpost aanvaardt enkel de tekenset ISO-8859-1.
- **Geen regeleinde, tab of verticale streep** (het teken |).
- **Niet langer dan 50 tekens** (42 voor het land). Spaties tellen mee.
- **Een leeg vak dat niet verplicht is,** sturen we gewoon niet mee.

## Tekens die we voorstellen te vervangen

Excel en Word zetten vaak "slimme" aanhalingstekens of lange streepjes in een tekst. Bpost kent die niet. We stellen deze vervangingen voor:

| Teken | Wordt | Wat het is |
|---|---|---|
| `‘` `’` `‚` `‛` | `'` | Gekrulde enkele aanhalingstekens, zoals in D’Hondt of ’t Hooft |
| `“` `”` `„` | `"` | Gekrulde dubbele aanhalingstekens |
| `‐` `‑` `‒` `–` `—` `―` | `-` | Koppeltekens en lange streepjes, ook het koppelteken dat niet afbreekt (‑) |
| `…` | `...` | Weglatingsteken |
| `€` | `EUR` | Euroteken |
| `Ł` `ł` | `L` `l` | Poolse l met streep |
| `Đ` `đ` | `D` `d` | D met streep |
| `Œ` `œ` | `OE` `oe` | Samengevoegde o en e |
| `ı` | `i` | i zonder punt |
| `•` | een spatie | Opsommingsteken, zoals in "Grote Markt 1 • 3de verdieping" |

Daarnaast:
- **Letters met een accent dat bpost niet kent** (bv. ő, ź of ș): we laten het accent weg. Zo wordt Kőrösi Korösi; de ö blijft, want die kent bpost wel.
- **Speciale spaties** worden een gewone spatie, en onzichtbare tekens vallen weg.
- **Twee of meer spaties na elkaar** worden één spatie.

Een teken zonder veilige vervanging (bv. een emoji, of Griekse of Cyrillische letters) krijgt geen voorstel. Dan heeft de rij jouw input nodig.

## Schuine streep in het adres

Bpost leest een schuine streep niet als scheiding in de straat of in de postcode met gemeente.

- **In de straat:** een huisnummer met een schuine streep wordt "bus". Zo wordt "Kerkstraat 12/3" "Kerkstraat 12 bus 3". Een andere schuine streep wordt een spatie.
- **In de postcode en gemeente:** de schuine streep wordt een spatie. Zo wordt "9000/Gent" "9000 Gent".

## Te lang: afkortingen

Is een vak langer dan 50 tekens, dan proberen we deze afkortingen, in deze volgorde, tot het past:

| Woord | Afkorting | In het vak |
|---|---|---|
| Burgemeester | Burg. | Straat |
| Sint | St. | Straat |
| Koningin | Kon. | Straat |
| Koning | Kon. | Straat |
| Generaal | Gen. | Straat |
| Avenue | Av. | Straat |
| Boulevard | Bd | Straat |
| Dokter | Dr. | Straat, naam |
| Professor | Prof. | Straat, naam |
| Monseigneur | Mgr. | Straat, naam |
| Vereniging | Ver. | Naam, bedrijf of afdeling |
| Familie | Fam. | Naam |

- **Enkel hele woorden:** "Sint" wordt "St.", maar "Sinterklaas" blijft staan.
- **Hoofdletters blijven zoals ze waren:** "BURGEMEESTER" wordt "BURG.".
- **Enkel in het vak dat in de tabel staat.** Zo blijft een familienaam als "De Koning" staan.
- **De postcode en gemeente korten we nooit af.** Een gemeente als Sint-Niklaas blijft volledig.

Past het na de afkortingen nog niet, dan doen we geen voorstel en heeft de rij jouw input nodig.

## De groepen op het scherm

| Groep | Wat je doet |
|---|---|
| Vreemde tekens | Er is een voorstel. Neem het over per rij, of alle overige in één keer. |
| Schuine streep in het adres | Idem. |
| Te lang, meer dan 50 tekens | Idem. |
| Jouw input nodig | Er is geen veilig voorstel: een leeg verplicht vak, een teken zonder vervanging of een vak dat te lang blijft. Pas de waarde aan of sluit de rij uit. |

Elke aanpassing kan je terugdraaien met de knop in het veld, of met "Ongedaan maken" na het overnemen van een hele groep.

## Wat we hier niet nakijken

- **Of het adres bestaat** (straat, huisnummer, postcode). Dat doet bpost in de volgende stap, de adrescontrole.
- **De schrijfwijze** van straten en gemeenten. Ook dat komt uit de adrescontrole.
