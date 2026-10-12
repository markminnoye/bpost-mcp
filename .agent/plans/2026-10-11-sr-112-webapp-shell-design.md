# SR-112: app-shell, mailingoverzicht en opslag op Google Drive (ontwerp)

*Sonic Rocket · 11 oktober 2026 · status: ontwerp goedgekeurd door Mark; v1 gebouwd 12/10 (zonder Drive en domeinlogin), zie [2026-10-12-sr-112-v1-design.md](2026-10-12-sr-112-v1-design.md)*

Brainstorm met Mark over [SR-112](https://linear.app/sonicrocket/issue/SR-112/homepage-redesign-webapp-naar-model-van-github-repositories-overzicht): de webapp op orde brengen naar het model van GitHub ("Repositories"). Vervolg op [Masspost web-flow: ontwerp](2026-10-02-masspost-web-flow-design.md) en op de POC (`/masspost/poc`, plan [2026-10-05](2026-10-05-masspost-poc-formaatvalidatie.md)).

- **Schets:** [`docs/ontwerp/webapp/app-shell.html`](../../docs/ontwerp/webapp/app-shell.html) (interactief, licht en donker; rechtsonder de schetsbediening voor de andere schermen en toestanden).
- **ADR's:** [0007 opslag op Drive](../../docs/adr/0007-mailings-op-google-drive.md), [0008 Drive-token](../../docs/adr/0008-drive-token-browser-of-server.md), [0009 tenant = Workspace-domein](../../docs/adr/0009-tenant-is-workspace-domein.md).

## Samenvatting

- **Wat:** een homepagina met enkel "Aanmelden met Google", daarna een app-shell in GitHub-stijl met een inklapbare zijbalk (Mailings · Deposits · Archief · Instellingen) en een overzicht van de mailings. "Nieuwe mailing" start de flow van de POC, die zo naar productie gaat.
- **Waarom:** meerdere mailings naast elkaar opvolgen, de POC in gebruik nemen, en de adressen bij de klant houden: Sonic Rocket bewaart ze niet.
- **Voor wie:** organisaties met een Google Workspace, eerst Contrapunt. Sonic Rocket test op het eigen domein `sonicrocket.be`.
- **Opslag:** geen database voor mailings. Per mailing een map op de Gedeelde drive van de tenant, met `mailing.json` en de bestanden. De browser praat rechtstreeks met de Drive API, met het Google-account van de gebruiker. De bestaande database blijft voor login, tenants en instellingen.
- **Niet in deze ronde:** Deposits (enkel een landingspagina), de harde koppeling met het CRM van Contrapunt, rollen per gebruiker, eigen barcodereeksen ("Contrapunt, 11 cijfers" is zichtbaar maar niet te kiezen), en statussen na de formaatvalidatie (die komen met SR-80 en SR-88).

## Aannames

1. Minder dan 10 gebruikers per tenant, tientallen lopende mailings en enkele honderden per jaar, tot 25.000 adressen per mailing.
2. De lijst staat binnen ±2 s op het scherm: één Drive-oproep, `mailing.json` wordt pas gelezen bij het openen.
3. Geen adressen in onze database of logs. Adressen gaan enkel van de browser naar Drive, en later via onze server naar de FTP van bpost.
4. Elke gebruiker van een tenant mag alles, ook Instellingen. Rollen komen later.
5. De stijl volgt de POC: CSS-variabelen en CSS modules, Geist, licht als standaard en zwarte hoofdknoppen. Geen Tailwind of shadcn (fase 3 van het plan van 01/10 noemde die nog). Dit is nog te bevestigen bij het implementatieplan.
6. In deze versie bereikt een mailing enkel Opgeladen, Gekoppeld en Formaatvalidatie. De lijst kan wel alle statussen uit `statusiconen.html` tonen.

## Ontwerp

### 1. Architectuur en gegevens

**Code.** De Drive-logica zit in de library en draait in de browser:

- `src/core/masspost/store/` bevat:
  - het Zod-schema van `mailing.json`, met een versie;
  - de interface `MailingStore`;
  - `DriveMailingStore`, die met `fetch` met de Drive-REST praat en een functie `getAccessToken()` krijgt;
  - `MemoryMailingStore`, voor tests en voorbeelddata.
- Geen nieuwe bibliotheek voor Drive.
- Onze server praat nooit met Drive.

**Structuur op de Gedeelde drive.** De hoofdmap wordt gekozen in Instellingen:

```
bpost-e-masspost/
  CP-2026-15 Nieuwsbrief december/
    mailing.json          ← gegevens, koppeling, correcties, uitsluitingen, status, logboek
    <originele naam>.xlsx ← bij "Verder naar koppelen"
    exports/              ← AFT .xls en het bestand voor de drukker (naast de download)
    (later) de XML naar bpost en de antwoorden
```

**`mailing.json`** (voorstel; het Zod-schema legt de definitieve vorm vast):

```json
{
  "schemaVersion": 1,
  "revision": 7,
  "code": "CP-2026-15",
  "title": "Nieuwsbrief december",
  "customer": { "name": "Kunstencentrum Noord", "crmId": null },
  "expectedDeliveryDate": "2026-10-24",
  "format": "Small",
  "priority": "NP",
  "genMID": "7",
  "genPSC": "N",
  "roundAndSequence": false,
  "status": "format",
  "archived": false,
  "source": { "fileId": "…", "name": "adressen.xlsx", "size": 123456, "sha256": "…" },
  "mapping": { "order": [], "roles": {} },
  "corrections": {},
  "excludedRows": [],
  "counts": { "addresses": 1246, "formatIssuesOpen": 26 },
  "arr": null,
  "log": [{ "at": "…", "by": "an@contrapunt.be", "event": "created" }],
  "created": { "at": "…", "by": "…" },
  "modified": { "at": "…", "by": "…" }
}
```

- `customer.crmId` blijft leeg tot de koppeling met het CRM er is (Q-009).
- De correcties hangen aan het rijnummer in de Excel (besluit 49 van 02/10).

**Snelle lijst.** Elke mailingmap krijgt een samenvatting als Drive-eigenschap (`appProperties`, enkel zichtbaar voor onze app):

- de inhoud: code, titel, status, ARR, afgiftedatum, klant, aantal adressen, gewijzigd op (om op te sorteren) en gearchiveerd;
- de grens: maximaal 124 bytes per sleutel en waarde, dus lange titels worden ingekort;
- de oproep: één `files.list` met `supportsAllDrives` geeft de hele lijst;
- mappen zonder ons kenmerk worden overgeslagen.

**Twee mensen tegelijk.** Elke keer dat de app bewaart:
1. Ze leest eerst het revisienummer.
2. Is dat ondertussen gestegen, dan bewaart ze niet en toont ze "<naam> heeft deze mailing intussen gewijzigd · Herladen".

### 2. Aanmelden en Drive verbinden

**Aanmelden** (NextAuth, zoals nu, op de server):
1. Google vraagt enkel naam, e-mail en foto.
2. Het account moet een Workspace-account zijn (`hd`), en het domein moet bij een tenant horen. Anders volgt de pagina "Geen toegang" met het domein erbij.
3. Er worden geen tenants meer automatisch aangemaakt: de code in `src/lib/auth.ts` die bij elke nieuwe gebruiker een tenant maakt, verdwijnt.

**Drive verbinden** (in de browser, via Google Identity Services; zie ADR 0008):
- De eerste keer toont de lijst "Verbind met Google Drive" met de knop **Verbinden met Drive**. Een browser opent een Google-venster enkel na een klik.
- `login_hint` is het e-mailadres van de aangemelde gebruiker. Achteraf vergelijkt de app het Drive-account (`about.get`); verschilt het, dan volgt een melding.
- Het token staat in `sessionStorage` (per tabblad, weg bij het sluiten) en is maximaal 1 uur geldig.
- Bij een verlopen token probeert de app eerst stil te verversen. Lukt dat niet, dan verschijnt een smalle balk: "De verbinding met Google Drive is verlopen · Opnieuw verbinden". Wat de gebruiker aan het doen was, blijft staan.
- Een strikte Content-Security-Policy: `connect-src` enkel naar onze site en de Google-API's.

**De Drive-toestemming.** Volledige Drive-toegang (`drive`) is bij Google een "beperkte" toestemming. Voor een app die over meerdere domeinen werkt, kan dat verificatie en een jaarlijkse audit vragen. De kleinere toestemming `drive.file` volstaat niet: daarmee ziet een gebruiker de mailings van een collega niet. Dit is een open vraag.

### 3. Tenants en Instellingen

**Database** (uitbreiding van `tenants`, geen adressen):
- `domain` (uniek);
- de id's van de Gedeelde drive en van de hoofdmap;
- het voorvoegsel voor codes;
- de standaardwaarden: formaat, prioriteit, barcode en presortering. `tenant_preferences` bestaat al voor de barcode en kan uitgebreid worden.

**Tenants beheren.** Een domein toevoegen gaat met een script: `npm run tenant:add -- --domain contrapunt.be --name Contrapunt`. De huidige tenant van Mark krijgt het domein `sonicrocket.be`. Gebruikers in een tenant zonder domein komen niet meer binnen.

**Naam en icoon.** Links bovenaan staat de naam van de tenant. Het icoon is het favicon van de website van het domein, via `www.google.com/s2/favicons`. Mislukt dat, dan verschijnt de beginletter in een gekleurd vierkant. Let op: Google geeft een standaardwereldbol terug als er geen favicon is, en die moet als "geen icoon" tellen.

**Instellingen** vervangt het dashboard en staat in het grote vlak. Vier blokken:
1. **Organisatie:** naam (aanpasbaar), domein (alleen-lezen).
2. **bpost:** klantnummer (PRS), account-ID, barcode-klant-ID, gebruikersnaam en wachtwoord (versleuteld). Dat is wat nu op het dashboard staat.
3. **Standaardwaarden:** formaat, prioriteit, barcode (Geen / bpost 7 / 9 / 11; "Contrapunt, 11 cijfers" grijs, binnenkort), presortering en het voorvoegsel voor codes.
4. **Google Drive:** de Gedeelde drive en de hoofdmap. Bestaat `bpost-e-masspost` niet, dan biedt de app aan die map aan te maken.

**De MCP-tokens verdwijnen uit de interface.** Bestaande tokens blijven in de database werken.

### 4. App-shell en lijst

**Geen bovenbalk.** Alles staat in de zijbalk, over de volle hoogte (zoals de Claude-app).

**Zijbalk:**
- **bovenaan** het icoon en de naam van de tenant (16 px, vet), met een lijn eronder over de volle breedte, als spiegel van de lijn boven de gebruiker. Variant in de schets: een donkerdere achtergrond;
- **daaronder** de navigatie: Mailings · Deposits ("binnenkort") · Archief. De actieve pagina krijgt een lichte achtergrond en een blauw streepje;
- **Instellingen** apart, onderaan, net boven de gebruiker;
- **onderaan op één regel:**
  - links de avatar (initialen of foto) met de naam van de gebruiker. Een klik opent een menu naar boven met de naam, het e-mailadres, een schakelaar **Donkere modus** (standaard licht, per browser onthouden) en **Afmelden**;
  - rechts het icoon om de zijbalk in of uit te klappen (per browser onthouden).
- **breedte:** 248 px, ingeklapt 56 px. Ingeklapt blijven het icoon van de tenant, de iconen van de navigatie, de avatar en het uitklapicoon over (die twee onder elkaar), met hovertips.
- **Smaller dan 1024 px** (zoals GitHub): de zijbalk verdwijnt. Naast de paginatitel komt een icoon (zijbalk) dat het menu als paneel van links laat inschuiven, met bovenaan de tenant en een sluitknop, en onderaan de gebruiker. De achtergrond wordt donker. Esc, de sluitknop of een klik ernaast sluiten het paneel, en de focus gaat terug naar het icoon.

**Mailings:**
- de titel met rechts de zwarte knop **Nieuwe mailing**;
- een zoekveld op code, titel en klant (`/` zet de cursor erin, Esc maakt het leeg);
- een kader met de kop "N mailings". Rechts in die kop, zoals bij GitHub:
  - **Sorteren:** Status (standaard: actie nodig, wachten, klaar), Afgiftedatum (vroegste eerst), Laatst gewijzigd (recentste eerst), Code (nieuwste eerst) of Titel (A–Z);
  - **Weergave:** twee regels of één regel (standaard één regel);
  - beide keuzes worden per browser onthouden;
  - in een smal vlak (onder ±860 px) is enkel de weergave met twee regels mogelijk, en dan verdwijnt de schakelaar.

**Een rij** (één regel; twee regels als het inhoudsvlak smaller is dan ±860 px):
- statusicoon: Harvey ball, met de betekenis in een hovertip en voor schermlezers;
- code;
- titel;
- klant-pill;
- aantal adressen: een envelop-pill, oranje onder 500;
- ARR: een gekleurd bolletje met het percentage in gewone tekstkleur;
- afgiftedatum;
- het menu "…".

**De ARR-kleuren** blijven die van besluit 21 (rood onder 96 %, oranje van 96 tot 98 %, groen vanaf 98 %). Als tekst halen oranje en groen op wit het contrast van 4,5:1 niet, daarom het bolletje naast het percentage.

**Volgorde:**
1. Eerst wat actie vraagt, dan wat wacht, dan wat klaar is. De groep komt uit `statusiconen.html`.
2. Binnen "klaar" eerst Ingediend, daarna Afgerond.
3. Daarbinnen op afgiftedatum, de vroegste eerst. Mailings zonder datum komen onderaan.

**Het menu "…":** Openen en Archiveren; in het Archief: Openen en Terugzetten.
- Archiveren toont onderaan "CP-2026-08 is gearchiveerd · Ongedaan maken".
- Later komen Afgegeven markeren en Intrekken erbij.

**Archief:** dezelfde lijst, met de mailings die iemand met de hand archiveerde.

**Deposits:** één landingspagina "Dit onderdeel bouwen we nog".

**Lege staten:** laden (skelet met `aria-busy`), nog geen mailings, Drive niet verbonden, verbinding verlopen, geen map gekozen, niets gevonden.

### 5. Nieuwe mailing en de flow

**Stap 1 Importeren** (`/mailings/nieuw`):
- Bovenaan de stappenbalk van de POC: vier stappen, horizontaal, blijft staan bij het scrollen.
- Daaronder links de titel, een korte uitleg en wat er nog ontbreekt ("Nog nodig: een titel, een afgiftedatum, je adreslijst."). Rechts de zwarte knop **Verder naar koppelen**, zoals in stap 2 en 3 van de POC.
- Het kader **Gegevens van de mailing**:
  - klant (vrij tekstveld met suggesties uit eerdere mailings);
  - titel\*;
  - code\*;
  - geplande afgiftedatum\* (vanaf vandaag);
  - formaat\* (Klein of Groot);
  - prioriteit\* (Non-prior of Prior);
  - barcode;
  - presortering ("bpost maakt de presorteercodes"): verplicht en vast aangevinkt bij klein formaat vanaf 25.000 adressen (meeting 06/10, SR-86);
  - ronde en sequentie ("bpost geeft per brief de sequentie"): enkel bij groot formaat, standaard uit en standaard aan vanaf 10.000 adressen in het bestand, tot de gebruiker zelf kiest.
  - Formaat, prioriteit, barcode en presortering komen uit Instellingen.
- **De code:** het voorvoegsel van de tenant, het jaar en een volgnummer (`CP-2026-15`). Voorgesteld wordt het hoogste nummer van dit jaar in de hoofdmap plus één. De code is aanpasbaar (letters, cijfers en koppeltekens, maximaal 20 tekens) en is ook de `mailingRef` naar bpost.
- **Het sleepvak** wordt enkel grijs als je er een bestand in sleept. Na het inlezen wordt het een kaartje met bestandsnaam, aantal adressen en "Ander bestand kiezen". Een leesfout staat in rood eronder.
- **Kies je een bestand terwijl de titel leeg is**, dan wordt de bestandsnaam de titel.
- **Geen automatische stap.** "Verder naar koppelen" wordt pas actief als alle verplichte velden in orde zijn en het bestand zonder fout ingelezen is.
- **Pas dan maakt de app de mailing op Drive aan:**
  1. ze kijkt opnieuw na of de code vrij is; is ze bezet, dan volgt "Deze code bestaat al. Volgende vrije: CP-2026-16";
  2. ze maakt de map en `mailing.json` aan en zet de Excel erin;
  3. ze gaat naar stap 2.

**Weggaan** (geen knopje "← Mailings"; de zijbalk volstaat):
- In stap 1 met ingevulde gegevens vraagt elke manier van weggaan (zijbalk, terugknop van de browser, tabblad sluiten): "Deze mailing is nog niet aangemaakt. Als je nu weggaat, ben je de ingevulde gegevens en de gekozen adreslijst kwijt. [Weggaan] [Blijven]".
- Vanaf stap 2 komt er geen vraag. Wat nog bewaard moest worden, wordt eerst weggeschreven.

**De pagina van een mailing** (`/mailings/<code>`):
- de titel, gevolgd door de code (klein, in een vaste breedte), en een menu "…" met **Gegevens aanpassen** (naar stap 1; de velden blijven aanpasbaar tot het indienen) en **Archiveren**;
- daaronder de stappenbalk met de pills en de schermen van de POC, ongewijzigd. De themaknop verhuist naar het menu van de gebruiker, onderaan de zijbalk.

**Bewaren:**

| Moment | Op Drive | Status in de lijst |
|---|---|---|
| Verder naar koppelen | map, `mailing.json`, Excel | Opgeladen · kolommen koppelen |
| Koppelen afgerond | koppeling | Gekoppeld, daarna meteen Formaatvalidatie |
| Formaatvalidatie | correcties en uitsluitingen, 2 s na de laatste wijziging | Formaatvalidatie · N open (bij 0: in orde, klaar voor adrescontrole) |
| Bestanden in stap 4 | ook in `exports/` | blijft staan |

**Hervatten:** de app leest `mailing.json`, haalt de Excel van Drive, leest ze in de browser in (SheetJS) en gaat naar de verste stap met een geldig resultaat (besluit 52 van 02/10).

### 6. Fouten, testen en documentatie

**Foutmeldingen** (Vlaams, met één volgende stap):

| Wat | Melding |
|---|---|
| Drive onbereikbaar | "We kunnen je mailings nu niet ophalen · Opnieuw proberen" |
| Bewaren mislukt | De wijziging blijft in de browser, met de balk "Nog niet bewaard · Opnieuw proberen". Weggaan vraagt eerst bevestiging. |
| Geen toegang tot de map | "Je hebt geen toegang tot de map van Contrapunt. Vraag toestemming aan de beheerder." |
| Ander Google-account voor Drive | "Je bent aangemeld als X, maar gaf Drive-toegang als Y." |
| `mailing.json` onleesbaar of een onbekende versie | Die ene rij toont "Kan deze mailing niet lezen"; de rest werkt. |
| Map met de hand gemaakt of hernoemd | Overgeslagen zonder ons kenmerk. Hernoemen kan geen kwaad, want de app werkt met het Drive-id. |

**Testen:**
- **Library (Vitest):**
  - het schema van `mailing.json`, de sortering, het volgnummer en de samenvatting voor `appProperties`;
  - `MemoryMailingStore`;
  - `DriveMailingStore` met een nagebootste `fetch`.
- **Login:** domein bekend, domein onbekend, Gmail, ontbrekende `hd`.
- **Interface:** in de preview met voorbeelddata, daarna een echte proef op de Gedeelde drive van `sonicrocket.be`.

**Documentatie:**
- ADR 0007, 0008 en 0009;
- het projectdossier: DEC-005, open vragen;
- `docs/ontwikkelaars/architectuurmodellen.md`: het Drive-model toevoegen;
- `docs/ontwikkelaars/website.md`;
- `docs/documentatie/webapp/`: `dashboard.md` wordt `instellingen.md`, plus een pagina over het mailingoverzicht;
- `CHANGELOG.md`, dit plan en `INDEX.md`;
- SR-112: de acceptatiecriteria bijwerken.

## Bouwvolgorde

Eerst de library, dan de interface (AGENTS.md):

1. **Library:** het schema van `mailing.json`, `MailingStore` met `MemoryMailingStore` en `DriveMailingStore`, sortering, volgnummer en de `appProperties`-samenvatting, met tests.
2. **Tenants en login:** databasemigratie, domeincontrole in `signIn`, `tenant:add`, de home "Aanmelden met Google" en "Geen toegang".
3. **App-shell:** layout met de zijbalk (tenant, navigatie, gebruiker met menu en thema, inklappen) (de variabelen van `poc.module.css` worden gedeeld), Instellingen (vervangt het dashboard, zonder MCP-tokens), Deposits en Archief.
4. **Mailings-lijst:** eerst op `MemoryMailingStore`, daarna de Drive-verbinding (Google Identity Services, `sessionStorage`, CSP).
5. **Nieuwe mailing:** stap 1 met de velden, de POC-flow op de pagina van een mailing, bewaren, hervatten, de revisiecontrole en de waarschuwing bij weggaan.
6. **Opruimen:**
   - `/masspost/poc`, `/dashboard`, `npm run build:poc`, `scripts/build-masspost-poc-standalone.ts` en `standalone.tsx` verdwijnen, zonder doorverwijzing;
   - de oude home met de MCP- en skill-kaarten verdwijnt;
   - de documentatie wordt bijgewerkt.

**Mark, buiten de code:**
- in Google Cloud de Drive API aanzetten en de toestemming `drive` toevoegen aan het OAuth-scherm (en testgebruikers zolang de app niet geverifieerd is);
- een Gedeelde drive maken in `sonicrocket.be`;
- het domein van Contrapunt doorgeven.

## Besluitenlog

| # | Besluit (Mark, 11/10) | Alternatieven | Waarom |
|---|---|---|---|
| 1 | Mailings op een **Gedeelde drive van de tenant**, niet in een database. Per mailing een map met `mailing.json` en de bestanden. | voorbeelddata · IndexedDB · database zonder adressen · database volledig · Google Sheet als register · één JSON-register | De adressen blijven bij de klant. Wie toegang krijgt, regelt de klant zelf in Drive, en dat is nodig voor de GDPR. Een map per mailing geeft geen botsingen. |
| 2 | De bestaande **database blijft** voor login, tenants, bpost-logingegevens en voorkeuren. | alles uit de database · later bekijken | Kleinste wijziging; geen adressen in de database. |
| 3 | **Multi-tenant: een tenant is een Google Workspace-domein**, door Sonic Rocket vooraf toegevoegd. Geen losse extra adressen, geen tenantwissel. | elk domein vrij · uitnodigingslijst · domein plus extra adressen · zoals nu | Testen op `sonicrocket.be`, Contrapunt op hun eigen domein. Wie bij Contrapunt werkt, heeft een Contrapunt-account. |
| 4 | **De browser praat rechtstreeks met de Drive API**, met het account van de gebruiker. | via onze server · hybride | De adressen passeren onze server niet. |
| 5 | **Het Drive-token komt uit een aparte toestemming in de browser** (Google Identity Services) en staat in `sessionStorage`. **Voorlopig**: na ervaring herbekijken (ADR 0008). | één toestemming bij het aanmelden met een verversingssleutel op de server · enkel in het geheugen | Onze server heeft nooit Drive-toegang. |
| 6 | Home: **enkel "Aanmelden met Google"**. Naam van de tool: **"Mailings voor e-MassPost"**. | aanmelden met uitleg · huidige home met een knop · eigen naam | Rustig; de MCP- en skill-kaarten horen niet bij deze app. |
| 7 | **Shell:** inklapbare zijbalk **Mailings · Deposits · Archief · Instellingen**. Herzien 12/10: zie besluit 26 (geen bovenbalk). | bovenbalk met tenant, themaknop en avatar (eerste versie) | Zoals GitHub. |
| 8 | Het **icoon van de tenant** komt automatisch van de website van het domein, met de beginletter als terugval. | logo opladen · enkel de beginletter | Geen werk voor de gebruiker. |
| 9 | **Volgorde:** actie nodig, wachten, klaar; binnen klaar eerst Ingediend; daarbinnen de afgiftedatum. Herziet besluit 11 van 02/10 (bezig bovenaan). | de flow · enkel de afgiftedatum · groepen met een kop | Wat iets vraagt, staat bovenaan. |
| 10 | **Een rij op één regel:** statusicoon, code, titel, klant, adressen, ARR, afgiftedatum en een menu "…". Zonder "gewijzigd … door …" (herzien 11/10). | twee regels zoals GitHub · statustekst | Snel te scannen; in een smal vlak twee regels, zodat de titel leesbaar blijft. |
| 11 | **Archief = met de hand archiveren** via "…", met Ongedaan maken. | automatisch bij afgerond of ingetrokken · na een termijn · enkel een filter | De gebruiker beslist. |
| 12 | **Deposits** in de zijbalk, met enkel een landingspagina. | – | Nog niet gebouwd. |
| 13 | **Instellingen vervangt het dashboard** en toont de gegevens van het domein, niet die van de gebruiker. `/dashboard` verdwijnt **zonder doorverwijzing**, de MCP-tokens verdwijnen uit de interface. | doorverwijzen · een MCP-blok onderaan | Opruimen. |
| 14 | **Nieuwe mailing = stap 1 Importeren** in de horizontale stappenbalk van de POC, met de gegevens bovenaan het scherm. | een los formulier · een extra eerste stap · verticale genummerde stappen (GitHub, SR-112) | Eén opbouw voor de hele flow. |
| 15 | **Velden in stap 1:** klant, titel\*, code\*, afgiftedatum\*, formaat\*, prioriteit\*, barcode, presortering. Geen omschrijving. | afgiftedatum optioneel · omschrijving | bpost vraagt afgiftedatum, formaat en prioriteit bij `MailingCreate`. |
| 16 | **Barcode:** Geen, bpost 7, 9 of 11 cijfers, en "Contrapunt, 11 cijfers" zichtbaar maar niet te kiezen. | – | Toont dat eigen reeksen komen. |
| 17 | **De code** = voorvoegsel van de tenant (instelling) + jaar + volgnummer, aanpasbaar, en ook de `mailingRef`. | CRM-nummer · vrij · vast voorvoegsel · los van bpost | Eén nummer voor de lijst, de map en bpost. |
| 18 | **Klant:** vrij tekstveld met suggesties; later een harde koppeling met het CRM (`crmId`). | een map per klant · een lijst in de database · `klanten.json` | De CRM-koppeling volgt (Q-009). |
| 19 | **Geen automatische stap na het inlezen.** "Verder naar koppelen" pas als de verplichte velden in orde zijn en het bestand zonder fout ingelezen is. De mailing komt pas dan op Drive. | meteen naar koppelen · aanmaken bij het kiezen van het bestand | Geen halve mailings. |
| 20 | **Geen knopje "← Mailings".** Een waarschuwing bij weggaan in stap 1; vanaf stap 2 is alles bewaard. | het knopje houden · "Annuleren" | De zijbalk volstaat. |
| 21 | **Zwarte hoofdknoppen**, zoals in de POC. Herziet besluit 36 van 02/10 (rood). | rood `#e30613` | Soberder. |
| 22 | **Het sleepvak wordt enkel grijs bij het slepen**, niet bij zweven. | – | Zweven is geen actie. |
| 23 | **Smaller dan 1024 px verdwijnt de zijbalk**, zoals bij GitHub. Een icoon naast de paginatitel opent het menu als paneel van links. Op een breed scherm blijft "Zijbalk inklappen" een smalle balk met iconen (56 px). | eerst enkel iconen (640 tot 1024 px), daarna ☰ in een bovenbalk · inklappen = helemaal weg (GitHub) | Zoals GitHub. |
| 24 | **Sorteren en weergave in de kop van de lijst**, zoals GitHub: Status, Afgiftedatum, Laatst gewijzigd, Code of Titel; twee regels of één regel. Per browser onthouden. Vult besluit 9 en 10 aan: die gelden als standaard. | vaste volgorde en vaste weergave | De gebruiker kiest wat hij nodig heeft. |
| 25 | **Ronde en sequentie** (Round & Sequence) als vinkje in stap 1: enkel bij groot formaat, standaard uit, standaard aan vanaf 10.000 adressen. Presortering vast aan bij klein formaat vanaf 25.000. | automatisch zonder keuze · later in een aparte issue | Frank gebruikt het vanaf 10.000 brieven (meeting 06/10). |
| 26 | **Geen bovenbalk.** De tenant staat bovenaan de zijbalk. Onderaan op één regel: de gebruiker (menu met e-mail, schakelaar Donkere modus en Afmelden) en rechts het icoon om in of uit te klappen. Herziet besluit 7 en de themaknop in de bovenbalk. | bovenbalk · zon/maan-icoon in de onderste regel | Meer ruimte voor de inhoud, zoals de Claude-app. Het thema kies je zelden, dus het mag in het menu. |
| 27 | **Instellingen onderaan de zijbalk**, net boven de gebruiker; Mailings, Deposits en Archief bovenaan. | Instellingen in de rij met de rest | Werk bovenaan, instellingen apart, zoals in de meeste apps. |

## Open vragen

- **Google-verificatie:** volstaat het dat de beheerder van elk domein de app op "vertrouwd" zet, of is een audit nodig? Wat zijn de grenzen zolang de app niet geverifieerd is (aantal gebruikers, geldigheid in testmodus)?
- **Bewaartermijn** van de bestanden op Drive en wie ze wist (Q-008). Besluit 2 van 02/10 (30 dagen na afronding) ging uit van onze database.
- **Grote lijsten:** een Excel van meer dan 25.000 adressen rechtstreeks naar Drive is geen probleem (geen grens van 4,5 MB). Het inlezen in de browser blijft het werk van de POC-metingen.
- **De XML naar bpost:** die gaat later via onze server naar de FTP (SR-88). De server krijgt de XML dan van de browser, niet van Drive.
- **Ronde en sequentie:**
  - Moeten de standaard en de grens van 10.000 instelbaar zijn in Instellingen?
  - Wat betekent "route sequence 2 of 3" uit de meeting van 06/10? Uitzoeken met Frank; misschien het bestandstype `MID2`/`RS3`.
  - Volgens de bpost-gids vraagt het een aparte certificering. Heeft Contrapunt die?
  - De volgorde van het antwoord (printvolgorde `PO` of klantvolgorde `CU`), de sequentiereferentie op de envelop en de volgnummers van de pakketten (eigen logica van Contrapunt): een aparte issue, samen met de export voor de drukker?
- **SR-112 bijwerken:** het criterium "enkel client-side, geen database" wordt het Drive-model. "Genummerde stappen op een verticale lijn" wordt stap 1 in de stappenbalk van de POC.
