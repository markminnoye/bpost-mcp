# Adrescontrole bij e-MassPost

{% hint style="warning" %}
Alfaversie. De schermen kunnen nog veranderen.
{% endhint %}

In stap 4 kijkt **e-MassPost** elk adres van je mailing na. Het vergelijkt je adressen met de adressen die het kent, en stelt verbeteringen voor. Je ziet daarna welk deel van je adressen e-MassPost herkent, je kan de adressen verbeteren, en vanaf 96 % dien je de mailing in bij e-MassPost.

Je adressen gaan niet langs onze server: de app maakt het bestand voor e-MassPost in je browser.

## Zo controleer je je adressen

1. Klik bovenaan op **Controleren bij e-MassPost**. Het bestand voor e-MassPost verschijnt bij **Uitgaand**. Het wordt niet vanzelf gedownload.
2. Bij **Uitgaand** staat in het gestippelde vak: **Uitgaand · naar e-MassPost** en *Laad dit bestand op via e-MassPost.* Daaronder het XML-bestand. Een klik in het vak slaat het op, of sleep het bestand in Chrome naar de Finder. Het onderstreepte woord **e-MassPost** in de uitleg bovenaan en in de zin onder de vakken opent het portaal in een nieuw venster; daar laad je het bestand op onder Upload.
3. e-MassPost stuurt eerst een **ontvangstbewijs** en daarna het **antwoord** terug. Bij **Inkomend** staat in het vak: **Inkomend · van e-MassPost** en de korte uitleg. Zolang het vak verder leeg is, staat er *Sleep hierheen of klik om te kiezen*. Elk bestand verschijnt in het vak zodra het er is, met een bestandsicoon. Bij het ontvangstbewijs staat een groen vinkje en het tijdstip waarop e-MassPost het ontvangen heeft.

De app verwerkt een antwoord vanzelf. Zolang het antwoord er niet is, staat er **Wachten op e-MassPost**, en in je overzicht staat een draaiend wieltje bij de mailing.

Zolang er geen automatische verbinding met e-MassPost is, breng je deze bestanden zelf over via het portaal. Later gaat dat automatisch. Ben je het bestand kwijt, klik dan opnieuw op het bestand bij Uitgaand.

Zodra het ontvangstbewijs er is, kleurt de balk onder Adrescontrole een stuk groen. Zo zie je dat e-MassPost het bestand heeft ontvangen, nog voor de score er is.

Zet je een bestand van een andere mailing of van een vorige controle terug, dan zeggen we dat, en gebruiken we het niet.

## De score van e-MassPost (ARR)

Bovenaan staat de **ARR**: het deel van je adressen dat e-MassPost herkent tot op het gebouw.

- **Onder 96 %:** je kan nog niet indienen. Verbeter of sluit adressen uit en laat e-MassPost opnieuw controleren.
- **Vanaf 96 %:** je kan indienen.
- **Vanaf 98 %:** je krijgt extra korting voor datakwaliteit. Je ziet dan een gouden ster.

Verbeter je adressen, dan toont een lichtere lijn op de balk de score die we verwachten. Dat is een schatting: enkel e-MassPost geeft de echte score, bij de volgende controle.

## Wat de groepen betekenen

| Groep | Wat je doet |
|---|---|
| Geen adres gevonden | e-MassPost kent dit adres niet. Typ het juiste adres als straat en nummer, postcode en gemeente, of sluit het adres uit. |
| Meerdere adressen gevonden | e-MassPost vond meer dan één adres dat past. Kies het juiste uit de lijst onder het veld. |
| Voorstel van e-MassPost | e-MassPost stelt een andere schrijfwijze voor, bv. "bus 35" in plaats van "35". Neem het voorstel over met Enter, of laat het zo: het adres telt al mee als juist. |
| Opmerking zonder voorstel | e-MassPost vond het gebouw, maar niet perfect. Optioneel nakijken. |
| In orde | Niets te doen. Verschilt een adres enkel in hoofdletters, dan telt het als in orde. |

Bij elk voorstel staat waar het vandaan komt: **OptiAddress**, de adresdienst van e-MassPost.

Een groep die volledig in orde is, klapt dicht. Met de knop naast de titel open je ze weer.

## Verbeteren, uitsluiten en opnieuw controleren

Je werkt zoals bij de formaatvalidatie: kies een rij met ↑ ↓, druk **Enter** om het voorstel over te nemen of **E** om zelf aan te passen, **X** om de rij uit te sluiten of opnieuw op te nemen, en **⌘Z** om je laatste actie ongedaan te maken. Je aanpassingen gelden ook in de formaatvalidatie, en omgekeerd. Ze blijven bewaard.

Pas je de lijst aan na het versturen, dan zie je **Je wijzigde de lijst na het versturen**. Klik op **Opnieuw controleren** om de lijst met je aanpassingen opnieuw naar e-MassPost te sturen. Dat dient nog niets in.

## Indienen bij e-MassPost

Vanaf **96 %** ARR wordt **Indienen bij e-MassPost** actief (bovenaan, naast Opnieuw controleren). De modus (Test, Certificatie of Productie) kies je al in stap 1; de standaard zet je in [Instellingen](instellingen.md).

| Modus | Wat gebeurt er |
|---|---|
| Test | Proef: e-MassPost aanvaardt de mailing, maar bpost bezorgt niets. |
| Certificatie | Certificatie bij e-MassPost. |
| Productie | Echt: bpost bezorgt deze mailing. |

De afgiftedatum moet een werkdag zijn (maandag tot vrijdag, geen feestdag) en mag niet in het verleden liggen. Pas ze anders aan in stap 1.

Na een geslaagde indiening is de mailing **vergrendeld**: je kan niets meer wijzigen. Je ziet **Ingediend** met de modus, het aantal aanvaarde adressen en het aantal Mail ID’s. Bij Test of Certificatie staat een pill in het overzicht.

## Bestand voor de drukker

Na een geslaagde indiening kan je **Opslaan voor de drukker (.xlsx)** gebruiken. Dat bestand heeft dezelfde rijen als je originele lijst, plus kolommen voor meesturen, volgnummer, **Mail ID** en **adres zoals aangekondigd**. Bij Test of Certificatie heet de Mail ID-kolom **Mail ID (TEST, niet drukken)**.

In het overzicht staat dezelfde actie in het menu **…**, pas nadat e-MassPost de mailing heeft aanvaard.

## Waar e-MassPost je gegevens vindt

De app zet je klantnummer en account-ID in het bestand. Vul ze eerst in bij [Instellingen](instellingen.md). Bij **Verbinding met e-MassPost** zie je hoe de bestanden vertrekken: nu **Manueel**, later ook via Google Drive.
