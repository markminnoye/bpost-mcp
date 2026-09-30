# Adressen versturen

Je werkt via je AI-assistent. Jij geeft het adressenbestand en de keuzes, de assistent doet het uitzoekwerk.

## Voor je begint

- Bewaar je lijst als **CSV UTF-8** (in Excel: *Opslaan als → CSV UTF-8*). Andere formaten worden geweigerd.
- Een bestand mag maximaal 1.000 rijen bevatten.
- Je lijst heeft kolommen voor naam, straat, huisnummer, postcode en gemeente.

## Zo verloopt het

1. **Bestand aanbieden.** Geef het CSV-bestand aan de assistent.
2. **Kolommen koppelen.** De assistent bekijkt je kolomtitels en koppelt ze aan de velden van bpost. Controleer het voorstel. Zie [Kolommen koppelen](kolommen-koppelen.md).
3. **Controleren.** De assistent controleert elk adres op de regels van bpost en laat de adressen nakijken door bpost. Wat niet klopt, meldt hij in gewone taal. Zie [Fouten begrijpen](fouten-begrijpen.md).
4. **Bevestigen.** Voor het versturen vraagt de assistent je om deze gegevens te bevestigen: referentie van de mailing, verwachte leverdatum, formaat (groot of klein), prioriteit en modus.
5. **Versturen.** Na je akkoord gaat de lijst naar bpost. Een verstuurde lijst kan je niet meer wijzigen.

## Testmodus en productie

- **Test** is de standaard. Er wordt geen echte post verstuurd.
- **Productie** gebruik je pas nadat bpost je heeft gecertificeerd. De assistent vraagt daar uitdrukkelijk om bevestiging.

## Prioriteit

- **Gewoon (NP):** levering na twee werkdagen. Dit is de standaard.
- **Prior (P):** levering na één werkdag.

Verwar dit niet met de modus: "P" bij modus betekent productie.
