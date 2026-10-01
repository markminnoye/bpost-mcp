# Masspost: volledige API, dan de website

## Context

De library in `src/core/masspost/` is klaar (Excel → mapping → validatie → XML → FTP), maar bijna niets ervan is via HTTP bereikbaar. Alleen `POST /api/masspost/suggest-mapping` bestaat. De rest draait enkel vanuit scripts en tests. De website zou dus op een lege API-laag staan. Dit plan maakt eerst de API af, daarna de wizard erbovenop. Dat volgt de vastgelegde volgorde in `AGENTS.md`: API eerst, UI daarna.

**Waar de API hoort:** `src/app/api/masspost/`. Dat is de bestaande plek. Next.js haalt routes enkel uit `src/app/`, dus `src/api/` bestaat niet als optie. De lagen blijven:

| Laag | Map | Rol |
|---|---|---|
| Logica | `src/core/masspost/` | Zuivere functies, geen Next.js |
| API | `src/app/api/masspost/` | Dunne routes met een Zod-contract per route |
| Pagina's | `src/app/(tools)/masspost/` | Wizard. De route group voegt geen URL-segment toe, dus de URL is `/masspost`. |

## Stand van zaken: wat nog niet bereikt is

| Punt | Stand |
|---|---|
| MailingCreate / MailingCheck | Live bewezen via het **portaal** (1, 10, 50, 500 adressen: Status 100; 200 adressen: 2RS traag). **Nooit via onze eigen verzending.** |
| MailingDelete | Zod-schema bestaat (`MailingDeleteSchema`), maar er is **geen builder**, geen script, nooit getest. |
| MailingReuse | **Buiten de MVP (Mark, 01/10):** het hoort bij een deposit (`depositIdentifier` is verplicht) en die bouwen we niet. Builder en script-vlag bestaan en de XML is getest, maar niets is bij bpost uitgeprobeerd. In de bpost-docs enkel de XSD en twee foutcodes (MID-3061/3062), geen beschreven flow. |
| FTP-verzending | Niet geslaagd. Diagnose van 01/10 (`docs/samples/contrapunt/generated/ftp-debug-20261001124104.md`, vanaf het ontwikkelaarstoestel): TCP :21, begroeting en `AUTH TLS` werken. De server stuurt **alleen het leaf-certificaat**, dus de TLS-controle faalt. **Opgelost 01/10:** de library voegt het tussencertificaat zelf toe (`bpost-ca.ts`) en de handshake slaagt tegen de live server. Daarna volgt `USER` → `331`, `PASS` → **`530 Login incorrect`**. Whitelist, accountactivatie en onboarding blijven open. |
| Antwoorden verwerken | Geen parsers voor Opti-2RS (7001) en Create-2RS (MID per SEQ), geen download uit `\responses`. |
| Deposit | Niet door ons. **Bewezen 01/10:** Frank kon in modus `P` een deposit koppelen aan `MANUAL20261001140642`, onze Create van 500 adressen. Onze keten mag dus bij de mailing stoppen en we bouwen geen `DepositRequest`. Open: of hij de deposit gevalideerd heeft (dan geeft een delete `MID-3040`) en of hij hem weer verwijdert, want de adressen zijn fictief. De `T`-mailing `MANUAL20260929201329` is voor deze test niet meer nodig. **Verwijder geen van beide mailings zolang Frank niet klaar is.** Het Delete-bestand voor `P` staat klaar maar is niet geüpload. |
| Mode `C`/`P` | **Niet getest.** Alleen onze eigen code dwingt `T` af (`FORCE_TEST_MODE`, een tijdelijke rem omdat Contrapunt "nog niet gecertificeerd" zou zijn). Of bpost `C` of `P` weigert, is nooit nagegaan. De MailingCheck van 500 adressen slaagde in `T`, ondanks het testplafond van 200. Sinds 01/10 maakt `generate:mailing-xml -- --mode C\|P` bestanden voor de uploadtool. De library blijft standaard op `T`. **`P` werkt voor dit account (01/10):** de Create kreeg geen `MID-1020` en Frank kon er een deposit aan koppelen. `FORCE_TEST_MODE` berust dus niet meer op een bpost-regel. Mark beslist wanneer hij weg gaat. |
| API-routes en website | Alleen `suggest-mapping` bestaat. Geen wizard, geen loginpagina, geen indexpagina. |

## Besluiten van Mark (vastgelegd)

1. **Verzenden:** via FTP vanaf Vercel. Mark denkt dat het vaste IP niet nodig is. De handleiding zegt "Fixed IP required", dus we **testen dit eerst echt** (fase 0) in plaats van het te geloven of te negeren.
2. **Toegang:** lijst van toegelaten e-mailadressen in de omgevingsvariabelen, afgedwongen op elke pagina en route.
3. **Opslag:** het Excel-bestand wordt **niet** bewaard. De adresgegevens eruit wel, in een eigen formaat (DB of blob).
4. **Minder dan 500 adressen:** waarschuwen, nooit stil opvullen.
5. **Opslag adressen:** Neon Postgres via Drizzle. Elke rij krijgt later correcties (7001) en een MID-nummer terug, gekoppeld via `SEQ`. Dat is relationeel werk, en de database staat al in het project.
6. **Bewaartermijn:** 30 dagen na afronding van de mailing, daarna automatisch wissen (`deleteAfter` per batch, opgeruimd door een geplande job).
7. **MailingReuse:** valt **buiten de MVP** (Mark, 01/10/2026). Het hoort bij een deposit en die bouwen we niet. De builder blijft in de library, er komen geen route en geen scherm voor.
8. **FTPS-certificaat:** wij voegen het ontbrekende tussencertificaat zelf toe (Mark, 01/10/2026). Gedaan.
9. **Testmodi:** Create en Delete in `T` en `C`, plus één Create of Check in `P`. Reuse valt buiten de MVP. De vlag zit enkel in het script, nooit in een route.
10. **Logboek van de bestandsflow (Mark, 01/10/2026):** alles wat via bestanden loopt (aanvraag, 1AK, 2RS, delete, opruiming op de FTP-server) leggen we gestructureerd vast in de database. Het logboek en de resultaten zonder adres blijven **blijvend** bewaard, adressen en ruwe XML **30 dagen**. Zie fase 2.
11. **Stijl:** Tailwind en shadcn/ui, de bestaande pagina's passen we aan (Mark, 01/10/2026). Eerst schetsen na fase 2, daarna bouwen met v0.

## Nog te bevestigen voor we bouwen

- **`FORCE_TEST_MODE = true`** in `build-request.ts` is onze eigen veiligheidsrem en geen bpost-regel. De code zegt zelf: weghalen "after explicit sign-off". Het plan neemt niet aan dat `C` of `P` geblokkeerd is. We testen het in fase 0b via de uploadtool. Pas na die resultaten beslist Mark of de rem eraf gaat en voor welke modus.

## Fase 0: FTP-spike op Vercel Preview (klein, eerst)

Doel: weten of FTP vanaf Vercel werkt voor we er iets op bouwen.

- Tijdelijke route of script: verbinden met `filetransfer.bpost.be`, `\requests` en `\responses` lijsten, **niet uploaden**.
- **Stand 01/10** (diagnoserapport, zie de tabel hierboven): de TLS-fout komt doordat de bpost-server het tussencertificaat (GEANT TLS RSA 1) niet meestuurt. Mark koos ervoor het tussencertificaat zelf mee te geven. Dat is gedaan in `src/core/masspost/transport/bpost-ca.ts` en doorgegeven via `secureOptions` in `ftp.ts`. Het is vastgepind met een SHA-256 in een test en door een root ondertekend die Node al vertrouwt. Herstelt bpost de keten alsnog, dan kan het weg.
- Daarna blijft `530 Login incorrect` over. Mogelijke oorzaken volgens het rapport: account nog niet geactiveerd, andere FTP-gegevens dan het portaal, of de **Connection and Security Test** is nog niet gedaan. Dat gaat via Frank, contact: customer.operations@bpost.be. Het rapport bevat de drie vragen aan bpost, inclusief de vraag of ons egress-IP op de whitelist staat.
- Het feit dat TCP en `AUTH TLS` vanaf een gewoon IP-adres werken, wijst niet op een blokkade op netwerkniveau. Het bewijst nog niet dat een whitelist bij het inloggen ontbreekt. Pas na een geslaagde login weten we of het IP ertoe doet.
- Uitkomst: (a) werkt, we gaan door; (b) IP geblokkeerd, dan komt een nieuwe keuze (Vercel Static IP, relay of XML-download). Dat is een beslissing voor Mark.
- Let op de regel "maximum 1 verbinding per 5 minuten". Het ontwerp gebruikt dus één verbinding per actie en geen polling-lus.

## Fase 0b: Protocoltests (Create en Delete)

Alle tests via de **uploadtool van het portaal**, zoals de vorige tests. Dat werkt vandaag al en hangt niet af van FTP. Kleine bestanden (1 tot 10 adressen), behalve waar anders vermeld.

- **MailingCreate:** niets nieuws te bewijzen in `T`. De 200-adressen-run herhalen om te zien hoe traag de 2RS echt is (dat bepaalt het ontwerp van "opvolgen"). Later dezelfde run via onze FTP als eindtest van fase 0.
- **Wat de modi zijn** (protocolgids: `schemas/deposit-request.md` en `reference/onboarding.md`): `T` = test om de eigen software te debuggen, volgens de gids maximaal 200 adressen. **In de praktijk aanvaardde bpost 500 adressen in `T`** (Check en Create, 29/09), dus dat plafond wordt niet afgedwongen en de echte grens is onbekend. `C` = certificatiemodus, **voor de certificatiefase**, maximaal 2000 adressen. Die fase is **eenmalig** en de laatste stap voor productie: de hele keten wordt doorlopen, inclusief het afdrukken van de brieven, het sorteren en het posten. Volgens de gids: een fysiek staal van minstens 1000 gebarcodeerde stukken, een mailingbestand met minstens 1000 adressen en een aankondiging in modus `C`. Het staal wordt niet verdeeld. **Contrapunt heeft die certificatie al gedaan (Mark, 01/10).** Voor Contrapunt dient `C` dus niet meer. Het blijft in de library nuttig voor een andere klant die nog niet gecertificeerd is. `P` = productie, volgens de gids pas na een geslaagde certificatie. Zonder certificatie geeft bpost voor `P` de foutcodes **`MID-1020`** ("productiemodus niet toegestaan, klant niet gecertificeerd") of `MPW-5070/5072/5074` ("kan in productiemodus geen mailinglijst verwerken/aanmaken/controleren, klant niet gecertificeerd"). `MID-3072/3073` betekent iets anders: geen certificatie- of barcode-informatie voor de klant. **Wat we zagen (01/10):** de `P`-Create van 500 adressen kreeg Status 100 en geen van die codes. Dat past bij wat Mark bevestigt: Contrapunt is gecertificeerd. De opmerking bij `FORCE_TEST_MODE` ("nog niet gecertificeerd") berustte dus op een verkeerde aanname. De `C`-testbestanden van 01/10 (Check van 5 en Create van 5 adressen, met Delete) zijn voor een al gecertificeerde klant geen risico voor de certificatie.
- **Testmatrix (besluit Mark, 01/10):** MailingCreate en MailingDelete in modus **`T`** en in modus **`C`** (MailingReuse valt buiten de MVP), plus **minstens één** MailingCreate of MailingCheck in modus **`P`**. Bestanden komen uit `generate:mailing-xml -- --mode T|C|P` (zie `docs/internal/masspost-library.md`). `P` vraagt `--confirm-production` en een expliciete `--limit`.

  | Actie | `T` | `C` | `P` |
  |---|---|---|---|
  | MailingCheck | bewezen (portaal) | **bewezen 01/10** (5 adressen, Status 100, 100% gebouwniveau, 5× `7001`) | niet gedaan (Create gekozen) |
  | MailingCreate | bewezen (portaal) | **5 adressen bewezen 01/10** (`MANUAL20261001133940`: Status 100, 5× `MID-4030`, geen `MID-3072/3073`). 500 adressen nog te doen (plafond 2000). | **bewezen 01/10** (500 adressen, `MANUAL20261001140642`: Status 100, 500 unieke `MID-4030`, 99,80% gebouwniveau, 24× `MID-4060`, rij 93 `MID-4010` mét barcode, identiek aan de `T`-Create van 29/09) |
  | MailingDelete | **bewezen 01/10** (`MANUAL20261001135128`, 1 adres: Create Status 100 + `MID-4030`, daarna Delete Status 100) | **bewezen 01/10** (`MANUAL20261001133940`: Status 100, geen berichten, antwoord binnen 7 seconden na de ontvangst) | niet gepland |
  | MailingReuse | buiten de MVP | buiten de MVP | buiten de MVP |

  Voor `P` raad ik **MailingCheck** aan: onze Check bouwt met `genMID=N` en vraagt dus geen barcodes aan, terwijl een Create wel MID-nummers genereert. Wat `P` bij bpost verder teweegbrengt (facturatie, tellers), is niet nagegaan. Mark kiest tussen Check en Create en beslist met Frank over de adressen. Per modus noteren we het antwoord van bpost (Status, `MID-`-codes, limieten). Dat bepaalt of `FORCE_TEST_MODE` weg kan en hoe de wizard modi aanbiedt.
- **MailingDelete: wel nodig.** bpost zegt dat adressen in een bestaande mailing enkel aanpasbaar zijn door te verwijderen en opnieuw aan te maken met een **nieuwe `mailingRef`** (en `fileRef`). De barcodes veranderen dan, enkel de laatste zijn geldig. Dat is dus het herstelpad na een fout (zoals rij 93, die `MID-4010` kreeg én toch een barcode). Test: 1 adres aanmaken, dan verwijderen, 2RS controleren. Daarvoor komt een `buildMailingDeleteRequest` in `build-request.ts` en een vlag in `generate:mailing-xml`. **Nooit op `MANUAL20260929201329` testen.**
- **MailingReuse: buiten de MVP (besluit Mark, 01/10).** Het hoort bij een deposit: de XSD eist een `depositIdentifier`, en we bouwen geen deposits. `buildMailingReuseRequest` en de vlag `--reuse` blijven bestaan (klein, getest op de XML), maar er is geen test bij bpost, geen route en geen scherm. Wat we weten: de XSD (`mailingRef` nieuw, `sourceMailingRef`, `depositIdentifier` verplicht) en de foutcodes `MID-3061` (bron bestaat niet) en `MID-3062` (bron is handmatig aangemaakt). De technische gids beschrijft de actie verder niet. Oppakken pas als Contrapunt een concreet gebruik noemt.

## Fase 1: Fundamenten

**Toegang**
- Nieuwe env-variabele voor de e-mailadressenlijst in `src/lib/config/env.ts` (zoals AGENTS.md eist).
- Controle in de `signIn`-callback van `src/lib/auth.ts`, plus één gedeelde helper voor routes en pagina's. Die geeft ook de gebruiker (id en e-mail) terug, want het logboek legt vast wie wat deed. Een `layout.tsx`-check alleen is niet genoeg.
- Het foutbericht-woordenboek voor auth staat nu in twee routes gekopieerd. Dit is de derde, dus hier uitfactoren naar één plek.
- Contrapunt is single-tenant. Geen `tenantId` nodig voor masspost, de FTP-gegevens komen uit `getFtpCredentials()`.

**Library-fixes** (uit de verkenning)
- `excel.ts`: kolommen verschuiven bij een lege koptekst (A1 leeg), dubbele koptitels vallen samen, geen rij- of groottelimiet, `.xls` afwijzen.
- `file-naming.ts`: gebruikt lokale tijd (UTC op Vercel) en heeft seconde-resolutie, dus botsingen mogelijk. Naar Europe/Brussels en uniek maken. Nu niet geëxporteerd uit `index.ts`.
- `validate.ts`: standaardversie `0100` terwijl de credentials `0200` gebruiken. Altijd expliciet doorgeven.
- `pipeline.ts`: een variant die vertrekt van **opgeslagen rijen** in plaats van van de Excel (`convertRowsToMailingRequest` en `convertRowsToMailingCheck`). De bestaande functies parsen de Excel bij elke aanroep en blijven voor de scripts. De stukken die nodig zijn bestaan al (`rowsToItems`, `buildMailingRequest`, `buildMailingCheckRequest`, `validateMailingRequest`, `buildXml`).
- Minimum van 500: waarschuwing in `ConvertResult`, geen opvulling.
- `parse-response.ts`: parsers voor Opti-2RS (7001 / `compCorrection` per rij) en Create-2RS (MID per SEQ), **streamend** (een `Reply` tegelijk) en met een test op een echt antwoord met `&quot;`. De bestaande `extractMailingResponseMessages` mislukt vanaf ongeveer 250 adressen (zie "Schaal"). Nu bestaat alleen het eenmalige `scripts/apply-opti-corrections.ts`. Ook een Delete-2RS: Status 100, geen berichten, en een **lege `fileName`** wanneer de delete via het portaalformulier kwam. Koppel dus op `mailingRef`, nooit op bestandsnaam. Echte voorbeelden: de zes `MID_0100_251614_REFERENCE0_26100115212x_2RS.XML` in `docs/samples/contrapunt/bpost-roundtrip/` (01/10: Mark verwijderde die zes mailings via de mailinglijst-tool op de bpost-site). Een mailing kan dus ook buiten onze app om verdwijnen, dus de wizard mag nooit aannemen dat een eerder aangemaakte mailing nog bestaat. Onze eigen `MailingDelete`-XML is sindsdien getest in `T` en `C` (fase 0b) en geeft hetzelfde antwoord, nu mét `fileName`. **Status 100 = "The action was successful"** (technische gids, bijlage 1.1 "Status codes", Table 73, p. 129; PDF in `docs/internal/e-masspost/reference/`). 998 = een fatale fout in `Header` of `Context`, waarbij alle acties in het bestand 998 krijgen. 999 = een fatale fout bij het verwerken van die ene actie. De gids zegt ook: een actie zonder `FATAL`-bericht krijgt 100, en `ERROR` is niet-fataal ("the action could still be processed"). Die tabel ontbreekt in onze markdown-docs en dus ook in GitBook, want `errors/status-codes.md` bevat alleen berichtcodes. Voorstel: Table 73 toevoegen aan de submodule. Status 100 zegt niets over elk adres afzonderlijk: bij de `P`-Create kreeg rij 93 een `MID-4010` (ERROR) en toch een barcode. De API toont dus altijd ook de berichten per `Item`, en presenteert Status 100 nooit als "alles is goed".
- `transport/ftp.ts`: functie om `\responses` te lijsten en te downloaden.

## Fase 2: Opslag en API-routes

**Datamodel** (Drizzle, nieuwe migratie via `npm run db:generate`)
Twee bewaartermijnen (besluit Mark, 01/10): **blijvend** voor het logboek en de resultaten zonder adres, **30 dagen na afronding** voor alles met adressen. Een geplande job (cron in `vercel.json`) wist enkel de tweede soort.

| Tabel | Inhoud | Bewaring |
|---|---|---|
| `masspost_batches` | id, maker (gebruikers-id + e-mail op dat moment), naam/referentie, mapping (JSON), modus, status, tijdstempels, `deleteAfter` (afronding + 30 dagen) | blijvend (geen adressen) |
| `masspost_events` | **Logboek, alleen toevoegen.** Per gebeurtenis: batch (leeg voor externe gebeurtenissen), type (aanvraag verstuurd, 1AK, 2RS, delete verstuurd, delete van buiten onze app, FTP-opruiming, handeling van een gebruiker), `mailingRef`, bestandsnaam (leeg bij een delete via het portaal), modus, MID-versie, Status, `MID-`-codes, aantallen, **wie** en **wanneer**, zie hieronder. **Geen adressen.** | blijvend |
| `masspost_row_results` | Per batch en `seq`: MID-nummer, status, codes. **Geen adres.** | blijvend |
| `masspost_rows` | Per batch en `seq`: brongegevens (JSON, met adressen), laatste check-resultaat met correctietekst (7001, bevat straatnamen) | 30 dagen |
| `masspost_row_issues` | Bevindingen en aanpassingen per rij: batch, `seq`, veld, regel, bron (onze regels of bpost), ernst, waarde (met adres), voorstel, status (open, toegepast, afgewezen), door wie (gebruiker of regel) en wanneer. Aantallen en codes zonder waarde gaan blijvend in `masspost_events`. | 30 dagen |
| `masspost_files` | Verwijzing naar het gecomprimeerde ruwe bestand (aanvraag of antwoord) in object-opslag, `sha256`, grootte, richting, bestandsnaam (uniek). De inhoud staat niet in Postgres. | 30 dagen |

**Wie en wanneer in `masspost_events` (besluit Mark, 01/10):**
- **Wie:** `actorType` (`gebruiker`; `systeem` voor de geplande opruiming; `bpost` voor antwoorden van bpost; `extern` voor wat buiten onze app gebeurt, zoals een delete via het portaal, waarvan we de dader niet kennen), `actorUserId` (de Auth.js-gebruiker, zonder verplichte koppeling zodat het logboek blijft bestaan als een gebruiker verdwijnt) en `actorEmail` als momentopname. De gebruiker komt uit de sessie via de gedeelde toegangshelper (fase 1), nooit uit de request.
- **Wanneer: altijd twee tijdstippen.** `recordedAt` is de serverklok (UTC) op het moment dat wij het vastleggen en is altijd aanwezig. `occurredAt` is wanneer het volgens de bron gebeurde, samen met `occurredAtSource`: `xml` (het `timeStamp` van een ontvangstbevestiging), `bestandsnaam` (het tijdstempel in de bestandsnaam) of `ontvangst` (niets anders beschikbaar, dan gelijk aan `recordedAt`).
- **Gemeten in de bestanden van 01/10:** alle 15 ontvangstbevestigingen (1AK) hebben een `timeStamp`, geen enkel van de 20 antwoorden (2RS). Voor een 2RS en voor een delete via het portaal blijft dus alleen de bestandsnaam over.
- **Tijdzone:** bpost schrijft er geen bij, maar het blijkt Brusselse lokale tijd. Een ontvangstbevestiging van 15:41:05 hoort bij een bestand dat om 15:39:40 lokale tijd gemaakt is. In UTC zou ze twee uur vóór het bestand liggen. We zetten dus om van Europe/Brussels naar UTC. Bij de overgang naar wintertijd komt één uur twee keer voor. Dan is de omzetting dubbelzinnig en dient `recordedAt` als houvast.
- Optioneel als extra bron: de wijzigingstijd van het bestand in de FTP-lijst. Niet nagegaan of de tijdzone daarvan betrouwbaar is.
- Het Excel-bestand zelf wordt nooit opgeslagen. Het wordt in het geheugen ingelezen en weggegooid.

**Schaal: tienduizenden tot meer dan 100.000 adressen (Mark, 01/10).** De proefbestanden van 500 adressen zijn daarvoor te klein om uit te besluiten. Gemeten op de bestanden van 01/10, met een schatting voor de rest:

| | 500 (gemeten) | 10.000 | 100.000 |
|---|---|---|---|
| Excel (54 tot 100 B per rij) | 27 KB | 0,5 tot 1 MB | 5,4 tot 10 MB |
| Aanvraag-XML (197 B per adres) | 98 KB | 2 MB | 20 MB |
| Create-antwoord (375 tot 430 B per adres) | 188 tot 214 KB | 4 MB | 38 tot 43 MB |
| Check-antwoord (± 650 B per adres, **schatting** uit 5 adressen) | n.v.t. | 6,5 MB | 65 MB |

Gzip kromp de proefbestanden 11× (aanvraag) en 31× (antwoord). Dat is optimistisch, want de proefadressen zijn erg repetitief. Bpost verwacht zelf grote bestanden: tot 600.000 adressen, MAIL ID binnen 90 minuten en OptiAddress binnen 2 uur, met 12 uur aangeraden marge (`reference/processing-times.md`).

**Gemeten op 01/10** (lokaal, Node 26, synthetische Contrapunt-layout met 8 kolommen, wisselende namen en huisnummers; stuurt niets, de straten komen uit het voorbeeldbestand van 789 rijen):

| | 10.000 rijen | 100.000 rijen |
|---|---|---|
| Excel | 0,5 MB (49 B per rij) | **4,6 MB** (dus boven de 4,5 MB uploadgrens) |
| Inlezen (exceljs, volledig) | 0,17 s | 1,4 s, piek **863 MB** |
| Inlezen (exceljs, streamend, alle rijen bijgehouden) | niet gemeten | 1,0 s, piek **495 MB** |
| Mapping, items, aanvraag bouwen, Zod-validatie | 0,05 s | 0,4 s |
| XML bouwen | 0,05 s, 1,8 MB | 0,5 s, **18,3 MB** (191 B per adres) |
| Gzip van de XML | 0,2 MB (×10) | **1,8 MB** (×10) |
| Hele keten, piekgeheugen | **256 MB** | **1,04 GB** (3,3 s) |

Vercel (docs, bijgewerkt 24/08/2026): geheugen 2 GB standaard en 4 GB maximum op Pro, duur 300 s standaard en 800 s maximum op Pro, aanvraag en antwoord maximaal 4,5 MB. Lineair doorgetrokken (een **extrapolatie**, geen meting) is dat ongeveer 9 KB per rij: de 2 GB raakt dan op bij zo'n 200.000 rijen, en 600.000 rijen past niet in één geheugen. De gzip-verhouding hield stand (×10) met wisselende namen, wat het eerdere ×11 uit het voorbeeld bevestigt.

**Grens van de huidige code (gemeten, 01/10).** Dezelfde meting voor 200.000, 300.000 en 600.000 rijen gaf een piekgeheugen van 1,95 GB, 2,79 GB en 3,48 GB, en 6, 9 en 18 seconden. Alles in één keer in het geheugen houden past dus veilig tot ongeveer 150.000 rijen op 2 GB en tot ongeveer 300.000 op 4 GB. De 600.000 rijen van bpost halen 3,5 GB en zijn te krap. Dat zijn afgeleide grenzen, op een laptop gemeten. Boven 500 adressen is er nog **nooit iets naar bpost gestuurd**. Zie `docs/ontwikkelaars/schaal-en-limieten.md`. Het meetscript staat niet in de repo (scratchpad).

**Het antwoord van bpost inlezen (gemeten, nagebootste antwoorden uit de echte structuur):** 40 MB bij 100.000 adressen voor een Create en 66 MB voor een Check. Als boom (de huidige `parseXml`) kost 100.000 adressen 470 MB en 300.000 adressen 1,12 GB. Streamend is het 116 tot 156 MB, ongeacht de grootte, en 0,1 tot 0,2 s. **De huidige parser mislukt op echte antwoorden vanaf ongeveer 250 adressen**: elk adres heeft vier `&quot;` in zijn XPath en `fast-xml-parser` stopt bij 1000 vervangingen. Bewezen op het echte antwoord van 500 adressen van 29/09 (2002 vervangingen). Er is nu geen schade, want de functie draait in geen enkele echte flow, maar de parser voor antwoorden per adres moet dit meenemen en streamend werken.

**Niet gemeten:** opslaan in Postgres (Neon) en de FTP-upload van 18 MB.

Gevolgen voor het ontwerp:
1. **Uploadgrens.** Vercel weigert een aanvraag boven 4,5 MB. Gemeten: 100.000 rijen met 8 kolommen is 4,6 MB, net te veel. Met meer kolommen gebeurt dat eerder, bij 100 B per rij al vanaf ongeveer 45.000 rijen. Opties: de Excel in de browser inlezen en de rijen in delen versturen (mijn voorkeur, want de Excel verlaat de browser nooit), of een tijdelijke upload naar object-opslag. Te beslissen bij het contract van `POST batches`.
2. **Alles in delen, hervatbaar en herhaalbaar.** Rijen opslaan, valideren, de XML opbouwen en antwoorden inlezen gebeuren per deel van enkele duizenden rijen, gekoppeld aan `(batch, seq)`, zodat een onderbroken taak verder kan zonder dubbels.
3. **Tijd.** Het rekenwerk is geen probleem (3,3 s voor 100.000 rijen). De I/O is dat misschien wel: de database, de FTP-upload en het antwoord van bpost zijn niet gemeten. De masspost-routes hebben nu 60 seconden (`vercel.json`). Daar kan 300 s of 800 s op. Voor het echte werk is achtergrondverwerking met zichtbare voortgang nodig (te onderzoeken: cron, een wachtrij of Vercel Workflows, dat tijd zonder limiet belooft).
4. **Wachten op bpost** is volledig asynchroon. De gebruiker krijgt een verwachte tijd te zien, en de status blijft bewaard.
5. **Geheugen is de echte grens, niet de tijd.** 100.000 rijen halen 1,04 GB, wat in de 2 GB past. Alles in één keer in het geheugen houden werkt dus tot ongeveer 150.000 rijen, daarboven niet. De Excel inlezen is de zwaarste stap. Een streamende lezer scheelt ongeveer 40%. Als de rijen toch in delen binnenkomen (gevolg 1) en we per deel werken (gevolg 2), valt het probleem weg. Nog te meten voor het contract van fase 2: de databasedriver (grootte van een aanvraag, transacties) en het streamend inlezen van een antwoord van 40 tot 65 MB.
6. **API en schermen:** paginering op elke lijst met rijen, en filters zoals "alleen rijen met problemen".
7. **FTP:** onderzoeken of bpost een gecomprimeerde aanvraag aanvaardt (de foutcodes `MID-2020/2021` wijzen erop), zodat een bestand van 20 MB veel kleiner wordt.

**Dataflow: eerst de database, de XML is afgeleid.**
1. **Upload** (`POST batches`): de Excel inlezen, de mapping toepassen en de rijen **opslaan in `masspost_rows`**. Er komt in deze stap **geen XML**.
1b. **Droogloop (vaste stap, besluit Mark 01/10):** direct daarna worden de opgeslagen rijen, in delen, gevalideerd tegen **alle eisen van bpost**: veldlengtes, verplichte velden, tekenset, de `Item`- en `Comp`-regels. Elke bevinding gaat in de database (`masspost_row_issues`), met een voorstel voor een aanpassing. **Met of zonder mens:** zekere regels (bijvoorbeeld een typografisch teken vervangen) mogen automatisch toegepast worden, de rest wacht op bevestiging van een gebruiker. Elke toegepaste aanpassing legt vast wie ze deed (gebruiker of regel) en wanneer. Dezelfde tabel neemt later ook de correcties van bpost (7001) op. Het enige dat in deze stap niet bewaard wordt, is de tijdelijke aanvraag zelf.
2. **Check** en **Create**: de XML wordt pas hier gebouwd, uit de rijen in de database, met de parameters van dat moment (`mailingRef`, modus, versie, leveringsdatum, `genMID`). Dezelfde rijen geven dus een Check-XML en later een Create-XML onder een nieuwe `mailingRef`.
3. **Verzenden:** de XML die echt verstuurd wordt, bewaren we als **gecomprimeerd bestand (gzip) in object-opslag** (voorstel: Vercel Blob), 30 dagen, en niet als tekst in Postgres. `masspost_files` houdt de verwijzing, `sha256` en de grootte vast. Hetzelfde geldt voor het antwoord van bpost. Daarnaast wordt het antwoord **meteen in rijen omgezet** (`masspost_row_results`, blijvend, zonder adres), zodat de database de waarheid is en de bestanden de back-up.
4. **Correcties (7001):** de gekozen correcties worden bij de rij opgeslagen. De actuele waarde is de mapping van de brongegevens plus de correcties. De XML wordt daarna opnieuw uit de rijen gebouwd, dus nooit aangepast in de tekst.

Waarom niet eerst XML: het is een afgeleid product dat verandert per modus en `mailingRef`, en correcties horen bij rijen, niet in een XML-tekst. Bovendien duurt de flow meerdere aanvragen op een stateless server.
- Het bestaande `audit_log` (`tenantId`, MCP-tools, geen batch, geen inhoud, nergens in `src/` gebruikt) past hier niet. Het blijft onaangeroerd.
- **Volgorde bij antwoorden van bpost, altijd:** ophalen uit `\responses`, opslaan (het gecomprimeerde bestand in object-opslag, de uitkomst als rijen in de database), nalezen dat beide er staan, **pas dan** wissen op de FTP-server. Mislukt het wissen, dan komt het in het logboek en proberen we het later opnieuw. Bpost vraagt zelf dat wij `\responses` opruimen. De unieke bestandsnaam voorkomt dat een bestand tweemaal verwerkt wordt.
- Antwoorden koppelen we aan een batch via `mailingRef` en, als die er is, via de bestandsnaam van de aanvraag. Antwoorden zonder batch (zoals de zes verwijderingen via de website op 01/10) slaan we op als externe gebeurtenis.
- Optioneel te onderzoeken: bpost kan een e-mail sturen zodra een antwoord klaarstaat (meestal binnen enkele minuten, `request-ack-response.md`). Dat zou polling kunnen vervangen, gezien de limiet van één verbinding per vijf minuten.

**Routes** onder `src/app/api/masspost/`. Per route eerst het Zod-contract laten goedkeuren (AGENTS.md), dan implementeren. Dit is een voorstel, niet bindend:

| Route | Doel |
|---|---|
| `POST batches` (multipart) | Excel + bevestigde mapping: inlezen, bewaren als rijen, samenvatting en waarschuwingen teruggeven |
| `GET batches/[id]` | Status en rijen (met paginering) |
| `GET batches/[id]/events` | Het logboek van die batch: alle handelingen in volgorde, ook nadat de adressen gewist zijn |
| `POST batches/[id]/check` | MailingCheck bouwen, valideren, via FTP versturen |
| `POST batches/[id]/corrections` | Door de gebruiker gekozen 7001-correcties toepassen |
| `POST batches/[id]/create` | MailingCreate, alleen als de laatste check boven 98% zat |
| `POST batches/[id]/withdraw` | MailingDelete naar bpost: de **hele** mailing intrekken om fouten te herstellen (daarna opnieuw aanmaken met nieuwe `mailingRef`). Een delete per adres bestaat niet: de XSD kent bij `MailingDelete` alleen `seq` en `mailingRef`. Dat `seq` is het nummer van de **actie** in het bestand, niet van een adres (`Item/@seq` is wel een adres). Meer dan één mailing verwijderen kan in één bestand met `seq` 1, 2, ... Een delete moet in **dezelfde modus** als de Create (`MID-3076`), dus de batch onthoudt zijn modus. Een mailing die aan een **gevalideerde deposit** hangt, kan niet verwijderd worden (`MID-3040`). De route toont dat als een duidelijke melding en zegt dan dat de deposit eerst moet vervallen. |
| `DELETE batches/[id]` | Enkel lokaal: de adresrijen wissen (privacy). Raakt bpost niet. |
| `POST batches/[id]/responses/refresh` | `\responses` ophalen, opslaan, nalezen, wissen op de FTP-server (in die volgorde), parsen en per `SEQ` samenvoegen. Eén FTP-verbinding per aanroep. |
| `GET batches/[id]/xml` | De gebouwde XML downloaden (ook een noodroute naast FTP) |

Bestaand blijft: `suggest-mapping`. Nieuwe routes volgen het patroon daarvan: `dynamic`, `runtime = 'nodejs'`, `maxDuration`, `{ error, code? }` als foutvorm. De glob `src/app/api/masspost/**/*.ts` in `vercel.json` geeft ze al 60 seconden. Het antwoord van bpost komt traag, dus nooit wachten in een request: versturen en later via `refresh` ophalen.

## Fase 2b: Schetsen (na fase 2)

Klikbare schetsen van de schermen, voor er productiecode komt. Ze staan niet in de repo en zijn wegwerpwerk.

- Schermen: login, indexpagina, elke stap van de wizard, en de foutmeldingen (bijvoorbeeld "minder dan 500 adressen", "kolom ontbreekt", "antwoord van bpost nog niet binnen").
- Echte teksten in het Vlaams volgens `.agent/prompts/customer-facing-agent.md`, merkkleur `#e30613`, op basis van wat de API uit fase 2 echt teruggeeft.
- Frank en Contrapunt bekijken de schetsen. Hun opmerkingen gaan in de schetsen, niet in code.
- Uitkomst: een goedgekeurde schermenlijst die als invoer dient voor v0 in fase 3.

## Fase 3: Website

**Stijl en tooling (besluit Mark, 01/10/2026):** Tailwind CSS en shadcn/ui. We bouwen de nieuwe schermen met v0 (Vercel), vertrekkend van de schetsen uit fase 2b.
- Tailwind en shadcn/ui toevoegen aan het project. Dat is nieuw: nu is er enkel `globals.css` met `bp-*`-klassen, geen Tailwind, geen componentenbibliotheek.
- De bestaande pagina's (landingspagina, dashboard, install, reference) gaan over naar dezelfde stijl, zodat de site één geheel blijft. Daarna verdwijnen de `bp-*`-klassen die niet meer gebruikt worden.
- De merkkleur (`--bp-brand: #e30613`) en de Geist-lettertypes blijven. Ze worden thema-variabelen van shadcn.
- v0 levert componenten. Wij controleren ze op de klantregels (Vlaams, geen jargon), op toegang (elke pagina en route) en op de client/server-grens (geen server-code in client-componenten).
- Eerst een ADR schrijven (moeilijk terug te draaien), daarna pas migreren. De migratie van bestaande pagina's krijgt een eigen stap met een visuele controle per pagina, zodat het dashboard niet ongemerkt verandert.

`src/app/(tools)/masspost/`, eerst twee losse pagina's, dan de wizard.

**Loginpagina** (`/login`). Nu bestaat enkel de standaardpagina van Auth.js op `/api/auth/signin`, in het Engels en zonder uitleg.
- Eigen pagina in het Vlaams met één knop "Aanmelden met Google", ingesteld via `pages.signIn` in `src/lib/auth.ts`.
- Een geweigerd e-mailadres (niet op de lijst) krijgt een duidelijke melding ("Dit adres heeft geen toegang. Vraag Mark om je toe te voegen") in plaats van de standaardfoutpagina.
- Na het aanmelden door naar `/masspost`.

**Indexpagina** (`/masspost`). Overzicht van alle verzendingen: referentie, datum, aantal adressen, status (bijvoorbeeld "gecontroleerd", "verstuurd", "wacht op antwoord"), en een knop "Nieuwe lijst". Per rij een link naar de wizard op die stap, zodat een lange wachttijd van bpost geen probleem is. Toont ook de bewaartermijn per lijst en een knop om de adressen eerder te wissen.

**Wizard** (`/masspost/[id]`), stappen:
1. Lijst uploaden
2. Kolommen koppelen met live voorbeeld (client-veilige deep-imports: `mapping`, `suggest-mapping`, `charset`. Nooit de barrel `index.ts`, die trekt server-code mee.)
3. Controleren (OptiAddress)
4. Correcties bekijken en bevestigen
5. Versturen
6. Opvolgen (antwoorden van bpost)

- Alle tekst in Vlaams, niet-technisch, volgens `.agent/prompts/customer-facing-agent.md`. Het pad toevoegen aan de globs in `.cursor/rules/bpost-customer-facing.mdc`.
- Geen stille aannames: afkappingen en vervangen tekens worden altijd getoond, ontbrekende kolommen gemeld.
- Stappenbalk en tabel komen uit shadcn/ui (bestaan nog niet in `bp-*`). Per pagina een eigen `maxDuration` als nodig.

## Fase 4: Docs en afronding

- Elk contract registreren in `scripts/generate-openapi.ts`, dan `npm run docs:build`. `docs/ontwikkelaars/api/overzicht.md` en `http-api.md` bijwerken.
- ADR's: (1) opslag van adresgegevens, (2) toegang via e-mailadressenlijst, (3) FTP vanaf Vercel, naargelang de uitkomst van fase 0, (4) Tailwind en shadcn/ui als stijl (voor de migratie), (5) het extra tussencertificaat voor bpost-FTPS.
- `CHANGELOG.md` onder `## [Unreleased]` bijwerken voor elke commit.
- Dit plan kopiëren naar `.agent/plans/2026-10-01-masspost-api-and-web.md` en registreren in `INDEX.md`. Het oude plan `2026-09-28-bpost-library-web-app.md` verwijst ernaar.
- Verouderde opmerking in `src/core/masspost/index.ts` rechtzetten, en de uitspraak "We are not building a frontend UI" in `docs/internal/project-design.md`.

## Verificatie

- **Per stap:** `npm run lint:fix`, `npx tsc --noEmit`, `npm test`, `npm run docs:check`.
- **Tests:** routes in `tests/app/api/masspost/<pad>/route.test.ts` (auth en adapters mocken, zoals bij `suggest-mapping`). Library in `tests/core/masspost/`. Nieuw: toegangslijst, Excel-randgevallen, 2RS-parsers met echte antwoorden uit `docs/samples/contrapunt/bpost-roundtrip/`.
- **Fase 0:** Preview-deploy, route aanroepen, verbinding en lijst van `\requests` controleren.
- **End-to-end:** met `docs/samples/contrapunt/testadressen-200.xlsx` door de wizard, mode `T`. De 500-run in de modus die fase 0b als werkend aantoont.
- Migratie testen op een Neon-branch voor hij op de hoofddatabase draait.

## Risico's

| Risico | Aanpak |
|---|---|
| FTP geblokkeerd door IP-filter | Fase 0 beslist. Terugvallen op XML-download via het portaal (bewezen). |
| Onvolledige certificaatketen op de bpost-FTP-server, daarna `530 Login incorrect` | Keuze tussen bpost laten herstellen of het tussencertificaat zelf meegeven (Mark beslist). Login, activatie en Connection and Security Test via Frank vragen, parallel aan fase 1. |
| Persoonsgegevens in de database | Bewaartermijn plus automatisch wissen, geen Excel opslaan, geen volledige rijen naar AI sturen. |
| Elke Google-account kan nu al `suggest-mapping` gebruiken | Toegangslijst in fase 1 sluit dat ook af. |
| MCP blijft bevroren | Geen wijzigingen aan `src/app/mcp`. |
