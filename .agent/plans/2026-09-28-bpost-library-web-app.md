# Bpost e-MassPost library + webapp (Contrapunt) — vervangt AFT-skill-plan

*Sonic Rocket · 28 september 2026*

**Vervangt:** [`2026-09-26-contrapunt-aft-address-prep.md`](2026-09-26-contrapunt-aft-address-prep.md)
(stub sinds 29/09 — de lokale AFT-skill bouwen we niet).

## Koers (vastgelegd 29/09/2026)

- **Transport:** FTP/FTPS naar `filetransfer.bpost.be` (unattended). HTTP Basic Auth is geen machine-API.
- **Validatie:** OptiAddress `MailingCheck` in dezelfde XML. Correcties via bericht **7001** / `compCorrection`. Niet de Address File Tool, niet de mailops REST-API, niet een lokaal BeSt-adresregister.
- **Adresvelden:** unstructured Comp **90 / 92 / 93** (naam · straat+nummer · postcode+stad).
- **Protocol:** MAIL ID **2.00 (`0200`)**.
- **Volgorde (locked):** **API/library eerst** (`src/core/masspost/` + eventuele dunne Route Handlers), **pas daarna** een interface (web nu; later eventueel opnieuw MCP). Geen UI vóór de API-surface. Minimale code, makkelijk onderhoud. MCP-productwerk blijft bevroren.

Een AFT-vs-XML-meting is optioneel (`testadressen-200-aft.xls` naast `testadressen-200.xlsx`). Ze kiest het pad niet.

---

## 1. Waarom dit plan verandert

Het vorige plan koos bewust voor **lokaal-only Python, nooit een koppeling met e-MassPost** ("wij
laden niets op en wij kondigen niets aan"). Die beslissing wordt hier expliciet omgekeerd:

- **MCP-tooling gaat in de ijskast.** Geen nieuw MCP-werk; bestaande MCP-routes (`src/app/api/mcp`)
  blijven draaien zoals ze zijn — dit sluit aan bij de lopende Release Freeze.
- We bouwen in de plaats een **werkende library** voor de bpost e-MassPost-integratie, met een
  **webinterface** (niet MCP) als eerste front-end, specifiek voor Contrapunt.
- **Volgorde:** eerst de library/API-code (Excel → validatie → XML → versturen), dan pas de
  interface erbovenop. De interface is vervangbaar — vandaag web, later eventueel ook weer MCP,
  bovenop dezelfde library.

## 2. Understanding Lock (bevestigd)

- **Scope:** vervangt het AFT-plan van 26/09 volledig; geen apart lokaal-only spoor.
- **Repo:** zelfde repo (`bpost-mcp`), hergebruik van bestaande code.
- **Tenancy:** single-tenant voor nu — Contrapunt is de enige klant. Geen DB/Vault/OAuth-laag zoals
  in Phase 2; credentials via env vars, centraal via `src/lib/config/env.ts`.
- **Testcredentials:** beschikbaar (gebruiker bevestigd) — vandaag een echte round-trip tegen
  bpost test-mode mogelijk voor HTTP. FTP vereist bovendien een bij bpost gewhiteliste vaste IP
  (zie Risico's) — dat is nog te bevestigen.
- **Excel-inhoud:** adressenlijst (AFT-stijl), geen envelope-metadata.
- **MAIL ID protocolversie (besluit 28/09/2026):** **default `0200` (versie 2.00)** voor Contrapunt
  (live Status 100). Library ondersteunt ook `0100`/`0102` via `midVersion` / `--version` —
  geen aparte codebases. Env: `BPOST_TEST_MID_VERSION=0200`.

## 3. Wat we leren van Contrapunt's eigen tool (Frank, AFT Converter v7)

Opgeslagen in [`docs/external/contrapunt-aft-converter/`](../../docs/external/contrapunt-aft-converter/README.md)
— volledige analyse daar. Samengevat:

1. **Contrapunt gebruikt de unstructured Comp-velden** (codes **90/92/93**: naam · straat+nummer ·
   postcode+stad), geen structured street/house/postcode-splitsing. Dat is exact wat onze
   `CompCodeSchema` al ondersteunt — we nemen deze strategie over als eerste, eenvoudigste pad.
2. AFT en de volledige `MailingRequest`-XML delen **hetzelfde datamodel** (`Item/Comps/Comp[@code]`).
   AFT is puur een vereenvoudigde upload-wrapper. Onze route (directe XML + HTTP/FTP) omzeilt AFT en
   zijn bestandsformaat-eigenaardigheden (zie punt hieronder) volledig.
3. Frank's tool moest voor de AFT-upload specifiek `.xls` (BIFF8) schrijven — `.xlsx` van openpyxl
   werd geweigerd door bpost's AFT-parser. **Dit probleem is irrelevant voor onze route**: wij bouwen
   zelf XML, bpost hoeft geen Excel/CSV van ons in te lezen.
4. **Verplicht minimum van 500 adressen** (commercieel/contractueel, niet XSD) — **bevestigd 28/09/2026
   door Frank (Contrapunt): geldt breder dan eerst gedacht** (niet enkel één tarief/edge case). Staat
   nergens in onze XSD/protocol-docs; Frank's AFT-tool vult aan tot 500 met een vast Contrapunt-adres.
   Onze library doet dat **nog niet** — wel documenteren en in webapp keuze: waarschuwen vs. gecontroleerd
   opvullen (zelfde patroon als Frank, met SEQ-filler-regels bij merge).
5. SEQ-round-trip (`SEQ` mee de deur uit, exact terug in het antwoordbestand) is bevestigd als het
   officiële koppelmechanisme — bevestigt de aanname uit het oude plan.
6. UX-patroon om over te nemen: kolom-mapping met live preview, geen stille aannames (Frank's
   `sanitize()` knipt wél stil af op 42 tekens zonder melding — dat verbeteren we).

## 4. Architectuur

```
src/core/masspost/          ← NIEUW: pure library, geen Next.js/Redis/DB-afhankelijkheden
  excel.ts                    .xlsx inlezen → { headers, rows }
  mapping.ts                  kolommen → Comp[90/91/92/93], sanitize + niet-stil afkappen
  build-request.ts            rows → Item[] → MailingRequest object (hergebruikt schemas/xml.ts)
  validate.ts                 Zod-validatie met leesbare, per-veld fouten
  transport/
    http.ts                   hergebruikt src/client/bpost.ts (bestaat al)
    ftp.ts                    NIEUW — FTPS client (passive, binary, .TMP-procedure)

src/app/(tools)/masspost/   ← NIEUW: webinterface, dunne laag bovenop src/core/masspost
src/app/api/mcp/            ← ONGEWIJZIGD, bevroren
```

**Waarom `src/core/`:** dit is de "library eerst"-eis letterlijk toegepast. Alles hier is een pure
functie of een kleine class zonder kennis van HTTP-routes, sessies of Redis. De webapp roept dit
aan; een MCP-tool zou later exact dezelfde functies kunnen aanroepen zonder dat `src/core/` wijzigt.

## 5. Milestone vandaag

**Doel:** een Excel-adressenlijst wordt een geldige, gevalideerde `MailingRequest`-XML, en die XML
wordt **zowel via HTTP als via FTP** naar bpost test-mode verstuurd — bewezen met een echte
round-trip, niet enkel unit tests.

**Scope-afbakening:** dit is de library + een script/testroute om ze te bewijzen — **geen
afgewerkte webinterface**. De UI (upload-pagina, mapping-scherm, resultatenoverzicht) komt na
vandaag.

### Taken

- [x] 1. `src/lib/config/env.ts` uitgebreid: single-tenant bpost test-credentials (HTTP: username,
      password, customerNumber, accountId; FTP: host — default `filetransfer.bpost.be` —, username,
      password), optioneel/lazy gevalideerd zodat MCP-routes zonder deze vars blijven werken.
- [x] 2. `src/core/masspost/excel.ts` — `.xlsx` inlezen via `exceljs`.
- [x] 3. `src/core/masspost/mapping.ts` — kolommen samenvoegen naar Comp 90/91/92/93 (Frank's
      strategie), max 50 tekens (niet 42), afkapping expliciet gerapporteerd i.p.v. stil.
- [x] 4. `src/core/masspost/build-request.ts` — `Item[]` + `MailingRequest`-object bouwen,
      hergebruik van `buildXml` (`src/lib/xml.ts`) en `ItemSchema`/`CompSchema`
      (`src/schemas/mailing-request.ts`).
- [x] 5. `src/core/masspost/validate.ts` — Zod-parse met per-veld foutmeldingen.
- [x] 6. `src/core/masspost/transport/ftp.ts` — FTPS-client (`basic-ftp`), passive mode,
      binary, `.TMP`-upload-en-hernoem-procedure naar `\requests`, conform
      `transport/ftp-protocol.md`.
- [x] 7. `src/core/masspost/transport/http.ts` — dunne wrapper rond het bestaande
      `createBpostClient`/`BpostClient.sendMailingRequest`.
- [x] 8. Unit tests (vitest) voor excel → mapping → validate → xml (18 tests, `tests/core/masspost/`).
- [x] 9a. Bewijs-script `scripts/test-transport.ts` (`npm run test:transport [-- --ftp]`) geschreven
      en smoke-getest (faalt correct + leesbaar zonder credentials).
- [x] 9b. **Live round-trip tegen bpost test-mode geprobeerd.** Resultaat hieronder (§9) — HTTP
      bleek fundamenteel het verkeerde model; FTP bereikt bpost's server correct maar wacht op
      bpost's eigen FTP-onboarding ("Connection and Security Test").
- [x] 10. `npm run lint:fix` · `npx tsc --noEmit` · `npm test` — alle groen (52 testbestanden, 314 tests).
- [x] 11. `CHANGELOG.md` bijgewerkt onder `## [Unreleased]`.
- [x] 12. **Onverwachte vondst tegelijk opgelost** (user-goedgekeurd, buiten oorspronkelijke scope):
      `buildXml()` rendeerde scalaire velden als child-elementen i.p.v. XML-attributen — in strijd
      met de MailingRequest/DepositRequest XSD's. Trof ook `submit_ready_batch`, `check_batch` en de
      deposit-flows. Fix zit nu in `buildXml()` zelf (`src/lib/xml.ts`), dus alle aanroepers zijn
      automatisch mee gefixt, geen call-site-wijzigingen nodig. Regressietests: `tests/lib/xml.test.ts`.

## 5b. Live testresultaat (28/09/2026) — grote vondst

**HTTP blijkt fundamenteel het verkeerde model voor automatisering.**
`https://www.bpost.be/emasspost` (het adres dat `src/client/bpost.ts` gebruikt, en dus ook
`submit_ready_batch`, `check_batch`, `bpost_announce_deposit`, `bpost_announce_mailing`) geeft een
**echte bpost-404-pagina** terug — geen API-fout. Verder onderzoek:

- De actuele pagina `bpost.be/e-masspost` (met koppelteken) **redirect (301) naar
  `login-2.bpost.be/idhub/tb/internal_OSS/sso`** — een SSO-inlogportaal.
- Onze eigen documentatie (`transport/http-protocol.md`) beschrijft "HTTP-modus" zelf als
  *interactief*: een mens logt in via de browser en vult webformulieren in of laadt een bestand op.
  **Geen machine-naar-machine API met Basic Auth**, wat `BpostClient` wél veronderstelt.
- `transport/ftp-protocol.md` noemt FTP expliciet *"unattended mode"* — de modus die wél voor
  systeem-naar-systeem bedoeld is, zonder mens ertussen.

**Gevolg:** de bestaande `BpostClient`/HTTP-implementatie (gebruikt door de nu al "✅ voltooide"
MCP-tools) lijkt nooit tegen een echte, huidige bpost-omgeving getest te zijn en werkt vermoedelijk
niet voor automatische verzending. Dit is breder dan de scope van vandaag — apart traject nodig
(zie Risico's).

**FTP werkt beter dan verwacht, maar is nog niet volledig live getest.** `sendXmlViaFtp()` bereikt
`filetransfer.bpost.be` daadwerkelijk (geen timeout, geen "connection refused" — dus geen
IP-whitelisting-blokkade) en start een correcte FTPS-handshake, maar loopt vast op
*"unable to verify the first certificate"*. Dat wijst op een onvolledige certificaatketen — precies
wat je verwacht wanneer bpost's eigen onboardingstap **"Connection and Security Test (FTP Only)"**
(zie `reference/onboarding.md`) nog niet doorlopen is. Dit is dus geen codefout, maar een
ontbrekende onboardingstap bij bpost.

**Actie:** Frank/Contrapunt vragen om die FTP Connection & Security Test met hun technisch
specialist te doorlopen (contact: Business Contact Centre, 02 201 11 11, of
customer.operations@bpost.be). Zodra dat achter de rug is, zou `npm run test:transport -- --ftp`
moeten slagen zonder codewijzigingen.

## 6. Wat na vandaag (niet in scope nu)

- Webinterface: upload, kolom-mapping met live preview (Frank's UX-patroon), validatierapport,
  verzend-bevestiging.
- Antwoord inlezen + SEQ-merge naar een werkbestand: Create-2RS (MID per SEQ) en Opti-2RS
  (`7001` / `compCorrection`). Zelfde koppeling als SEQ in een AFT-antwoord, andere drager.
- **500-rijen-minimum (bevestigd Frank 28/09):** in library/webapp verwerken — waarschuwing onder drempel,
  optioneel gecontroleerde opvulling (Frank-patroon) vóór verzenden; `--simple` / `--synthetic` blijven
  enkel voor lokale XML/bestandsnaam-smoke tests.
- Eventueel: MCP-tools die dezelfde `src/core/masspost`-functies aanroepen, zodra we uit de
  ijskast komen.

## 7. Risico's

| Risico | Aanpak |
|---|---|
| **Nieuw, groot (28/09): HTTP-verzending (`BpostClient`) werkt mogelijk niet voor automatisering** — `www.bpost.be/emasspost` blijkt een 404, de actuele e-MassPost-pagina redirect naar een SSO-loginportaal. Treft ook de bestaande `submit_ready_batch`/`check_batch`/deposit-tools. | Focus nu volledig op FTP (user-beslissing 28/09). Apart traject nodig om te bepalen of er een correcte machine-API bestaat voor HTTP, of dat FTP de enige geautomatiseerde weg is — buiten scope van vandaag. |
| FTP-certificaatketen onvolledig ("unable to verify the first certificate") | Wijst op bpost's ontbrekende **"Connection and Security Test"**-onboardingstap (zie `reference/onboarding.md`). Actie bij Contrapunt/bpost, geen codefix. |
| FTP vereist mogelijk ook een vooraf gewhiteliste vaste IP bij bpost | Nog te bevestigen via dezelfde onboardingstap — de huidige TLS-fout kwam vóór een eventuele IP-blokkade zou optreden, dus dit blijft open |
| `.xlsx`-parsing library (bekende CVE's bij oudere SheetJS-versies) | `exceljs` gebruiken i.p.v. `xlsx`, of een gepinde veilige `xlsx`-versie (≥0.19.3) |
| ~~500-rijen-minimum blijkt breder te gelden dan gedacht~~ | **Bevestigd 28/09 (Frank):** geldt breed; implementatie in library/webapp (waarschuwing + optionele opvulling), geen stille padding zonder UX |
| Silent truncation (Frank's tool) overnemen als patroon | Bewust vermeden: afkapping wordt altijd gerapporteerd, nooit stil |
| Env-vars voor single-tenant credentials later niet meer passen bij multi-tenant | Acceptabel voor nu — `src/core/masspost` kent geen tenant-concept, credentials worden als parameter doorgegeven, dus een latere multi-tenant laag kan er gewoon bovenop |
| ~~`buildXml()` rendeerde attributen als elementen, in strijd met de XSD's~~ | **Opgelost 28/09** — fix zit in `buildXml()` zelf, alle aanroepers (incl. bestaande `submit_ready_batch`/`check_batch`) automatisch mee gefixt. Regressietests: `tests/lib/xml.test.ts`. Zie CHANGELOG. |
| Uuid-CVE (moderate) via `exceljs`'s transitieve `uuid`-afhankelijkheid (`npm audit`) | Niet blokkerend voor vandaag — exceljs roept `uuid` intern aan zonder aanvaller-gecontroleerde buffer-parameter. Opvolgen bij een latere `exceljs`-major of alternatief. |

## Status: Actief — koers vast 29/09/2026

Library staat. Webinterface en een geslaagde FTP-verzending nog niet. De keuze “AFT, XML+FTP of hybride” is gesloten: **XML via FTP, validatie via OptiAddress.**

### Besluit: MAIL ID protocol **2.00 (`0200`)** (+ dual-support 0100/0102 in code)

Default Contrapunt: `BPOST_TEST_MID_VERSION=0200`. Live Status 100 bevestigd.

### Wat live bewezen is (portaal, mode=T)

| Test | Resultaat |
|------|-----------|
| Bestandsnaam 10-char ref (`REFERENCE0`) | Fix MPW-5009 |
| Create 0200, 1 adres | Status 100 + MID-nummer |
| Create 0200, 10 / 50 adressen | Status 100, alle MID’s; 5× MID-4060 WARN |
| Create 200 adressen | 1AK; 2RS traag/uitblijvend — later herhalen |
| **OptiAddress `MailingCheck`**, 10 adressen | Status 100; correcties via **code 7001** + `compCorrection` (geen `<Suggestions>`-blok) |
| **MailingCheck, 500 adressen, mode=T** (29/09, `…212439`) | 1AK + 2RS **Status 100**. Gebouw **99,80%**. 50× 7001 (correctie), 1× fout rij 93 (`MID-4070` / `7004`, geen correctietekst). Testplafond van 200 is hier niet afgedwongen. |
| **Tweede Check, gecorrigeerde 500** (`…220522`) | Status 100, gebouw opnieuw **99,80%**. 26 correcties verdwenen. 23× 7001 herhaalt dezelfde tekst. Rij 470 nieuw voorstel `ROGGESTRAAT 4`. Rij 93 blijft de fout. |
| **MailingCreate, gecorrigeerde 500** (`…221329`) | 1AK 22:16 + 2RS **Status 100**. 500 unieke barcodes (`MID-4030`). Gebouw **99,80%**, ontvanger 100%, presort **0%** (`genPSC=N`). 24× `MID-4060`. Rij 93: `MID-4010` én toch een barcode. |

Fixtures: `docs/samples/contrapunt/bpost-roundtrip/`  
Generate: `npm run generate:mailing-xml [-- --limit N] [-- --opti]`

**Mode-limieten:** T ≤200 · C ≤2000 · commercieel min. 500 (Frank) — apart van testlimiet.

### Wat MailingCreate en Opti wél teruggeven

- **MailingCreate** → MID-nummer + vaak **MID-4060** (WARN), geen correctietekst.
- **MailingCheck (Opti)** → correcties als **7001** / `compCorrection`, niet als AFT-kolommen en niet als `<Suggestions>`.

Frank ziet bij een AFT-upload meteen correcties. Dat is het gedrag van de portaal-tool, niet ons verzendkanaal. Wie het verschil wil meten: `docs/samples/contrapunt/testadressen-200-aft.xls` en `npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx` (zelfde 200 adressen).

### Eerste test-flow (29/09, avond)

Onze kant stopt bij de mailing. De **deposit maken we niet**. Frank checkt of hij op e-MassPost een deposit kan maken op basis van onze `mailingRef`. Kan hij dat, dan is de keten rond zonder dat wij `DepositRequest` bouwen.

Volgorde aan onze kant, zodra de modus `C` of `P` is (500 past niet in `T`):

1. **MailingCheck** op 500 adressen.
2. Correcties uit 7001 toepassen, daarna opnieuw **MailingCheck** (nieuwe `mailingRef`).
3. Alleen bij **meer dan 98%** een **MailingCreate**.

### Volgende stappen

1. Frank: kan hij een deposit koppelen aan `MANUAL20260929201329`?
2. Parser voor Opti-2RS (`7001` / `compCorrection`) en Create-2RS (MID per SEQ). Het eenmalige script `scripts/apply-opti-corrections.ts` dekt alleen stap 2 van de test.
3. FTP Connection & Security Test met Contrapunt/bpost — daarna `npm run test:transport -- --ftp`.
4. [x] **API:** kolom-mapping suggestie (`suggestColumnMapping` — heuristics + optionele AI-fallback; privacy: headers-first). Linear [SR-79](https://linear.app/sonicrocket/issue/SR-79/api-kolom-mapping-suggestie-heuristics-optionele-ai). De caller bevestigt; geen UI in deze stap.
5. **Pas daarna UI:** webinterface bovenop `src/core/masspost/` (upload, mapping-editor + live preview, validatierapport) — dunne laag, geen stille aannames.

```bash
npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx
npm run generate:mailing-xml -- --opti --file docs/samples/contrapunt/testadressen-200.xlsx
```

Env: `.env.local` → `BPOST_TEST_MID_VERSION=0200`. Docs: `docs/internal/masspost-test-env.md` · CLI/library: `docs/internal/masspost-library.md`.

## Naslag (uit het afgevoerde AFT-plan)

**ARR** (tarievengidsen 2026): ≥96% om te mogen opladen, ≥98% → 0,5% Data Quality-korting, stapelbaar met Mail ID+ (+1%). `MID-4040` geeft compliance rates mee in het antwoord. Aanname, nog te toetsen aan een echt antwoord: INFO+WARN = herkend, ERROR = niet herkend.

| Categorie | Codes | Severity |
|---|---|---|
| Correct | `MID-4030` (MID-nummer toegekend) | INFO |
| Aangepast | `MID-4000` `MID-4001` `MID-4060` `MID-4050` `MID-4100` `MID-4300` | WARN |
| Niet herkend | `MID-4010` `MID-4011` `MID-4020` `MID-4070` `MID-4080` | ERROR |
| Informatief | `MID-4040` (compliance) · `MID-4061/4062` · `MID-4090` | INFO |
| Fataal | `MID-4200` `MID-4210` | FATAL |

De mailops-API (`api.mailops.bpost.cloud`, max 100 adressen, `x-api-key`) is een ander product. Die gebruiken we niet voor deze keten.

