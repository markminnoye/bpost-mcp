# Beslissingen

{% hint style="warning" %}
Concept ter nazicht. Datums verwijzen naar de meeting van 23 september of naar de projectopvolging. Controleer of de weergave klopt.
{% endhint %}

## Overzicht

| ID      | Beslissing                                                                                          | Datum          | Status                                          |
| ------- | --------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------- |
| DEC-001 | Focus op een lokale desk-oplossing                                                                  | 23/09/2026     | Ter discussie                                   |
| DEC-002 | Aanlevering aan bpost: voor de MVP samengestelde adresvelden in de XML                              | 23/09/2026     | Voorlopig, te testen (zie Q-013)                |
| DEC-003 | De applicatie past adressen niet zelf aan, correcties gebeuren door de klant                        | 23/09/2026     | Besloten                                        |
| DEC-004 | Automatisch versturen naar bpost gaat via FTP/FTPS                                                  | 29/09/2026     | Besloten                                        |
| DEC-005 | Eén bestand per mailing als eenheid, geen centrale databank                                         | 27/09/2026     | Ter discussie, zie Q-004                        |
| DEC-006 | Mens in de lus, voorstellen worden nooit stilzwijgend toegepast                                     | 27/09/2026     | Besloten                                        |
| DEC-007 | Kern als API/library, interface ernaast waar opportuun                                              | 29/09/2026     | Besloten, met nuance                            |
| DEC-008 | Kolommapping: eerst lokale regels, AI enkel als optioneel vangnet en enkel met de kolomkoppen       | 29/09/2026     | Besloten                                        |
| DEC-009 | Gefaseerd bouwen: eerst de aanpak valideren, daarna volledige dataretentie en lokale deployment     | 27/09/2026     | Voorgesteld                                     |
| DEC-010 | Bpost-referentiemateriaal wordt als skill en documentatie bijgehouden                               | 2026           | Besloten                                        |
| DEC-011 | Hosted MCP-route als hoofdpad                                                                       | tot 23/09/2026 | Verlaten, MCP komt later                        |
| DEC-012 | Versturen via HTTP POST                                                                             | tot 29/09/2026 | Vervangen door DEC-004                          |
| DEC-013 | De code staat in een publieke GitHub-repository, waardoor het project in de praktijk open source is | 2026           | Besloten (praktisch), te herbekijken, zie Q-011 |

## Uitwerking

### DEC-001: lokale desk-oplossing

**Richting.** We starten met een lokale of intern gehoste applicatie met een eenvoudige interface voor medewerkers zonder technische kennis. Het MCP-pad ligt momenteel in de koelkast.

**Ter discussie.** Dit is de richting van de meeting van 23 september, maar ze staat nog open voor bijsturing.

### DEC-002: samengestelde adresvelden voor de MVP

**Waarover het gaat.** Dit betreft de velden in de XML die naar bpost gaat: levert de applicatie het adres aan als aparte velden (straat, nummer, bus, postcode, plaats) of als samengestelde velden (naam, straat + nummer + bus, postcode + plaats)?

**Voor de MVP.** We starten met samengestelde velden. Uit de meeting van 23 september kwam de indruk dat bpost samengestelde adressen beter herkent dan gescheiden velden, met lagere scores bij gescheiden aanlevering.

**Nog open.** Dit is half open. We testen wat de beste resultaten geeft: opsplitsen in aparte velden of samengestelde velden. Zie Q-013.

### DEC-003: de applicatie past adressen niet zelf aan

**Wat het inhoudt.** Als bpost een adres niet herkent, past de applicatie dat adres niet zelf aan. Ze toont wat bpost voorstelt en maakt een rapport van de onherkenbare adressen. De klant verbetert die in het eigen adresbestand, aan de bron.

**Waarom.** Wie een adres wijzigt, draagt de verantwoordelijkheid als een mailing daardoor verkeerd of niet aankomt. Door dat bij de klant te laten, blijft duidelijk wie waarvoor instaat.

**Opgelet.** Het samenvoegen van velden voor het bpost-bestand valt hier niet onder. Dat staat in DEC-002. Of een eigen adressuggestie van de applicatie kan, staat als Q-006.

### DEC-004: versturen via FTP/FTPS

**Waarom.** Er blijkt geen machine-API via HTTP te bestaan. De HTTP-modus is enkel de website, waar iemand inlogt en een bestand opgeladen wordt. Voor automatisch en niet-interactief versturen blijft FTP/FTPS over.

**Vervangt.** DEC-012.

### DEC-005: één bestand per mailing

**Richting.** Het bestand per mailing past bij de bestaande werkwijze en bij het rechtenmodel op de server, en vermijdt een centrale databank met persoonsgegevens. We gaan weg van het fragiele samenvoegen van origineel en responsfile, naar één levend record per mailing.

**Ter discussie.** Het ontwerp van de applicatie noemt ook een database. Dat spanningsveld staat als Q-004.

### DEC-006 en DEC-007: mens in de lus, kern als API

**Waarom.** Geen stille aannames, zeker niet bij adressen. De werkende kern (mapping, conversie, validatie) bouwen we als bibliotheek met API, zodat scripts en interface dezelfde logica gebruiken.

**Nuance.** De voorkeur gaat naar de API eerst, maar enkele onderdelen van de interface worden al uitgewerkt. Waar het opportuun is, werken we dus ook in omgekeerde richting, van de interface naar de kern.

### DEC-008: mapping met lokale regels en AI als vangnet

**Waarom.** Voor een bekende indeling, zoals de Address File Tool van bpost, is geen AI nodig. Voor onbekende layouts proberen we eerst synoniemen en fuzzy matching. Een AI-model kan optioneel helpen bij lage zekerheid, en dan enkel met de kolomkoppen, niet met de adressen. Die keuze is gemaakt om geen adressen naar een extern model te sturen.

**Eerste versie.** De eerste versie werkt zonder LLM (zie DEC-011), dus de AI-fallback komt later.

**Alternatieven.** Enkel regels (te beperkt voor onbekende exports) en altijd AI (trager, duurder, meer privacyrisico).

### DEC-009: gefaseerd bouwen

**Voorstel.** De eerste versie valideert de aanpak (Excel naar bpost-bestand, validatielus, suggesties) als gewone applicatie. De architectuur wordt van bij het begin zo opgezet dat een latere lokale deployment bij Contrapunt, met volledige dataretentie, geen herbouw vraagt.

**Spanning.** Dit staat op gespannen voet met REQ-N-002 en REQ-N-004. Zie Q-003.

### DEC-011: MCP-route verlaten

**Wat er gebeurde.** De hosted MCP-service was het hoofdpad. Dat pad is verlaten: MCP komt later. We starten met tooling voor Contrapunt-gebruikers zonder LLM (REQ-N-012). Het MCP-project blijft staan als referentie en kan later hervat worden.

### DEC-013: publieke repository

**Waarom.** De code staat in een publieke GitHub-repository omdat dat gratis samenwerkt met de huidige hosting. Het was een praktische keuze en geen bewuste keuze voor open source.

**Gevolgen.** Iedereen kan de broncode en de volledige geschiedenis lezen, ook oude versies en bestanden die later verwijderd zijn. Er mogen daarom geen echte persoonsgegevens, wachtwoorden of sleutels in staan (REQ-N-011). Dit dossier wordt gesynchroniseerd naar dezelfde repository en is dus ook daar zichtbaar. Zonder expliciete licentie geldt standaard auteursrecht: anderen mogen de code lezen, maar niet vrij hergebruiken.

**Te herbekijken.** Of dit zo blijft, hangt af van hosting en van de vraag of het project later commercieel wordt. Zie Q-011.
