# Architectuurmodellen

**Status: analyse, nog geen besluit (5 oktober 2026).** Deze pagina vergelijkt hoe de webapp de gegevens van een mailing kan bijhouden. Het ontwerp van de [website](website.md) gaat voorlopig uit van het Centraal model.

## De vraag

Het verschil tussen de modellen zit niet in **waar er gerekend wordt**, maar in **waar de toestand van een mailing bewaard wordt**: de rijen, de correcties, de status en het logboek.

De regels van de formaatvalidatie (tekens, lengtes, verplichte velden, gekoppelde kolommen) zijn gewone TypeScript-functies in `src/core/masspost/` (`mapping`, `charset`, `validate`). Ze draaien in elk model in de browser, want het ontwerp vraagt live controle tijdens het corrigeren. En in elk model met automatische verzending is er een server nodig om met bpost te praten.

## De modellen

| Naam | Waar staan de adressen | Waar staan status en logboek | Server nodig voor |
|---|---|---|---|
| **Centraal model** | Database (30 dagen na afronding) | Database | Alles: inlezen, opslaan, verzenden, antwoorden ophalen |
| **Lokaal met relay** | Browser van de gebruiker (IndexedDB) | Browser | Enkel doorgeven naar de FTP-server van bpost |
| **Lokaal met portaal** | Browser van de gebruiker | Browser | Niets. De gebruiker laadt de XML zelf op in het bpost-portaal en sleept het antwoord terug in de app. |
| **Gesplitst model** | Browser van de gebruiker | Database (zonder adressen) | Verzenden, antwoorden ophalen, overzicht, logboek |
| **Kluismodel** | Database, versleuteld met een sleutel die de server niet heeft | Database | Bewaren van versleutelde gegevens, verzenden |

"Lokaal model" verwijst naar beide lokale vormen samen.

**Optie binnen het Centraal model:** de Excel in de browser inlezen en de rijen in delen naar de server sturen, in plaats van het bestand op te laden. Dat ontwijkt de uploadlimiet (zie "Vercel en de 4,5 MB" hieronder). De privacy blijft zoals in het Centraal model.

## Wat in elk model gelijk blijft

- **bpost is machine-tot-machine enkel via FTPS bereikbaar.** Een browser kan geen FTP (geen ruwe TCP-verbindingen, en de browsers hebben FTP geschrapt), en de FTP-login hoort niet in de browser. Alleen Lokaal met portaal werkt zonder server, en dan doet de gebruiker het verzenden met de hand.
- **Adressen passeren onze server** in elk model behalve Lokaal met portaal: minstens bij het verzenden, en bij opzoekingen via postcode.eu of AI (die vragen een API-sleutel). Sonic Rocket is dus subverwerker onder de AVG, en een verwerkersovereenkomst is nodig. Het verschil is bewaren tegenover enkel doorgeven.
- **De wachttijd bij bpost:** minuten tot uren. bpost belooft OptiAddress binnen 2 uur en raadt 12 uur marge aan.

## Rechtstreeks met bpost praten vanuit de browser

Getest op 5 oktober 2026 met `curl` en een `Origin`-header van onze site. Een browser laat een pagina het antwoord van een ander domein alleen lezen als dat domein `Access-Control-Allow-Origin` terugstuurt (CORS).

| Doel | Wat we zagen | Gevolg |
|---|---|---|
| e-MassPost-portaal (`bpost.be/e-masspost`) | 301 naar `www.bpost.be/e-masspost`, dan 301 naar de SSO-pagina `login-2.bpost.be/idhub/tb/internal_OSS/sso`. Geen enkele CORS-header. Een preflight (`OPTIONS`) op `www.bpost.be/emasspost` geeft 404 zonder CORS-header. De SSO-server verbreekt de verbinding met `curl` en is niet verder getest. | De browser kan geen antwoord van het portaal lezen. Er is ook geen machine-API om aan te roepen: het portaal is bedoeld voor een mens die zelf aanmeldt. |
| Address Proofing REST (`api.mailops.bpost.cloud/roa-info/externalMailingAddressProofingRest/validateAddresses`) | De preflight geeft 200 met `access-control-allow-origin: *`, en `X-Api-Key` is een toegelaten header. Zonder sleutel: 403. | Technisch kan de browser deze API aanroepen. Het probleem is de API-sleutel, die dan publiek zou zijn. Bovendien maximaal 100 adressen per oproep, geen namen of andere persoonsgegevens, geen compliance-score en geen `MailingCreate`. |
| FTP-server (`filetransfer.bpost.be`) | Een browser kan geen FTP. | Altijd via een server. |

**Over aanmelden:** in het portaal meldt de gebruiker zelf aan, daar is het voor gemaakt. Onze pagina kan die sessie niet gebruiken: de cookies van bpost.be zijn niet beschikbaar voor een ander domein. Het echte probleem is dus CORS en het ontbreken van een API, niet het aanmelden.

**Conclusie:** voor `MailingCheck` en `MailingCreate` is de weg via HTTP dicht, tenzij bpost een machine-API aanbiedt. Die vraag aan bpost blijft open.

Kleine afwijking van de field findings van 28/09: `www.bpost.be/emasspost` gaf toen een 404-pagina. Nu stuurt een `GET` door naar de SSO-pagina, alleen een `OPTIONS` geeft nog 404.

## Feiten die de keuze beïnvloeden

### Vercel en de 4,5 MB

De limiet van 4,5 MB geldt voor de **body van een HTTP-aanvraag naar onze functie en van haar antwoord**. Ze geldt niet voor wat een functie zelf downloadt, zoals een bestand van de FTP-server van bpost. Volgens Vercel hebben streamende antwoorden die limiet niet. Bron: Vercel Docs, "Functions limitations", en de kennisbankpagina "How do I bypass the 4.5MB body size limit".

| Richting | Grootte | Centraal | Lokaal met relay |
|---|---|---|---|
| Excel van de browser naar de server | ±50 B per rij met 8 kolommen, dus de grens ligt tussen 45.000 en 90.000 rijen | **Limiet geldt.** Oplossing: inlezen in de browser, of client-upload naar Vercel Blob. | Niet van toepassing: de Excel blijft in de browser |
| XML van de browser naar de relay | 18 MB per 100.000 adressen, ±1,8 MB na compressie | Niet van toepassing: de server bouwt de XML zelf | **Limiet geldt.** Gezipt past het tot ongeveer 200.000 adressen (±3,6 MB). |
| Antwoord van bpost van de FTP-server naar de functie | Check: ±691 B per adres (17 MB voor 25.000, 66 MB voor 100.000). Create: ±425 B per adres (11 MB voor 25.000, 40 MB voor 100.000). | **Geen limiet.** Streamend inlezen kost 116 tot 156 MB geheugen, ongeacht de grootte (lokaal gemeten). | Idem |
| Antwoord van bpost van de functie naar de browser | Zelfde grootte | Niet van toepassing: de browser krijgt rijen per pagina | **Streamend doorgeven nodig** (FTP-stroom naar HTTP-stroom). Dat mag volgens Vercel. |

bpost aanvaardt gecomprimeerde aanvragen als `….XML.ZIP` (enkel ZIP, geen gzip; tabblad Naslag bpost, pagina Compression and encoding). Live is dat nog niet getest. ZIP gebruikt hetzelfde algoritme (deflate) als gzip, dus de gemeten verhouding van ×10 is een redelijke schatting.

Wel nog te meten: hoe snel de FTP-server van bpost 40 tot 66 MB levert, binnen de maximale duur van een functie (300 s standaard, 800 s maximum).

### E-mail wanneer het antwoord klaarstaat

`Contacts/email` bij `MailingCheck` en `MailingCreate` laat bpost een e-mail sturen zodra het antwoordbestand op de FTP-server klaarstaat (Mark, 05/10/2026, in lijn met de gids). Het bestand zelf zit niet in de e-mail.

- **Centraal en Gesplitst:** de server kan minder vaak pollen. De e-mail zegt wanneer ophalen zin heeft.
- **Lokaal:** de e-mail is het signaal voor de gebruiker om de app te openen, zodat de browser het antwoord kan ophalen.

### Eén verbinding per vijf minuten, één gedeelde map

De FTP-server laat per account maximaal één nieuwe verbinding per vijf minuten toe. Alle antwoorden van een account komen in dezelfde map `\responses`, ongeacht wie de aanvraag stuurde, en bpost vraagt ons die map leeg te maken. Met meerdere gebruikers op één account vraagt dat een centrale plek die verbindingen regelt en weet welk antwoord bij welke mailing hoort.

### Eigen barcodereeks

Een eigen barcodereeks hoort niet bij de MVP, maar staat hoog op de verlanglijst. Ze laat toe om met de productie en het drukken te starten voordat de deposit ingediend is (Mark, 05/10/2026).

- Unieke nummers over alle gebruikers en alle mailingen heen vragen een **centrale, atomaire teller** per barcode-klant-ID. Die bestaat al (`barcode_sequences`).
- In het Lokaal model kan die teller niet in de browser zonder botsingen tussen gebruikers. Ten laatst wanneer deze functie komt, heeft het Lokaal model dus toch toestand op de server nodig.
- Tussen het drukken en de `MailingCreate` moet de barcode per adres veilig bewaard blijven: het gedrukte nummer moet overeenkomen met wat bij bpost aangekondigd wordt. Dat weegt zwaarder naarmate de gegevens kwetsbaarder bewaard worden (zie "Betrouwbaarheid" hieronder).

### FTP en vaste IP-adressen

De gids zegt "Fixed IP required, unknown IPs are blocked". Bij onze test lukten de verbinding en `AUTH TLS`, en volgde op het wachtwoord `530 Login incorrect`. **Inschatting van Mark:** de FTP-server laat alle IP-adressen toe, enkel de logingegevens zijn niet aanvaard.

Dat is aannemelijk, maar nog niet bewezen. Veel FTP-servers controleren een IP-beperking per account pas bij het aanmelden, en geven dan hetzelfde algemene `530` als bij een fout wachtwoord. Bevestigen kan zo:
- na de eerste geslaagde login vanaf twee verschillende IP-adressen inloggen (bv. vanaf een ontwikkelaarstoestel en vanaf een Vercel-functie);
- of het rechtstreeks aan bpost vragen.

Blijkt er toch een whitelist te zijn, dan biedt Vercel gedeelde vaste uitgaande IP-adressen (Static IPs, Pro en Enterprise). Dat geldt voor elk model behalve Lokaal met portaal. Voor de keuze tussen de modellen maakt het dus geen verschil.

## Vergelijking per thema

| Thema | Centraal | Lokaal met relay | Gesplitst |
|---|---|---|---|
| Meerdere gebruikers op één account | Gedeeld overzicht, overnemen van elkaars mailing, logboek "wie deed wat" | Elke gebruiker ziet enkel wat in de eigen browser staat. Overnemen kan alleen met een exportbestand. | Gedeeld overzicht en logboek. Overnemen kan niet zonder het toestel (zie "Het Gesplitst model uitgelegd"). |
| Multi-tenancy | `tenant_id` overal, filter in elke query. Risico: een lek tussen tenants. | Data vanzelf gescheiden. De relay heeft per tenant nog login, rate limit en configuratie nodig. | Zoals Centraal, maar zonder adressen in de database |
| Privacy | Wij bewaren namen en adressen (30 dagen na afronding, plus back-ups) | Bij ons wordt niets bewaard. De data staat op de toestellen van Contrapunt. | Bij ons geen adressen in rust, alleen tijdens het doorgeven |
| Formaatvalidatie | Zelfde regels in de browser (live) en op de server (bron van waarheid). Elke aanpassing wordt bewaard. | Eén keer, in de browser, zonder wachttijd. De relay controleert de XML nog eens. | Zoals Lokaal |
| Correcties van bpost (7001) | De server haalt het antwoord op, bewaart het, voegt per `SEQ` samen en meldt "nieuw antwoord" | Alleen de browser met de rijen kan samenvoegen. De gebruiker moet de app openen. | De server haalt op en ziet wat er binnen is. Samenvoegen gebeurt in de browser met de rijen. |
| Grote bestanden | Uploadlimiet voor de Excel, tenzij inlezen in de browser | Excel blijft in de browser, XML gaat gezipt | Zoals Lokaal |
| Eigen barcodereeks | Teller in `barcode_sequences` | Niet mogelijk zonder teller op de server | Teller op de server |
| Dataverlies | Centrale back-ups | Browseropslag kan gewist worden | Status veilig, adressen en correcties kwetsbaar |
| Ondersteuning | Een ontwikkelaar kan een vastgelopen mailing bekijken | Niemand buiten de gebruiker ziet iets | Status zichtbaar, inhoud niet |
| Bouwen | Meer serveronderdelen, al uitgewerkt in het plan van 01/10 | Minder server, een zwaardere client | Beide, met een duidelijke grens ertussen |
| Kosten | Database, opslag, achtergrondjobs | Laagst | Database zonder adressen, dus kleiner |

**Lokaal met portaal** is de terugvaloptie die vandaag al werkt (alle tests liepen via het portaal). Er is geen server en dus geen whitelist of FTP-login nodig. Alles gebeurt wel met de hand: XML downloaden, opladen, wachten, het antwoord downloaden en terugslepen.

**Het Kluismodel** maakt gedeelde, duurzame opslag mogelijk zonder dat wij kunnen lezen. Daar staat tegenover:
- de sleutel moet tussen collega's verdeeld worden;
- sleutel kwijt is data kwijt;
- de server kan de antwoorden van bpost niet zelf verwerken.

Het is de meest complexe variant.

## Details per thema

### 1. Meerdere gebruikers op één bpost-account

Hier botst het Lokaal model het hardst:

- **Eén gedeelde `\responses`-map.** Een relay zonder geheugen weet niet welk bestand bij welke browser hoort. Ofwel wist hij niets (tegen de vraag van bpost in), ofwel haalt browser A het antwoord van gebruiker B weg. Juist doorsturen vraagt een koppeling van `mailingRef` naar gebruiker, en dat is opslag.
- **Eén verbinding per vijf minuten.** Twee browsers die elk pollen of verzenden, overtreden die regel. Je hebt een centrale wachtrij of een slot nodig. Redis zit al in het project, maar ook dat is toestand op de server.
- **Overzicht, overnemen en logboek** veronderstellen gedeelde toestand: het overzicht met "Bezig" en "Actie nodig", het blijvende logboek met wie en wanneer, en het scenario waarin medewerker A begint en medewerker B afrondt.
- **Dubbel indienen:** twee mensen kunnen dezelfde lijst indienen, en niets centraal houdt dat tegen.
- **Eigen barcodereeks:** zie hierboven.

Het Lokaal model werkt dus zolang één persoon per account werkt, of zolang elke mailing op één toestel blijft.

### 2. Multi-tenancy

**Centraal:** elke tabel krijgt een `tenant_id`, elke query filtert erop, met row-level security in Postgres als vangnet. De login per tenant wordt versleuteld bewaard; dat bestaat al in `bpost_credentials` met AES-256-GCM. Elke tenant krijgt een eigen pollingplanning. Het risico is één vergeten filter.

**Lokaal:** de data is vanzelf gescheiden, het beheer niet. De relay moet weten:
- welke gebruiker bij welke tenant hoort;
- welke FTP-login hij mag gebruiken;
- en hij moet de vijfminutenregel per account bewaken.

Ook het aanmelden met Auth.js gebruikt nu de database. Voor één tot drie tenants kan je met omgevingsvariabelen werken, daarboven is toch een kleine database nodig. "Geen databank" geldt dus voor de adressen, niet voor de configuratie.

### 3. Privacy (AVG)

De rollen zijn in elk model dezelfde:
- de klant van Contrapunt (bv. een vereniging) is verwerkingsverantwoordelijke;
- Contrapunt is verwerker;
- Sonic Rocket is subverwerker;
- Vercel en Neon komen daar nog onder.

**Centraal** vraagt:
- een verwerkersovereenkomst;
- opslag in de EU (Vercel draait in `fra1`, de regio van Neon moet nog nagekeken worden);
- een job die de adressen wist;
- aandacht voor **back-ups**. Met point-in-time restore houdt Neon gewiste rijen bij tot het einde van het restorevenster. "Gewist na 30 dagen" betekent in werkelijkheid 30 dagen plus dat venster.

Bij een datalek zijn alle mailings van alle klanten tegelijk getroffen.

**Lokaal** geeft het sterkste verhaal naar buiten: "wij bewaren uw adressen niet". Bij Lokaal met portaal passeert er zelfs niets langs onze server. Maar de data verhuist naar de toestellen van Contrapunt:
- ze staat onversleuteld in IndexedDB, tenzij de schijf versleuteld is;
- ze is zichtbaar op gedeelde pc's;
- de bewaartermijn van 30 dagen kan de app alleen afdwingen als iemand hem opent;
- exportbestanden om mailings door te geven maken kopieën die niemand meer opvolgt.

De verantwoordelijkheid verschuift naar Contrapunt, ze verdwijnt niet.

**In elk model** bevatten de antwoorden van bpost adressen: een `7001` bevat de verbeterde straat, en met `copyRequestItem=Y` komt het hele adres terug. Met `N` wordt dat minder; dat is nog te testen.

### 4. Formaatvalidatie

Hier verschillen de modellen het minst:

- **Lokaal en Gesplitst voelen sneller:** geen aanvraag per aanpassing, en ongedaan maken werkt lokaal.
- **Centraal moet elke aanpassing bewaren** (wie, wanneer, status). Om 20.000 rijen vlot te houden, bundel je de opslag of stel je ze even uit. In ruil overleeft elke aanpassing een gesloten tabblad, en collega's zien ze ook.
- **Bij Lokaal en Gesplitst controleert de server de XML nog eens met Zod** voor hij naar bpost gaat. Een browser kan een oude versie van de regels in de cache hebben, en in modus `P` hoort die fout niet bij bpost terecht te komen.
- **AI-voorstellen en postcode.eu** hebben een API-sleutel nodig en lopen dus in elk model via de server.

### 5. Correcties op basis van de feedback van bpost

Hier wint het Centraal model:

- **Centraal:** een geplande job haalt het antwoord op (of reageert op de e-mail van bpost), bewaart het, zet de vlag "nieuw antwoord" en kan zelf een mail sturen. De gebruiker hoeft niets open te hebben.
- **Lokaal met relay:** de browser haalt het antwoord via de relay op wanneer de gebruiker terugkomt, streamend doorgegeven. Het inlezen gaat in de browser vlot (streamend, in een Web Worker).
- **In elk model behalve Centraal** kan alleen de browser met de rijen de `7001`'s op `SEQ` samenvoegen.

### 6. Grote bestanden

Hier winnen de lokale modellen. De Excel verlaat de browser niet, dus de uploadlimiet en het servergeheugen spelen geen rol. Het Centraal model haalt hetzelfde voordeel met de optie "inlezen in de browser".

### 7. Betrouwbaarheid

De browser is geen betrouwbare opslag voor iets dat dagen moet blijven bestaan:

- **Safari** wist de IndexedDB van een site als je die 7 dagen lang niet gebruikt hebt (geteld in dagen dat je Safari gebruikt).
- **Chrome** kan opslag wissen als er te weinig plaats is, tenzij `navigator.storage.persist()` toegestaan is.
- **Ook dan kan de data weg zijn:** door IT-beleid, door "browsegeschiedenis wissen", door een andere browser of door een verloren laptop.
- **Na een `MailingCreate` moet je zeker de `mailingRef` en de modus onthouden**, want een intrekking moet in dezelfde modus (`MID-3076`). In het Gesplitst model staan die op de server.

De Excel blijft bij Contrapunt, dus opnieuw beginnen kan. Maar het handwerk van de correcties, en later de toegekende eigen barcodes, is dan weg.

### 8. Bouwen en onderhouden

- **Centraal** volgt de bouwvolgorde van het project letterlijk: library, dan HTTP-API, dan een dunne interface. Een latere MCP kan op dezelfde API steunen.
- **Lokaal** keert de lagen om: de interface wordt de zware laag en de "API" is de library in de browser. Een tweede interface (MCP, Langflow) kan niet aan de toestand, want die zit in één browser.
- **Lokaal brengt eigen werk mee:**
  - het IndexedDB-schema migreren op elk toestel apart;
  - Web Workers voor 100.000 rijen;
  - testen in meerdere browsers;
  - geen toegang voor ondersteuning.
- **Centraal brengt eigen werk mee:**
  - achtergrondjobs (cron, een wachtrij of Vercel Workflows);
  - een job die de adressen wist;
  - databasemigraties;
  - bescherming tegen gelijktijdig bewerken.
- **Gesplitst** heeft beide, met een duidelijke grens: wat geen adres bevat, gaat naar de server.

## Het Gesplitst model uitgelegd

Het Gesplitst model belooft: de server kent elke mailing en haar status, maar bewaart nooit een adres. Dat heeft twee gevolgen.

**1. Een collega ziet de mailing, maar kan ze niet verder afwerken.** Medewerker A laadt maandag de lijst "Nieuwsbrief oktober" op en verbetert de helft van de formaatfouten. Dinsdag is A afwezig. Medewerker B ziet in het overzicht dat "Nieuwsbrief oktober" op actie wacht, want de server kent de status. Maar B kan de rijen niet openen: de adressen en de verbeteringen van A staan alleen in de browser op de laptop van A. B kan alleen:
- wachten;
- A een exportbestand laten sturen;
- of opnieuw beginnen met dezelfde Excel, zonder de verbeteringen van A.

**2. Het antwoord van bpost bevat adressen, en de server mag ze niet bewaren.** De server haalt de antwoorden op, omdat hij de gedeelde map `\responses` en de vijfminutenregel beheert. In dat antwoord staan adressen: de verbeterde straat in elke `7001`, en met `copyRequestItem=Y` het hele adres. Om de belofte te houden, moet de server die adressen bij de juiste browser krijgen zonder ze zelf te bewaren. Dat kan op drie manieren:

| Manier | Hoe | Nadeel |
|---|---|---|
| Laten liggen | Het antwoord blijft op de FTP-server van bpost tot de browser van A online komt. Dan haalt de server het op en geeft het in één stroom door. | De map `\responses` loopt vol tot A de app opent, terwijl bpost vraagt ze leeg te maken. Elke ophaling telt mee voor de vijfminutenregel. |
| Kort bewaren | De server bewaart het antwoord versleuteld tot de browser het afhaalt, met een vaste maximumtermijn (bv. 7 dagen). | De belofte wordt "we bewaren adressen enkel kort en versleuteld". Dat is een klein stukje Kluismodel. |
| Splitsen bij ontvangst | De server houdt bij wat geen adres bevat (status, score, codes per `SEQ`) voor het overzicht en het logboek. De delen met adressen gaan via een van de twee andere manieren naar de browser. | Meer code: elk antwoord wordt in twee delen geknipt. |

## Wat de keuze doet kantelen

1. Moeten collega's bij Contrapunt elkaars mailing kunnen afwerken, niet alleen zien? Als ja: Centraal of Kluismodel. Als zien genoeg is: ook Gesplitst.
2. Komen er binnen afzienbare tijd andere klanten (tenants) bij?
3. Is "wij bewaren geen adressen" een argument voor Contrapunt of voor hun klanten, bijvoorbeeld in een verwerkersovereenkomst of een aanbesteding?
4. Moet een antwoord van bpost verwerkt en gemeld worden terwijl niemand de app open heeft?
5. Blijft een tweede interface (MCP, Langflow) op dezelfde API een doel?
6. De eigen barcodereeks staat hoog op de verlanglijst. Dat vraagt toestand op de server, ten laatst wanneer die functie komt.
7. Wat antwoordt bpost: bestaat er een machine-API, en is er een IP-whitelist?

**Besluiten die zouden wijzigen** (besluitenlogs in `.agent/plans/2026-10-01-masspost-api-and-web.md` en `.agent/plans/2026-10-02-masspost-web-flow-design.md`):

| Model | Wijzigt | Blijft |
|---|---|---|
| Centraal | Niets | Alles |
| Gesplitst | 15, 20 en 28 van 02/10; 3, 5 en 6 van 01/10 | 10 van 01/10 (logboek) en 31 van 02/10 (accountinstellingen). 27 van 02/10 gedeeltelijk: een API voor status en logboek, niet voor adressen. |
| Lokaal | 15, 20, 27, 28 en 31 van 02/10; 3, 5, 6 en 10 van 01/10 | – |

Zie ook [Schaal en limieten](schaal-en-limieten.md) voor de metingen achter de cijfers op deze pagina.
