# Requirements

{% hint style="warning" %}
Concept ter nazicht. Status "Besloten" wil zeggen dat het uit de meeting van 23 september of uit een latere afgesproken keuze komt. De rest staat op "Voorgesteld".
{% endhint %}

## Functioneel

| ID        | Requirement                                                                                                                                                                                                             | Status      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| REQ-F-001 | Een adresbestand (Excel) kan ingeladen worden als bron van een mailing.                                                                                                                                                 | Besloten    |
| REQ-F-002 | De applicatie stelt voor welke kolommen naar welke adresvelden gaan (naam, bedrijf/afdeling, straat + nummer + bus, postcode + plaats). De gebruiker bevestigt altijd, het voorstel wordt nooit stilzwijgend toegepast. | Besloten    |
| REQ-F-003 | De applicatie maakt het bpost-bestand aan (MailingRequest, XML of TXT) uit het bevestigde adresbestand.                                                                                                                 | Besloten    |
| REQ-F-004 | Het bestand wordt automatisch naar bpost verstuurd via FTP/FTPS.                                                                                                                                                        | Besloten    |
| REQ-F-005 | De responsfile van bpost wordt opgehaald en gekoppeld aan het oorspronkelijke bestand.                                                                                                                                  | Besloten    |
| REQ-F-006 | De gebruiker krijgt een overzicht van onherkenbare of foute adressen, met de suggestie van bpost per adres, en een rapport dat naar de klant kan.                                                                       | Besloten    |
| REQ-F-007 | De gebruiker krijgt een melding zodra het resultaat van bpost binnen is.                                                                                                                                                | Voorgesteld |
| REQ-F-008 | Als bpost zelf geen suggestie geeft voor een fout adres, doet de applicatie een eigen voorstel. Dit blijft een voorstel dat de gebruiker beoordeelt.                                                                    | Voorgesteld |
| REQ-F-009 | Na de adresvalidatie volgt de verdere workflow: print-to-def (PTD) samenstellen, personalisatie en printbestand genereren.                                                                                              | Voorgesteld |
| REQ-F-010 | Een mailing krijgt een projectnummer uit het CRM van Contrapunt, zodat bestanden stabiel aan het juiste project hangen.                                                                                                 | Voorgesteld |
| REQ-F-011 | In de eerste fase blijft een mens in de lus: de applicatie ondersteunt, Contrapunt beslist.                                                                                                                             | Besloten    |

## Niet-functioneel

| ID        | Requirement                                                                                                                                                                            | Status                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| REQ-N-001 | Gebruiksvriendelijk voor medewerkers zonder technische kennis: eenvoudige UX met live voorbeeld van wat er gebeurt.                                                                    | Besloten                             |
| REQ-N-002 | Contrapunt wil geen externe webserver: de applicatie moet intern of lokaal gehost kunnen worden.                                                                                       | Voorgesteld, zie Q-003               |
| REQ-N-003 | Privacy by default: een volledige adressenlijst gaat nooit naar een extern AI-model. Hoogstens kolomkoppen, eventueel gemaskeerde voorbeeldcellen.                                     | Besloten                             |
| REQ-N-004 | Data van een afgeronde mailing moet volledig verwijderd kunnen worden (bestanden, responses, tussentijdse data, logs en cache). Dit wordt van bij het begin meegenomen in het ontwerp. | Voorgesteld, gefaseerd (zie DEC-009) |
| REQ-N-005 | Persoonsgegevens blijven in de EU, bij voorkeur bij een EU-aanbieder.                                                                                                                  | Voorgesteld                          |
| REQ-N-006 | De applicatie past adressen niet stilzwijgend aan. Correcties gebeuren door de klant aan de bron, de applicatie levert een rapport van onherkenbare adressen.                          | Besloten, zie DEC-003                |
| REQ-N-007 | Eenvoudig te onderhouden: minimale code, dunne en vervangbare interfaces.                                                                                                              | Besloten                             |
| REQ-N-008 | Verpakt als container zodat dezelfde applicatie zowel in de cloud als lokaal bij Contrapunt kan draaien.                                                                               | Voorgesteld                          |
| REQ-N-009 | Volume: het systeem moet het gewenste aantal adressen per bestand en per maand aankunnen.                                                                                              | Open, zie Q-001                      |
| REQ-N-010 | Gebruikers: eerst Contrapunt zelf, later eventueel de klanten van Contrapunt.                                                                                                          | Open, zie Q-002                      |
| REQ-N-011 | Zolang de code publiek staat: geen echte persoonsgegevens, wachtwoorden of sleutels in de repository, ook niet in de geschiedenis. Testbestanden zijn fictief.                         | Voorgesteld, zie DEC-013 en Q-012    |
| REQ-N-012 | De eerste versie werkt volledig zonder LLM, voor Contrapunt-gebruikers. AI en MCP komen later.                                                                                         | Besloten, zie DEC-011                |
