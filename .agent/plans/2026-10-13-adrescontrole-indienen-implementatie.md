# Adrescontrole en indienen via de brievenbus — implementatieplan

## Status: Done — testronde OK (14/10/2026). Deel A+B gebouwd en gecommit (`c600f16`). Mark heeft de volledige flow in e-MassPost Test afgerond (controleren → antwoord → indienen → Ingediend → printerbestand): prima. Linear SR-130 → In review. Versiebump 0.5.0 lokaal klaar, nog niet gecommit. Logboek: `.superpowers/sdd/2026-10-13-adrescontrole-indienen-implementatie/progress.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stap 4 van de webapp: de adressen laten nakijken door bpost (OptiAddress, `MailingCheck`), corrigeren met de voorstellen van bpost, en de mailing indienen (`MailingCreate`), via een uitwisselbare brievenbus die nu manueel werkt (XML downloaden, antwoord opladen) en later via Google Drive.

**Architecture:** Eerst de library in `src/core/masspost/`: verzoeken maken uit een mailing (`request-file.ts`), antwoorden inlezen (`parse-response.ts`), het resultaat groeperen en schatten (`address-check.ts`), de uitwisselingen bij een mailing bijhouden (`exchange.ts`), de brievenbus (`mailbox/`) en bestanden per mailing in de store. Daarna de interface: de correcties uit `FormatStep` naar `MailingFlow` tillen, zodat stap 3 en 4 dezelfde correcties delen, en een nieuwe `AddressCheckStep` met de toestanden van het ontwerp. Alles draait in de browser; de server geeft enkel de bpost-nummers van de tenant mee als prop van de pagina.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zod 4, CSS modules, `@tabler/icons-react`, SheetJS, `fast-xml-parser` (via `src/lib/xml.ts`), Vitest 4 met `fake-indexeddb` en jsdom, `@testing-library/react`.

**Spec:** [`2026-10-13-adrescontrole-indienen-design.md`](2026-10-13-adrescontrole-indienen-design.md) (13 besluiten, 5 delen). Achtergrond: [`2026-10-12-sr-112-v1-design.md`](2026-10-12-sr-112-v1-design.md) (de brievenbus), [`2026-10-02-masspost-web-flow-design.md`](2026-10-02-masspost-web-flow-design.md) (besluiten 1, 17, 37–41, 45, 48, 49), de schets [`docs/ontwerp/webapp/adrescontrole.html`](../../docs/ontwerp/webapp/adrescontrole.html). Linear: [SR-130](https://linear.app/sonicrocket/issue/SR-130/adrescontrole-en-indienen-via-de-brievenbus-stap-4).

## Wijzigingen na de schetsronde (13/10, spec besluiten 14–23)

De schets is `docs/ontwerp/webapp/adrescontrole.html` v4.6. Waar de taken hieronder ermee in strijd zijn, geldt de schets en dit blok.

- **Nieuwe taak 10b, Modus in stap 1 en Instellingen** (vóór taak 11):
  - `mailing.json`: optioneel veld `mode: 'T' | 'C' | 'P'` (ontbreekt = `P`), deel van `MailingDetails`; veld "Modus" in `DetailsForm` (stap 1) met de standaard van de tenant.
  - Instellingen → Standaardwaarden: veld "Modus" (Productie, Test, Certificatie), Zod-schema en server action van de standaardwaarden.
  - Database (Mark voert uit): `ALTER TABLE tenant_preferences ADD COLUMN default_mode text NOT NULL DEFAULT 'P';` plus `defaultMode` in `src/lib/db/schema.ts` en `getTenantSettings`.
- **Taak 11:** de knoppen staan bovenaan via `StepAction`. Vóór de controle: "Controleren bij e-MassPost ›". Tijdens het wachten: uit, met het wieltje links. Na de controle: "Opnieuw controleren" (wit, icoon, altijd actief) en "Indienen bij e-MassPost ›" (actief vanaf 96 % en een geldige afgiftedatum, uitleg in de tooltip). "Nog niet gecontroleerd" en "Wachten" zijn één scherm met Uitgaand en Inkomend (manueel open, Drive ingeklapt), zonder voortgangsregel. Indienen gebruikt `mailing.mode`, zonder bevestiging.
- **Taak 12:** de stijl van `FormatStep`: uitleg, hulpregel, kolomkoppen, pill "open" of "(zichtbaar)/open", automatisch dichtklappen, envelop-iconen (`IconMailOff`/`IconMail`), hints als gewone tekst. ARR-kaart: geel onder 96 %, groen vanaf 96 %; eindpunt en fantoom worden een gouden ster vanaf 98 %; tooltips bij 96 en 98 %. ARR-pill: neutraal met een oranje bolletje, een groen bolletje of een gouden ster. Balkje onder stap 4: geschatte ARR van 90 % (leeg) tot 96 % (vol). `arrTone` en `StatusIcon`: twee kleuren.
- **Deel B (taak 14–16):** geen blok Indienen. Na een geslaagde indiening, in elke modus, is de mailing vergrendeld: stap 4 toont "Ingediend · … Mail ID's" en het kader "Voor de drukker"; stap 1–3 alleen-lezen. Het bestand voor de drukker enkel na een geslaagde indiening.
- **Teksten:** "e-MassPost" in plaats van "bpost" waar het over de dienst gaat.

## Global Constraints

- Library eerst, interface daarna (AGENTS.md). De interface (taak 9–15) start pas als de library (taak 2–8) groen is; taak 11 en 12 bovendien pas na het akkoord van Mark over het ontwerp (taak 1). Deel B (taak 14–16) start na de review van deel A.
- Geen adressen naar onze server, database of logs. De XML wordt in de browser gemaakt (besluit 10).
- De server geeft enkel `customerId` (PRS, `bpost_credentials.customer_number`) en `accountId`, nooit het wachtwoord.
- MID-versie: **`0200`** (AGENTS.md, vastgelegd 28/09). `customerFileRef`: **`REFERENCE`** (genormaliseerd `REFERENCE0`, zoals in alle geteste bestanden).
- Modus: een **controle gaat altijd in `T`**; het **indienen** in de modus die de gebruiker kiest (`T`, `C`, `P`), bevestiging bij `C` en `P` (besluit 4). Geen grens van 200 adressen (besluit 5).
- `mailingRef` maximaal **20** tekens. Controle: `<code>-C<n>`; indienen: eerst `<code>`, daarna `<code>-<n>` (deel 1 en 4 van de spec).
- Bestanden per mailing onder het pad **`e-masspost/`** (niet `bpost/`).
- Codes van bpost: `7001` en `MID-7001` zijn dezelfde (field findings). ARR uit `MID-4040`, sleutel `compliancyRateAtBuildingLevel`. Mail ID uit `MID-4030`, sleutel `midNum`.
- Correcties hangen aan `<seq>:<veld>` met `seq` = rijnummer in de Excel (besluit 49 van 02/10); stap 3 en 4 delen dezelfde `corrections` en `excludedRows`.
- Een correctie die enkel in hoofdletters verschilt, telt als in orde; een echt voorstel staat in de schrijfwijze van de gebruiker (besluit 37 van 02/10).
- Grenzen ARR: onder **96 %** rood en niet indienen; **96–98 %** oranje met waarschuwing; vanaf **98 %** groen.
- `schemaVersion` van `mailing.json` blijft **1**: alle nieuwe velden zijn optioneel.
- Klantgerichte tekst in het Vlaams, zonder jargon: laad `.agent/prompts/customer-facing-agent.md` vóór taak 11. Meldingen staan in de spec, deel 5; neem ze letterlijk over.
- AFT-export: uitgeschakeld in de interface (grijs, niet klikbaar, hovertip "Niet in deze versie"); `aft-export.ts` blijft.
- TSDoc (JSDoc-stijl, `@param`, `@returns`, `@example` waar nuttig) op alle geëxporteerde functies en publieke types.
- Componenttests: `// @vitest-environment jsdom`, mock `next/navigation` en `@/components/app-shell/actions`; `toBeDisabled` bestaat niet (geen jest-dom): gebruik `(el as HTMLButtonElement).disabled`.
- Geen Prettier: zet de inspringing zelf recht. Geen `eslint-disable react-hooks/...`: gebruik een ref. StrictMode voert effecten twee keer uit: vergelijk met de laatst gemelde stand.
- `timeout` bestaat niet op macOS: `perl -e 'alarm 120; exec @ARGV' npx vitest run …`.
- Commits: Mark wil **geen tussentijdse commits**. De stappen "Checkpoint" hieronder draaien de tests; commit pas op het einde, als Mark "je mag committen" zegt. Nooit `docs/internal/e-masspost` mee committen: `git add -A -- . ':!docs/internal/e-masspost'`.
- DoD per taak: de tests van de taak groen. DoD op het einde van deel A en deel B: `npm run lint:fix`, `npx tsc --noEmit`, `npm test`, `npm run docs:build`; na de commit `npm run docs:check`.

## Review Focus

1. **Een antwoord van een andere mailing of een vorige controle opladen:** de gebruiker verwacht dat de app weigert of het oude antwoord negeert, en dat er niets kapot gaat. Test in taak 6 (`processResponseFile`: `foreign`, `older`).
2. **Hetzelfde antwoord twee keer opladen, of eerst de `_2RS` en daarna de `_1AK`:** geen dubbele verwerking, geen status die terugspringt naar "wachten". Test in taak 6 (`duplicate`, ack na resultaat).
3. **Een lijst wijzigen na het versturen** (correctie in stap 3, uitsluiting, andere koppeling): het antwoord blijft bruikbaar en stap 4 meldt "Je wijzigde de lijst na het versturen". Test in taak 6 (`changedSinceSent`) en taak 12 (de melding boven de groepen).
4. **Accenten en tekens buiten ASCII** in de XML (é, ë, ç) en in het antwoord: de bytes moeten ISO-8859-1 zijn, anders weigert bpost of verminkt het adres. Test in taak 3 (`encodeLatin1`/`decodeLatin1`) en taak 4 (antwoord met "Liège").
5. **Herladen tijdens het wachten of na het antwoord:** de gebruiker verwacht dezelfde toestand (wachten, of het resultaat met zijn correcties). Test in taak 7 (bestanden blijven in de store) en taak 11 (`useBpostExchange` leest het antwoord terug uit de store; browserronde stap 11).

---
## Overzicht van de bestanden

| Bestand | Taak | Verantwoordelijkheid |
|---|---|---|
| `docs/ontwerp/webapp/adrescontrole.html` | 1 | Schets: toestanden van stap 4 en het blok Indienen |
| `docs/adr/0010-modus-per-mailing.md` | 2 | Besluit: de webapp opent `FORCE_TEST_MODE` via de keuze per mailing |
| `src/core/masspost/build-request.ts` | 2 | Regel rond `allowNonTestMode` bijgewerkt (enkel commentaar en TSDoc) |
| `src/core/masspost/request-file.ts` (nieuw) | 3 | Verbeterde rijen, items, `mailingRef`, Latin-1, het XML-bestand van een controle of indiening |
| `src/core/masspost/parse-response.ts` | 4 | `parseAck`, `parseMailingResult`, `classifyResponse` |
| `src/core/masspost/address-check.ts` (nieuw) | 5 | Groepen, schrijfwijze van de gebruiker, adres splitsen, open rijen, geschatte ARR |
| `src/core/masspost/store/mailing.ts` | 6 | Schema van een uitwisseling (`exchangeSchema`), `exchanges`, `counts.check`, `waiting` en `submittedMode` in de samenvatting |
| `src/core/masspost/exchange.ts` (nieuw) | 6 | Versturen registreren, een antwoord verwerken, wachten, gewijzigd na versturen |
| `src/core/masspost/store/{mailing-store,memory-store,indexeddb-store}.ts` | 7 | Bestanden per mailing (`saveFile`, `getFile`, `listFiles`), IndexedDB versie 2 |
| `src/core/masspost/mailbox/` (nieuw) | 8 | `Mailbox`, `ManualMailbox`, `MAILBOX_KINDS` |
| `src/core/masspost/index.ts` | 8 | Exports |
| `src/components/mailing-flow/corrections.ts` (nieuw) | 9 | De reducer van de correcties, uit `FormatStep` gehaald |
| `src/components/mailing-flow/FormatStep.tsx` | 9, 11 | Gecontroleerd door `MailingFlow`; de weergave van stap 4 verdwijnt eruit |
| `src/app/(app)/mailings/[code]/page.tsx`, `MailingPage.tsx` | 10 | bpost-nummers als prop |
| `src/components/settings/SettingsForms.tsx` | 10 | Blok "Verbinding met bpost" |
| `src/components/mailing-flow/AddressCheckStep.tsx` (nieuw) | 11–12, 15 | Stap 4: toestanden, wachten, resultaat, blok Indienen |
| `src/components/mailing-flow/AddressRow.tsx` (nieuw) | 12 | Eén rij met keuzelijst |
| `src/components/mailing-flow/ArrBar.tsx` (nieuw) | 12 | ARR-balk met grenzen en fantoomlijn |
| `src/components/mailing-flow/useBpostExchange.ts` (nieuw) | 11 | Versturen en antwoorden verwerken via brievenbus en store |
| `src/components/mailing-flow/MailingFlow.tsx` | 9, 11 | Correcties, stap 4, stappenbalk |
| `src/components/mailings/{StatusIcon,labels}.ts(x)` | 11 | Icoon en tekst "wachten" |
| `src/core/masspost/printer-export.ts`, `exports.ts` | 14 | Kolommen Mail ID en adres zoals aangekondigd, "TEST, niet drukken" |
| `docs/documentatie/webapp/adrescontrole.md` (nieuw) | 13, 16 | Gebruikersuitleg |

# Deel A: adrescontrole

### Task 1: Ontwerp van stap 4 bijwerken (poort)

**Files:**
- Modify: `docs/ontwerp/webapp/adrescontrole.html`

**Interfaces:** geen code. Mark keurt het resultaat goed vóór taak 11 begint.

- [ ] **Step 1: Lees de schets en de spec, deel 3 en 4.** Open `docs/ontwerp/webapp/adrescontrole.html` in de browser van het paneel (`preview_start` met `url: file://…` of via de dev-server in `public/` is niet nodig: `navigate` naar het bestandspad). Noteer welke schetsbediening er rechtsonder staat (`.scen`-knoppen voor 93,4 / 97,2 / 99,8 %).

- [ ] **Step 2: Voeg een schetsbediening "Toestand" toe** naast de bestaande scorekeuze, met vier knoppen: `Nog niet gecontroleerd`, `Wachten op bpost`, `Resultaat`, `Ingediend`. Elke knop zet `document.body.dataset.state` op `new`, `waiting`, `result` of `submitted`; CSS toont per toestand enkel de juiste blokken (`[data-show~="new"]` enzovoort). Standaard: `result` (de huidige schets).

- [ ] **Step 3: Toestand "Nog niet gecontroleerd".** Onder de titel "Adrescontrole" de uitleg "bpost kijkt elk adres na en stelt verbeteringen voor." Rechts op de lijn van de titel de zwarte hoofdknop **Controleren bij bpost** (zelfde stijl als "Verder naar adrescontrole" in `formaatvalidatie.html`). Geen groepen, geen ARR-balk.

- [ ] **Step 4: Toestand "Wachten op bpost".** Hoofdknop uitgeschakeld met een wieltje en "Wachten op bpost". Een kader met de stand als drie stappen op één lijn: `✓ Verstuurd · vandaag 14:05 · 789 adressen` → `Ontvangen door bpost` → `Antwoord`. Daaronder een gedempt kader **"Zolang de automatische verbinding er niet is"** met: ① "Laad dit bestand op via de e-MassPost-website" en een gewone knop met download-icoon **XML opnieuw opslaan** (bestandsnaam `MID_0200_251614_REFERENCE0_261013140500_0RQ.XML` in kleine monospace eronder); ② een sleepvak "Zet hier het antwoord van bpost (_1AK of _2RS)". Het statusicoon voor de titel: het icoon "wachten" uit `statusiconen.html`.

- [ ] **Step 5: Toestand "Resultaat".** Zoals nu, met drie aanpassingen: (a) in de keuzelijst van een adresveld toont elke optie de bron **OptiAddress** in plaats van `postcode.eu` (vervang in `ADDR`-opties en de hint "Zoek via postcode.eu" door "Kies uit N adressen" of "Pas het adres aan"); (b) een regel boven de groepen, enkel zichtbaar via een extra schetsknop "Gewijzigd na versturen": "Je wijzigde de lijst na het versturen · **Opnieuw controleren**"; (c) de hoofdknop: onder 96 % **Opnieuw controleren**, vanaf 96 % **Indienen bij bpost** (springt naar het blok Indienen), met "Opnieuw controleren" als gewone knop naast de ARR.

- [ ] **Step 6: Blok Indienen** onderaan (zichtbaar in `result` vanaf 96 % en in `submitted`):
  - samenvatting op één regel met pills: adressen die meegaan, afgiftedatum, formaat, prioriteit, barcode, en een link "Aanpassen in stap 1";
  - waarschuwingen (oranje, niet blokkerend): "Vanaf 98 % krijg je extra korting" (enkel 96–98 %), "Nog 3 adressen zonder oplossing gaan mee zoals ze zijn, of sluit ze uit";
  - modus als drie keuzerondjes: **Test** (standaard), **Certificatie**, **Productie**;
  - zwarte knop **Indienen bij bpost**; bij Certificatie of Productie eerst een dialoog: "Je dient deze mailing in bij bpost in productie." met **Indienen** en **Annuleren**;
  - in `submitted`: "Ingediend · Test · 13/10 14:20 · 786 adressen aanvaard, 786 Mail ID's", een pill **Test**, de knop **Opslaan voor de drukker (.xlsx)** en een gewone knop **Opnieuw indienen**;
  - helemaal onderaan een klein blok "Andere bestanden" met de grijze, niet klikbare knop "Opslaan voor bpost (AFT, .xls)" en hovertip "Niet in deze versie".

- [ ] **Step 7: Werk de notitie bovenaan bij**: "Schets v3 (13/10/2026): toestanden en het blok Indienen uit `.agent/plans/2026-10-13-adrescontrole-indienen-design.md`."

- [ ] **Step 8: Controleer licht en donker en 375 px breed** in het paneel (`resize_window` `mobile`, `colorScheme` `dark`), en neem schermafdrukken van de vier toestanden.

- [ ] **Step 9: Poort.** Stuur de schermafdrukken naar Mark (SendUserFile) en vraag zijn akkoord. Verwerk zijn opmerkingen in de schets. Werk de spec bij als een opmerking een besluit verandert. Ga pas verder met taak 11 na zijn akkoord; taak 2–10 mogen intussen.

### Task 2: Modus per mailing (ADR 0010)

**Files:**
- Create: `docs/adr/0010-modus-per-mailing.md`
- Modify: `src/core/masspost/build-request.ts:6-17` (commentaar van `FORCE_TEST_MODE`), `:29-30`, `:76-77` (TSDoc van `allowNonTestMode`)
- Test: `tests/core/masspost/build-request.test.ts`

**Interfaces:**
- Produces: ongewijzigde signaturen. `buildMailingRequest(items, { ...params, mode, allowNonTestMode: true }, credentials)` geeft `Header.mode === mode` voor `T`, `C` en `P`.

- [ ] **Step 1: Schrijf de test** (onderaan `tests/core/masspost/build-request.test.ts`):

```ts
describe('mode chosen per mailing (ADR 0010)', () => {
  const creds = { customerId: '251614', accountId: '1234567', midVersion: '0200' as const }
  const base = {
    mailingRef: 'CP-2026-15',
    expectedDeliveryDate: '2026-10-23',
    format: 'Small' as const,
    priority: 'NP' as const,
    customerFileRef: 'REFERENCE0',
    genMID: '7' as const,
    genPSC: 'N' as const,
  }

  it.each(['T', 'C', 'P'] as const)('writes mode %s when the caller allows it', (mode) => {
    const request = buildMailingRequest([], { ...base, mode, allowNonTestMode: true }, creds)
    expect(request.Header.mode).toBe(mode)
  })

  it('still forces T without allowNonTestMode', () => {
    const request = buildMailingRequest([], { ...base, mode: 'P' }, creds)
    expect(request.Header.mode).toBe('T')
  })
})
```

- [ ] **Step 2: Draai de test.** Run: `npx vitest run tests/core/masspost/build-request.test.ts`. Expected: PASS (het gedrag bestaat al; deze test legt het vast voor de webapp).

- [ ] **Step 3: Schrijf ADR 0010** (kopie van `docs/adr/template.md`):

```markdown
# ADR 0010: De modus kiezen per mailing

## Status

Accepted (Mark, 13/10/2026). Ontwerp: `.agent/plans/2026-10-13-adrescontrole-indienen-design.md`, besluit 4.

## Context

`FORCE_TEST_MODE` in `src/core/masspost/build-request.ts` zet elk verzoek in Test (`T`). Enkel het script `generate:mailing-xml` mocht het openen met `allowNonTestMode`. De webapp gaat nu zelf mailings indienen, ook echt.

## Decision

- **Een controle (`MailingCheck`) gaat altijd in Test.** Een controle maakt niets aan bij bpost.
- **Bij het indienen kiest de gebruiker per mailing:** Test (`T`), Certificatie (`C`) of Productie (`P`). Standaard Test. Bij `C` en `P` vraagt de app eerst een bevestiging.
- **De webapp zet `allowNonTestMode` enkel na die keuze**, voor die ene `MailingCreate`. Geen HTTP-route en geen ander deel van de webapp zet het.
- **Geen grens van 200 adressen in Test:** een test met meer dan 500 adressen werkte (Mark, 13/10).

## Consequences

- Een vergissing in de keuze stuurt een echte mailing naar bpost; de bevestiging is de enige rem.
- `FORCE_TEST_MODE` blijft voor de rest van de code.
- De modus staat bij elke uitwisseling in `mailing.json` en als pill bij de mailing.
```

- [ ] **Step 4: Werk het commentaar bij** in `build-request.ts`. Vervang in het blok boven `FORCE_TEST_MODE` de zin "Only `scripts/generate-mailing-xml.ts` does that, and it sends nothing. HTTP routes and the web app must never set it." door:

```ts
 * for a deliberate protocol test through the portal upload tool (`scripts/generate-mailing-xml.ts`),
 * and the web app sets it for one MailingCreate after the user chose C or P for that mailing and
 * confirmed (ADR 0010). HTTP routes never set it; a MailingCheck from the web app is always T.
```

En vervang op beide plaatsen `/** CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route. */` door `/** Escape hatch for the FORCE_TEST_MODE guard: the CLI, and the web app after an explicit choice per mailing (ADR 0010). Never from a route. */`.

- [ ] **Step 5: Checkpoint.** Run: `npx vitest run tests/core/masspost/build-request.test.ts`. Expected: PASS.

### Task 3: Het XML-bestand van een controle of indiening (`request-file.ts`)

**Files:**
- Create: `src/core/masspost/request-file.ts`
- Modify: `src/core/masspost/pipeline.ts` (exporteer `stripEmptyDepositType`, met TSDoc)
- Test: `tests/core/masspost/request-file.test.ts`

**Interfaces:**
- Consumes: `rowsToItems`, `buildMailingCheckRequest`, `buildMailingRequest` (`build-request.ts`); `buildMailingRequestFileName`, `normalizeBpostCustomerFileRef` (`file-naming.ts`); `validateMailingRequest` (`validate.ts`); `buildXml` (`@/lib/xml`); `sha256Hex` (`store/hash.ts`); `MappedRow`, `MappedField`, `AddressField` (`mapping.ts`).
- Produces:
  - `type BpostMode = 'T' | 'C' | 'P'`
  - `interface BpostIds { customerId: string; accountId: string }`
  - `const WEB_MID_VERSION = '0200'`, `const WEB_CUSTOMER_FILE_REF = 'REFERENCE'`
  - `correctedRows(rows: readonly MappedRow[], corrections: Readonly<Record<string, string>>, excludedRows: readonly number[]): MappedRow[]`
  - `checkMailingRef(code: string, n: number): string`, `createMailingRef(code: string, n: number): string`
  - `encodeLatin1(text: string): Uint8Array`, `decodeLatin1(bytes: Uint8Array): string`
  - `itemsFingerprint(rows: readonly MappedRow[], priority: 'P' | 'NP'): Promise<string>`
  - `interface RequestFile { kind: 'check' | 'create'; fileName: string; bytes: Uint8Array; mailingRef: string; mode: BpostMode; items: number; fingerprint: string }`
  - `buildRequestFile(input: RequestFileInput): Promise<RequestFile>` en `class RequestInvalidError extends Error { issues: ValidationIssue[] }`

- [ ] **Step 1: Schrijf de tests** in `tests/core/masspost/request-file.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { MappedField, MappedRow } from '@/core/masspost/mapping'
import {
  buildRequestFile,
  checkMailingRef,
  correctedRows,
  createMailingRef,
  decodeLatin1,
  encodeLatin1,
  itemsFingerprint,
  RequestInvalidError,
} from '@/core/masspost/request-file'

const f = (value: string): MappedField => ({ value, truncated: false, originalLength: value.length, replacedChars: [], unsupportedChars: [] })
const row = (seq: number, street: string, city = '1020 Brussel'): MappedRow => ({
  seq,
  source: {},
  fields: { name: f('Anna Vanderstappen'), streetHouseBox: f(street), postcodeCity: f(city) },
})
const ids = { customerId: '251614', accountId: '1234567' }
const now = new Date(2026, 9, 13, 14, 5, 0)

describe('correctedRows', () => {
  it('applies corrections by <seq>:<field> and drops excluded rows', () => {
    const rows = [row(2, 'Molenbeeksestraat 184 35'), row(3, 'Pagodenlaan 21 5'), row(4, 'Steylsstraat 92')]
    const out = correctedRows(rows, { '2:streetHouseBox': 'Molenbeeksestraat 184 bus 35', '3:companyDepartment': 'Dienst X' }, [4])
    expect(out.map((r) => r.seq)).toEqual([2, 3])
    expect(out[0].fields.streetHouseBox.value).toBe('Molenbeeksestraat 184 bus 35')
    expect(out[1].fields.companyDepartment?.value).toBe('Dienst X')
    expect(rows[0].fields.streetHouseBox.value).toBe('Molenbeeksestraat 184 35') // input untouched
  })
})

describe('mailingRef', () => {
  it('numbers checks and later submissions, within 20 characters', () => {
    expect(checkMailingRef('CP-2026-15', 1)).toBe('CP-2026-15-C1')
    expect(createMailingRef('CP-2026-15', 1)).toBe('CP-2026-15')
    expect(createMailingRef('CP-2026-15', 2)).toBe('CP-2026-15-2')
    const long = 'ABCDEFGHIJ-2026-1234' // 20 characters
    expect(checkMailingRef(long, 12)).toHaveLength(20)
    expect(checkMailingRef(long, 12).endsWith('-C12')).toBe(true)
    expect(createMailingRef(long, 3)).toHaveLength(20)
  })
})

describe('Latin-1', () => {
  it('encodes and decodes accents byte for byte', () => {
    const bytes = encodeLatin1('Liège é ë ç')
    expect(bytes[2]).toBe(0xe8)
    expect(decodeLatin1(bytes)).toBe('Liège é ë ç')
  })
  it('refuses a character outside ISO-8859-1', () => {
    expect(() => encodeLatin1('€')).toThrow(/ISO-8859-1/)
  })
})

describe('buildRequestFile', () => {
  it('builds a MailingCheck in T with the canonical file name, Latin-1 bytes and the row numbers as seq', async () => {
    const file = await buildRequestFile({
      kind: 'check',
      rows: [row(2, 'Rue de Liège 4'), row(5, 'Steylsstraat 92')],
      mailingRef: 'CP-2026-15-C1',
      mode: 'P', // ignored: a check is always T
      priority: 'NP',
      ids,
      now,
    })
    expect(file.fileName).toBe('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')
    expect(file).toMatchObject({ kind: 'check', mailingRef: 'CP-2026-15-C1', mode: 'T', items: 2 })
    const xml = decodeLatin1(file.bytes)
    expect(xml).toContain('<MailingCheck')
    expect(xml).toContain('mode="T"')
    expect(xml).toContain('seq="5"')
    expect(xml).toContain('Rue de Liège 4')
    expect(file.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  it('builds a MailingCreate in the chosen mode with the details of step 1', async () => {
    const file = await buildRequestFile({
      kind: 'create',
      rows: [row(2, 'Steylsstraat 92')],
      mailingRef: 'CP-2026-15',
      mode: 'P',
      priority: 'NP',
      ids,
      now,
      create: { expectedDeliveryDate: '2026-10-23', format: 'Small', genMID: '7', genPSC: 'N' },
    })
    const xml = decodeLatin1(file.bytes)
    expect(file.mode).toBe('P')
    expect(xml).toContain('<MailingCreate')
    expect(xml).toContain('mode="P"')
    expect(xml).toContain('expectedDeliveryDate="2026-10-23"')
    expect(xml).toContain('genMID="7"')
  })

  it('throws RequestInvalidError when the request fails the schema', async () => {
    await expect(
      buildRequestFile({ kind: 'check', rows: [row(2, 'x'.repeat(80))], mailingRef: 'CP-2026-15-C1', mode: 'T', priority: 'NP', ids, now }),
    ).rejects.toBeInstanceOf(RequestInvalidError)
  })

  it('gives the same fingerprint for the same items, another after a change', async () => {
    const a = await itemsFingerprint([row(2, 'Steylsstraat 92')], 'NP')
    expect(await itemsFingerprint([row(2, 'Steylsstraat 92')], 'NP')).toBe(a)
    expect(await itemsFingerprint([row(2, 'Steylsstraat 93')], 'NP')).not.toBe(a)
  })
})
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/core/masspost/request-file.test.ts`. Expected: FAIL ("Cannot find module '@/core/masspost/request-file'").

- [ ] **Step 3: Exporteer `stripEmptyDepositType`** in `pipeline.ts`: zet `export` voor de functie en voeg TSDoc toe:

```ts
/**
 * Removes `depositIdentifierType` from actions without a `depositIdentifier`: bpost refuses the
 * attribute on its own.
 * @param data A validated MailingRequest; changed in place.
 */
export function stripEmptyDepositType(data: NonNullable<ValidationResult['data']>) {
```

- [ ] **Step 4: Schrijf `src/core/masspost/request-file.ts`:**

```ts
// src/core/masspost/request-file.ts
// The XML file the web app puts in the mailbox (design 13/10, part 1): a MailingCheck (always Test)
// or a MailingCreate (mode chosen per mailing, ADR 0010), made in the browser from the rows that go
// along, with their corrections. Browser-safe: no Node APIs.
import { buildXml } from '@/lib/xml'
import { buildMailingCheckRequest, buildMailingRequest, rowsToItems } from './build-request'
import { buildMailingRequestFileName, normalizeBpostCustomerFileRef } from './file-naming'
import type { AddressField, MappedField, MappedRow } from './mapping'
import { stripEmptyDepositType } from './pipeline'
import { sha256Hex } from './store/hash'
import { validateMailingRequest, type ValidationIssue } from './validate'

/** Header mode of a request: Test, Certification or Production. */
export type BpostMode = 'T' | 'C' | 'P'

/** The bpost numbers of the tenant: PRS id (Context/@sender, Header/@customerId) and account id. */
export interface BpostIds {
  customerId: string
  accountId: string
}

/** MID file version of the web app (AGENTS.md, locked 28/09/2026). */
export const WEB_MID_VERSION = '0200' as const
/** `customerFileRef` of the web app, as in every tested file (`REFERENCE0` after normalizing). */
export const WEB_CUSTOMER_FILE_REF = 'REFERENCE'

const MAX_REF = 20
const EMPTY: MappedField = { value: '', truncated: false, originalLength: 0, replacedChars: [], unsupportedChars: [] }

/**
 * The rows that go to bpost: excluded rows left out, corrections (by `<seq>:<field>`) applied.
 * @param rows Output of `mapRows` with the spreadsheet row numbers.
 * @param corrections Corrected values by `<seq>:<field>` (steps 3 and 4 share them).
 * @param excludedRows Row numbers left out of the mailing.
 * @returns New rows; the input is not changed.
 * @example correctedRows(rows, { '2:streetHouseBox': 'Kerkstraat 1 bus 2' }, [977])
 */
export function correctedRows(
  rows: readonly MappedRow[],
  corrections: Readonly<Record<string, string>>,
  excludedRows: readonly number[],
): MappedRow[] {
  const excluded = new Set(excludedRows)
  const bySeq = new Map<number, [AddressField, string][]>()
  for (const [key, value] of Object.entries(corrections)) {
    const i = key.indexOf(':')
    const seq = Number(key.slice(0, i))
    bySeq.set(seq, [...(bySeq.get(seq) ?? []), [key.slice(i + 1) as AddressField, value]])
  }
  return rows
    .filter((row) => !excluded.has(row.seq))
    .map((row) => {
      const fixes = bySeq.get(row.seq)
      if (!fixes) return row
      const fields = { ...row.fields }
      for (const [field, value] of fixes) fields[field] = { ...(fields[field] ?? EMPTY), value }
      return { ...row, fields }
    })
}

function withSuffix(code: string, suffix: string): string {
  return code.length + suffix.length <= MAX_REF ? code + suffix : code.slice(0, MAX_REF - suffix.length) + suffix
}

/**
 * `mailingRef` of the n-th address check of a mailing: bpost wants a new one for every check.
 * @param code The code of the mailing.
 * @param n 1 for the first check.
 * @returns At most 20 characters, e.g. `CP-2026-15-C2`.
 */
export function checkMailingRef(code: string, n: number): string {
  return withSuffix(code, `-C${n}`)
}

/**
 * `mailingRef` of the n-th submission: the code itself the first time (decision 17 of 11/10), then
 * `<code>-2`, `-3`… (e.g. Production after Test).
 * @param code The code of the mailing.
 * @param n 1 for the first submission.
 * @returns At most 20 characters.
 */
export function createMailingRef(code: string, n: number): string {
  return n <= 1 ? code : withSuffix(code, `-${n}`)
}

/**
 * Text as ISO-8859-1 bytes, the encoding of every bpost file.
 * @param text Text with only Latin-1 characters (`validateMailingRequest` checks that first).
 * @returns One byte per character.
 * @throws Error when a character is outside ISO-8859-1.
 */
export function encodeLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 0xff) throw new Error(`Teken buiten ISO-8859-1: ${text[i]}`)
    bytes[i] = code
  }
  return bytes
}

/**
 * ISO-8859-1 bytes as text (a response of bpost). Every byte is one character.
 * @param bytes The file.
 * @returns The text.
 */
export function decodeLatin1(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return out
}

/**
 * A fingerprint of what goes to bpost: the same rows give the same value. Shows that the list changed
 * after it was sent (design 13/10, decision 3).
 * @param rows The rows that go along (`correctedRows`).
 * @param priority Priority of the items.
 * @returns 64 hex characters.
 */
export async function itemsFingerprint(rows: readonly MappedRow[], priority: 'P' | 'NP'): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(rowsToItems([...rows], priority)))
  return sha256Hex(bytes.buffer as ArrayBuffer)
}

/** Input for `buildRequestFile`. */
export interface RequestFileInput {
  kind: 'check' | 'create'
  /** The rows that go along, corrected (`correctedRows`). */
  rows: readonly MappedRow[]
  mailingRef: string
  /** Mode of a submission. A check is always `T` (ADR 0010). */
  mode: BpostMode
  priority: 'P' | 'NP'
  ids: BpostIds
  /** Time in the file name. */
  now: Date
  /** The details of step 1, for a submission. */
  create?: { expectedDeliveryDate: string; format: 'Small' | 'Large'; genMID: 'N' | '7' | '9' | '11'; genPSC: 'Y' | 'N' }
}

/** The file to put in the mailbox, and what the mailing remembers of it. */
export interface RequestFile {
  kind: 'check' | 'create'
  /** Canonical bpost name, `MID_0200_<sender>_REFERENCE0_<time>_0RQ.XML`. */
  fileName: string
  /** The XML as ISO-8859-1. */
  bytes: Uint8Array
  mailingRef: string
  mode: BpostMode
  /** Number of addresses in the file. */
  items: number
  fingerprint: string
}

/** The request fails the schema or holds characters bpost refuses. */
export class RequestInvalidError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(`MailingRequest invalid: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
    this.name = 'RequestInvalidError'
  }
}

/**
 * Builds the MailingCheck or MailingCreate file of a mailing, validated, with its canonical name.
 * @param input Kind, rows, reference, mode, priority, bpost numbers, time and (for a submission) the details.
 * @returns The file and its summary.
 * @throws RequestInvalidError when the request fails validation.
 * @example
 * const file = await buildRequestFile({ kind: 'check', rows, mailingRef: checkMailingRef(code, 1), mode: 'T', priority: 'NP', ids, now: new Date() })
 */
export async function buildRequestFile(input: RequestFileInput): Promise<RequestFile> {
  const items = rowsToItems([...input.rows], input.priority)
  const customerFileRef = normalizeBpostCustomerFileRef(WEB_CUSTOMER_FILE_REF)
  const credentials = { ...input.ids, midVersion: WEB_MID_VERSION }
  const mode: BpostMode = input.kind === 'check' ? 'T' : input.mode
  const request =
    input.kind === 'check'
      ? buildMailingCheckRequest(items, { mailingRef: input.mailingRef, priority: input.priority, mode: 'T', customerFileRef }, credentials)
      : buildMailingRequest(
          items,
          {
            mailingRef: input.mailingRef,
            priority: input.priority,
            mode,
            allowNonTestMode: true, // the user chose this mode for this mailing (ADR 0010)
            customerFileRef,
            ...input.create!,
          },
          credentials,
        )
  const validation = validateMailingRequest(request, WEB_MID_VERSION)
  if (!validation.valid || !validation.data) throw new RequestInvalidError(validation.issues)
  stripEmptyDepositType(validation.data)
  const xml = buildXml({ MailingRequest: validation.data })
  return {
    kind: input.kind,
    fileName: buildMailingRequestFileName({
      senderId: input.ids.customerId,
      customerFileRef,
      version: WEB_MID_VERSION,
      generatedAt: input.now,
    }),
    bytes: encodeLatin1(xml),
    mailingRef: input.mailingRef,
    mode,
    items: items.length,
    fingerprint: await itemsFingerprint(input.rows, input.priority),
  }
}
```

  Let op: `buildMailingCheckRequest` geeft een `console.warn` als `mode` niet `T` is; hier is het altijd `T`. Een `create` zonder `input.create` is een programmeerfout: `input.create!` laat het schema dat melden.

- [ ] **Step 5: Draai de tests.** Run: `npx vitest run tests/core/masspost/request-file.test.ts tests/core/masspost/pipeline.test.ts`. Expected: PASS (80 tekens overschrijdt `Comp.value` `max(70)` in `src/schemas/mailing-request.ts`).

- [ ] **Step 6: Checkpoint.** Run: `npx tsc --noEmit -p .`. Expected: geen fouten in de nieuwe bestanden.

### Task 4: Antwoorden van bpost inlezen (`parse-response.ts`)

**Files:**
- Modify: `src/core/masspost/parse-response.ts` (nieuwe functies; de bestaande twee blijven)
- Test: `tests/core/masspost/parse-response.test.ts`

**Interfaces:**
- Consumes: `parseXml` (`@/lib/xml`), `UNSTRUCTURED_COMP_CODES`, `COUNTRY_COMP_CODES`, `AddressField` (`mapping.ts`).
- Produces:
  - `interface BpostMessage { code: string; severity: string; contents: Record<string, string> }`
  - `type SuggestionSource = 'OptiAddress'`
  - `interface AddressSuggestion { field: AddressField; value: string; source: SuggestionSource }`
  - `type AddressCandidate = Partial<Record<AddressField, string>>`
  - `interface ItemResult { seq: number; messages: BpostMessage[]; suggestions: AddressSuggestion[]; candidates: AddressCandidate[]; sent: Partial<Record<AddressField, string>>; midNum?: string }`
  - `interface MailingResult { kind: 'check' | 'create'; requestFileName: string; mailingRef: string; statusCode: string; arr: number | null; messages: BpostMessage[]; items: ItemResult[] }`
  - `interface AckResult { kind: 'ack'; requestFileName: string; receivedAt: string | null; messages: BpostMessage[] }`
  - `type BpostResponse = AckResult | MailingResult`
  - `parseBpostResponse(xml: string): BpostResponse`, `class NotABpostResponseError extends Error`
  - `isRejected(r: BpostResponse): boolean`
  - `isCorrectionCode(code: string): boolean` (`7001` of `MID-7001`)

- [ ] **Step 1: Schrijf de tests** (voeg toe aan `tests/core/masspost/parse-response.test.ts`; de bestaande test blijft):

```ts
import {
  isRejected,
  NotABpostResponseError,
  parseBpostResponse,
  type MailingResult,
} from '@/core/masspost/parse-response'

const sample = (name: string) => readFileSync(path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip', name), 'latin1')

describe('parseBpostResponse', () => {
  it('reads an acknowledgement (_1AK)', () => {
    const r = parseBpostResponse(sample('MID_0200_251614_REFERENCE0_261001153940_1AK.XML'))
    expect(r).toEqual({
      kind: 'ack',
      requestFileName: 'MID_0200_251614_REFERENCE0_261001153940_0RQ.XML',
      receivedAt: '2026-10-01T15:41:05',
      messages: [],
    })
    expect(isRejected(r)).toBe(false)
  })

  it('reads a MailingCheck result: request, reference, status, ARR, corrections per seq', () => {
    const r = parseBpostResponse(sample('MID_0200_251614_REFERENCE0_261001152310_2RS.XML')) as MailingResult
    expect(r).toMatchObject({
      kind: 'check',
      requestFileName: 'MID_0200_251614_REFERENCE0_261001151829_0RQ.XML',
      mailingRef: 'OPTI20261001131829',
      statusCode: '100',
      arr: 100,
    })
    expect(r.items).toHaveLength(5)
    const first = r.items.find((i) => i.seq === 1)!
    expect(first.messages.map((m) => m.code)).toEqual(['MID-4060', '7001'])
    expect(first.suggestions).toEqual([
      { field: 'streetHouseBox', value: 'MOLENBEEKSESTRAAT 184 BUS 35', source: 'OptiAddress' },
    ])
    expect(first.sent).toEqual({ name: 'Anna Vanderstappen', streetHouseBox: 'Molenbeeksestraat 184 35', postcodeCity: '1020 Brussel' })
    expect(isRejected(r)).toBe(false)
  })

  it('reads a MailingCreate result with the Mail ID per seq', () => {
    const r = parseBpostResponse(sample('MID_0200_251614_REFERENCE0_260929221652_2RS.XML')) as MailingResult
    expect(r).toMatchObject({ kind: 'create', mailingRef: 'MANUAL20260929201329', statusCode: '100', arr: 99.8 })
    expect(r.items.find((i) => i.seq === 1)?.midNum).toBe('90002109818449')
  })

  it('marks a response with a FATAL file message as rejected', () => {
    const r = parseBpostResponse(sample('MID_0100_251614_REFERENCE0_260928215959_2RS.XML'))
    expect(r.messages.some((m) => m.code === 'MID-2040' && m.severity === 'FATAL')).toBe(true)
    expect(isRejected(r)).toBe(true)
  })

  // Synthetic: no live MID-4010/4020 response yet (design 13/10, part 5). Shape from the XSD
  // (Suggestions/Suggestion/Comps) and the live 7001 messages.
  const SYNTHETIC = `<?xml version='1.0' encoding='ISO-8859-1'?><MailingResponse><Context requestName="MailingResponse" dataset="M037_MID" sender="MID" receiver="251614" version="0200"/><Header customerId="251614"><Files><RequestProps fileName="MID_0200_251614_REFERENCE0_261013140500_0RQ.XML" customerFileRef="REFERENCE0"/></Files></Header><MailingCheck seq="1" mailingRef="CP-2026-15-C1"><Status code="100"/><Replies><Reply seq="1"><XPath>/MailingRequest/MailingCheck[@seq="1"]</XPath><Messages><Message code="MID-4040" severity="INFO"><MessageContents><MessageContent key="compliancyRateAtBuildingLevel" value="93.40%"/></MessageContents></Message></Messages></Reply><Reply seq="2"><Locations><Location tagName="Item" attributeName="seq" attributeValue="58"/></Locations><Messages><Message code="MID-4010" severity="ERROR"/></Messages><RequestItem seq="58" lang="fr" priority="NP"><Comps><Comp code="90" value="Luc Dubois"/><Comp code="92" value="Rue de Liège 4"/><Comp code="93" value="4000 Liège"/></Comps></RequestItem></Reply><Reply seq="3"><Locations><Location tagName="Item" attributeName="seq" attributeValue="412"/></Locations><Messages><Message code="MID-4020" severity="ERROR"/></Messages><Suggestions><Suggestion><Comps><Comp code="92" value="KERKSTRAAT 1"/><Comp code="93" value="9300 AALST"/></Comps></Suggestion><Suggestion><Comps><Comp code="92" value="KERKSTRAAT 1"/><Comp code="93" value="9310 MOORSEL"/></Comps></Suggestion></Suggestions></Reply></Replies></MailingCheck></MailingResponse>`

  it('reads unknown addresses, multiple matches with their candidates, and Latin-1 text', () => {
    const r = parseBpostResponse(SYNTHETIC) as MailingResult
    expect(r.arr).toBe(93.4)
    expect(r.items.find((i) => i.seq === 58)).toMatchObject({ messages: [{ code: 'MID-4010', severity: 'ERROR', contents: {} }], sent: { streetHouseBox: 'Rue de Liège 4', postcodeCity: '4000 Liège' } })
    expect(r.items.find((i) => i.seq === 412)?.candidates).toEqual([
      { streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9300 AALST' },
      { streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9310 MOORSEL' },
    ])
  })

  it('refuses a file that is not a bpost response', () => {
    expect(() => parseBpostResponse('<MailingRequest/>')).toThrow(NotABpostResponseError)
    expect(() => parseBpostResponse('geen xml')).toThrow(NotABpostResponseError)
  })
})
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/core/masspost/parse-response.test.ts`. Expected: FAIL ("parseBpostResponse is not a function" of een importfout).

- [ ] **Step 3: Implementeer** onderaan `src/core/masspost/parse-response.ts`:

```ts
import { COUNTRY_COMP_CODES, UNSTRUCTURED_COMP_CODES, type AddressField } from './mapping'

/** One message of bpost, with its key/value contents (e.g. `compCode`, `compCorrection`, `midNum`). */
export interface BpostMessage {
  code: string
  severity: string
  contents: Record<string, string>
}

/** Where a proposal comes from. Later other sources join (postcode.eu, bpost Address Validation). */
export type SuggestionSource = 'OptiAddress'

/** A proposal for one field of an address. */
export interface AddressSuggestion {
  field: AddressField
  value: string
  source: SuggestionSource
}

/** A whole address bpost proposes when it finds several (`MID-4020`, `Suggestions`). */
export type AddressCandidate = Partial<Record<AddressField, string>>

/** What bpost says about one address, by `seq` (the row number in the Excel). */
export interface ItemResult {
  seq: number
  messages: BpostMessage[]
  /** Corrections (`7001` / `MID-7001` with `compCode` and `compCorrection`). */
  suggestions: AddressSuggestion[]
  /** Candidates of `Suggestions` (may be empty: never seen live yet). */
  candidates: AddressCandidate[]
  /** The address as sent (`RequestItem`, with `copyRequestItem="Y"`). */
  sent: Partial<Record<AddressField, string>>
  /** Mail ID (`MID-4030`, `midNum`), in a MailingCreate result. */
  midNum?: string
}

/** The result of a MailingCheck or MailingCreate (`_2RS`). */
export interface MailingResult {
  kind: 'check' | 'create'
  /** Name of the request file this answers (`Header/Files/RequestProps/@fileName`). */
  requestFileName: string
  mailingRef: string
  /** `Status/@code`: 100 accepted, 998/999 refused; empty when the action is missing. */
  statusCode: string
  /** Address Recognition Rate in percent (`MID-4040`, `compliancyRateAtBuildingLevel`). */
  arr: number | null
  /** Messages about the file or the action, not about one address. */
  messages: BpostMessage[]
  items: ItemResult[]
}

/** The acknowledgement (`_1AK`): bpost received the file. */
export interface AckResult {
  kind: 'ack'
  requestFileName: string
  /** `FileReceived/@timeStamp`, as written by bpost (local time, no zone). */
  receivedAt: string | null
  messages: BpostMessage[]
}

/** Any file bpost sends back. */
export type BpostResponse = AckResult | MailingResult

/** The file is not an acknowledgement or a MailingResponse. */
export class NotABpostResponseError extends Error {
  constructor() {
    super('Not a bpost response (RequestAck or MailingResponse).')
    this.name = 'NotABpostResponseError'
  }
}

type Node = Record<string, unknown>
const list = (value: unknown): Node[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]) as Node[]
const attr = (node: Node | undefined, name: string) => String(node?.[`@_${name}`] ?? '')

const FIELD_BY_COMP: Record<string, AddressField> = {
  ...Object.fromEntries(Object.entries(UNSTRUCTURED_COMP_CODES).map(([field, code]) => [code, field as AddressField])),
  [COUNTRY_COMP_CODES.isoCode]: 'country',
  [COUNTRY_COMP_CODES.name]: 'country',
}

/**
 * True for the correction message of OptiAddress: live `7001`, documented `MID-7001` (field findings).
 * @param code A message code.
 * @returns True for `7001` and `MID-7001`.
 */
export function isCorrectionCode(code: string): boolean {
  return code === '7001' || code === 'MID-7001'
}

function readMessages(replyOrNode: Node | undefined): BpostMessage[] {
  const block = replyOrNode?.Messages as Node | undefined
  return list(block?.Message).map((m) => ({
    code: attr(m, 'code'),
    severity: attr(m, 'severity'),
    contents: Object.fromEntries(
      list((m.MessageContents as Node | undefined)?.MessageContent).map((c) => [attr(c, 'key'), attr(c, 'value')]),
    ),
  }))
}

function readComps(comps: Node | undefined): Partial<Record<AddressField, string>> {
  const out: Partial<Record<AddressField, string>> = {}
  for (const comp of list(comps?.Comp)) {
    const field = FIELD_BY_COMP[attr(comp, 'code')]
    if (field) out[field] = attr(comp, 'value')
  }
  return out
}

function itemSeq(reply: Node): number | null {
  const location = list((reply.Locations as Node | undefined)?.Location).find((l) => attr(l, 'tagName') === 'Item')
  return location ? Number(attr(location, 'attributeValue')) : null
}

function arrOf(messages: BpostMessage[]): number | null {
  const raw = messages.find((m) => m.code === 'MID-4040')?.contents.compliancyRateAtBuildingLevel
  const n = raw === undefined ? NaN : Number.parseFloat(raw.replace('%', '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Reads any file bpost sends back: the acknowledgement (`RequestAck`, `_1AK`) or the result of a
 * MailingCheck or MailingCreate (`MailingResponse`, `_2RS`).
 * @param xml The file as text (decode the bytes as ISO-8859-1 first).
 * @returns The response, with `kind` `ack`, `check` or `create`.
 * @throws NotABpostResponseError for anything else.
 * @example
 * const r = parseBpostResponse(decodeLatin1(bytes))
 * if (r.kind === 'check') console.log(r.arr)
 */
export function parseBpostResponse(xml: string): BpostResponse {
  let doc: Node
  try {
    doc = parseXml<Node>(xml)
  } catch {
    throw new NotABpostResponseError()
  }
  const ack = doc.RequestAck as Node | undefined
  if (ack !== undefined) {
    const received = list(ack.FileReceived)[0]
    return {
      kind: 'ack',
      requestFileName: attr(received, 'fileName'),
      receivedAt: attr(received, 'timeStamp') || null,
      messages: list(ack.Replies && (ack.Replies as Node).Reply).flatMap(readMessages),
    }
  }
  const root = doc.MailingResponse as Node | undefined
  if (root === undefined || typeof root !== 'object') throw new NotABpostResponseError()
  const requestProps = list(((root.Header as Node | undefined)?.Files as Node | undefined)?.RequestProps)[0]
  const fileMessages = list((root.Replies as Node | undefined)?.Reply).flatMap(readMessages)
  const createAction = list(root.MailingCreate)[0]
  const action = createAction ?? list(root.MailingCheck)[0]
  const kind: 'check' | 'create' = createAction ? 'create' : 'check'
  const messages = [...fileMessages]
  const items: ItemResult[] = []
  for (const reply of list((action?.Replies as Node | undefined)?.Reply)) {
    const replyMessages = readMessages(reply)
    const seq = itemSeq(reply)
    if (seq === null) {
      messages.push(...replyMessages)
      continue
    }
    items.push({
      seq,
      messages: replyMessages,
      suggestions: replyMessages
        .filter((m) => isCorrectionCode(m.code) && FIELD_BY_COMP[m.contents.compCode] && m.contents.compCorrection)
        .map((m) => ({ field: FIELD_BY_COMP[m.contents.compCode], value: m.contents.compCorrection, source: 'OptiAddress' as const })),
      candidates: list((reply.Suggestions as Node | undefined)?.Suggestion).map((s) => readComps(s.Comps as Node | undefined)),
      sent: readComps((list(reply.RequestItem)[0]?.Comps as Node | undefined) ?? undefined),
      ...(replyMessages.find((m) => m.code === 'MID-4030')?.contents.midNum
        ? { midNum: replyMessages.find((m) => m.code === 'MID-4030')!.contents.midNum }
        : {}),
    })
  }
  return {
    kind,
    requestFileName: attr(requestProps, 'fileName'),
    mailingRef: attr(action, 'mailingRef'),
    statusCode: attr(list(action?.Status)[0], 'code'),
    arr: arrOf(messages),
    messages,
    items,
  }
}

/**
 * Whether bpost refused the file or the action: a `FATAL` or `ERROR` message on the file, status
 * 998 or 999, or a result without an action.
 * @param r A parsed response.
 * @returns True when refused.
 */
export function isRejected(r: BpostResponse): boolean {
  if (r.messages.some((m) => m.severity === 'FATAL' || m.severity === 'ERROR')) return true
  if (r.kind === 'ack') return false
  return r.statusCode !== '100'
}
```

  Waarom geen `MailingResponse`-schema in Zod: het antwoord komt van bpost en kan velden missen; de parser leest wat er is en geeft lege waarden, en `isRejected` beslist.

- [ ] **Step 4: Draai de tests.** Run: `npx vitest run tests/core/masspost/parse-response.test.ts`. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Run: `npx vitest run tests/core/masspost/`. Expected: PASS.

### Task 5: Het resultaat van een controle (`address-check.ts`)

**Files:**
- Create: `src/core/masspost/address-check.ts`
- Test: `tests/core/masspost/address-check.test.ts`

**Interfaces:**
- Consumes: `MailingResult`, `ItemResult`, `SuggestionSource`, `isCorrectionCode` (taak 4); `AddressField` (`mapping.ts`).
- Produces:
  - `type CheckGroupId = 'noAddress' | 'multiple' | 'proposal' | 'note' | 'ok'`
  - `const CHECK_GROUPS: readonly { id: CheckGroupId; title: string }[]`
  - `interface AddressOption { value: string; source: SuggestionSource }`
  - `interface CheckRow { key: string; seq: number; group: CheckGroupId; field: 'address' | AddressField; sent: Partial<Record<AddressField, string>>; original: string; proposal?: string; options: AddressOption[]; note?: string; codes: string[] }`
  - `interface CheckView { rows: CheckRow[]; counts: Record<CheckGroupId, number>; unknownCodes: string[] }`
  - `groupCheckResult(result: MailingResult, sentItems: number): CheckView`
  - `inUserCase(correction: string, sent: string): string`, `sameButCase(a: string, b: string): boolean`
  - `splitAddress(text: string): { streetHouseBox: string; postcodeCity: string } | null`, `joinAddress(sent: Partial<Record<AddressField, string>>): string`
  - `currentValue(row: CheckRow, values: Readonly<Record<string, string>>): string`
  - `valueChanges(row: CheckRow, value: string): { key: string; value: string | undefined }[]` (de correcties die een waarde in de rij geeft; `undefined` = terug naar het origineel)
  - `isOpen(row: CheckRow, values: Readonly<Record<string, string>>, excluded: Readonly<Record<number, true>>): boolean`
  - `estimateArr(input: { arr: number | null; sentItems: number; rows: readonly CheckRow[]; values: Readonly<Record<string, string>>; excluded: Readonly<Record<number, true>>; excludedAtSend: readonly number[] }): number | null`

- [ ] **Step 1: Schrijf de tests** in `tests/core/masspost/address-check.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseBpostResponse, type MailingResult } from '@/core/masspost/parse-response'
import {
  currentValue,
  estimateArr,
  groupCheckResult,
  inUserCase,
  isOpen,
  joinAddress,
  sameButCase,
  splitAddress,
  valueChanges,
} from '@/core/masspost/address-check'

const real = parseBpostResponse(
  readFileSync(path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip/MID_0200_251614_REFERENCE0_261001152310_2RS.XML'), 'latin1'),
) as MailingResult

const result = (items: MailingResult['items'], arr = 90): MailingResult => ({
  kind: 'check',
  requestFileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  statusCode: '100',
  arr,
  messages: [],
  items,
})
const msg = (code: string, severity = 'WARN', contents: Record<string, string> = {}) => ({ code, severity, contents })
const sent = { name: 'Luc', streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' }

describe('inUserCase and sameButCase (decision 37 of 02/10)', () => {
  it('keeps the writing of the user and lowercases the box word', () => {
    expect(inUserCase('MOLENBEEKSESTRAAT 184 BUS 35', 'Molenbeeksestraat 184 35')).toBe('Molenbeeksestraat 184 bus 35')
    expect(inUserCase('KONING ALBERT I-LAAN 12', 'Koning Albertlaan 12')).toBe('Koning Albert I-laan 12')
    expect(inUserCase('STEYLSSTRAAT 92', 'STEYLSSTRAAT 92 ')).toBe('STEYLSSTRAAT 92')
  })
  it('sees a difference in capitals only', () => {
    expect(sameButCase('STEYLSSTRAAT 92', 'Steylsstraat  92')).toBe(true)
    expect(sameButCase('PAGODENLAAN 21 BUS 5', 'Pagodenlaan 21 5')).toBe(false)
  })
})

describe('splitAddress and joinAddress (decision 41 of 02/10)', () => {
  it('splits on the comma, or before the postcode', () => {
    expect(splitAddress('Kerkstraat 1, 9300 Aalst')).toEqual({ streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' })
    expect(splitAddress('Kerkstraat 1 9300 Aalst')).toEqual({ streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' })
    expect(splitAddress('Kerkstraat 1')).toBeNull()
  })
  it('joins street and postcode', () => {
    expect(joinAddress(sent)).toBe('Kerkstraat 1, 9300 Aalst')
  })
})

describe('groupCheckResult', () => {
  it('groups the live sample: real proposals, capitals only is in order', () => {
    const view = groupCheckResult(real, 5)
    const proposals = view.rows.filter((r) => r.group === 'proposal')
    expect(proposals.map((r) => r.seq)).toEqual([1, 2]) // 3, 4 and 5 differ only in capitals
    expect(proposals[0]).toMatchObject({ seq: 1, field: 'streetHouseBox', original: 'Molenbeeksestraat 184 35', proposal: 'Molenbeeksestraat 184 bus 35', options: [{ value: 'Molenbeeksestraat 184 bus 35', source: 'OptiAddress' }] })
    expect(view.rows.find((r) => r.seq === 3)?.group).toBe('ok') // STEYLSSTRAAT 92 vs Steylsstraat 92
    expect(view.counts).toEqual({ noAddress: 0, multiple: 0, proposal: 2, note: 0, ok: 3 })
  })

  it('puts unknown addresses, multiple matches, notes and unknown codes in their group', () => {
    const view = groupCheckResult(
      result([
        { seq: 58, messages: [msg('MID-4010', 'ERROR')], suggestions: [], candidates: [], sent },
        { seq: 412, messages: [msg('MID-4020', 'ERROR')], suggestions: [], candidates: [{ streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9300 AALST' }], sent },
        { seq: 77, messages: [msg('MID-4060')], suggestions: [], candidates: [], sent },
        { seq: 90, messages: [msg('MID-9999')], suggestions: [], candidates: [], sent },
      ]),
      10,
    )
    expect(view.rows.find((r) => r.seq === 58)).toMatchObject({ group: 'noAddress', field: 'address', key: '58:address', original: 'Kerkstraat 1, 9300 Aalst' })
    expect(view.rows.find((r) => r.seq === 412)?.options).toEqual([{ value: 'Kerkstraat 1, 9300 Aalst', source: 'OptiAddress' }])
    expect(view.rows.find((r) => r.seq === 77)).toMatchObject({ group: 'note', note: 'Gebouw gevonden, maar geen perfecte match. Optioneel nakijken.' })
    expect(view.rows.find((r) => r.seq === 90)).toMatchObject({ group: 'note', note: 'Onbekende melding van bpost (MID-9999).' })
    expect(view.unknownCodes).toEqual(['MID-9999'])
    expect(view.counts).toEqual({ noAddress: 1, multiple: 1, proposal: 0, note: 2, ok: 6 })
  })
})

describe('open rows and the estimate (decision 39 of 02/10)', () => {
  const view = groupCheckResult(
    result([
      { seq: 58, messages: [msg('MID-4010', 'ERROR')], suggestions: [], candidates: [], sent },
      { seq: 2, messages: [msg('7001', 'WARN', { compCode: '92', compCorrection: 'KERKSTRAAT 1 BUS 2' })], suggestions: [{ field: 'streetHouseBox', value: 'KERKSTRAAT 1 BUS 2', source: 'OptiAddress' }], candidates: [], sent },
    ], 90),
    10,
  )
  const unknown = view.rows.find((r) => r.seq === 58)!
  const proposal = view.rows.find((r) => r.seq === 2)!

  it('a row is open until it changes or is excluded', () => {
    expect(isOpen(unknown, {}, {})).toBe(true)
    expect(isOpen(unknown, {}, { 58: true })).toBe(false)
    const changes = valueChanges(unknown, 'Kerkstraat 10, 9300 Aalst')
    expect(changes).toEqual([
      { key: '58:streetHouseBox', value: 'Kerkstraat 10' },
      { key: '58:postcodeCity', value: undefined },
    ])
    const values = { '58:streetHouseBox': 'Kerkstraat 10' }
    expect(currentValue(unknown, values)).toBe('Kerkstraat 10, 9300 Aalst')
    expect(isOpen(unknown, values, {})).toBe(false)
    expect(isOpen(proposal, { '2:streetHouseBox': 'Kerkstraat 1 bus 2' }, {})).toBe(false)
  })

  it('estimates the ARR from the fixes and exclusions', () => {
    const base = { arr: 90, sentItems: 10, rows: view.rows, excludedAtSend: [] }
    expect(estimateArr({ ...base, values: {}, excluded: {} })).toBe(90)
    expect(estimateArr({ ...base, values: { '58:streetHouseBox': 'Kerkstraat 10' }, excluded: {} })).toBe(100)
    expect(estimateArr({ ...base, values: {}, excluded: { 58: true } })).toBe(100) // 9 of 9
    expect(estimateArr({ ...base, arr: null, values: {}, excluded: {} })).toBeNull()
  })
})
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/core/masspost/address-check.test.ts`. Expected: FAIL (module bestaat niet).

- [ ] **Step 3: Schrijf `src/core/masspost/address-check.ts`:**

```ts
// src/core/masspost/address-check.ts
// The result of an address check (MailingCheck) as step 4 shows it (sketch adrescontrole.html,
// decisions 37-41 of 02/10): groups, proposals in the user's writing, open rows and the estimate.
import type { AddressField } from './mapping'
import { isCorrectionCode, type ItemResult, type MailingResult, type SuggestionSource } from './parse-response'

/** Group of a row in step 4. */
export type CheckGroupId = 'noAddress' | 'multiple' | 'proposal' | 'note' | 'ok'

/** The groups in screen order, with their title. */
export const CHECK_GROUPS: readonly { id: CheckGroupId; title: string }[] = [
  { id: 'noAddress', title: 'Geen adres gevonden' },
  { id: 'multiple', title: 'Meerdere adressen gevonden' },
  { id: 'proposal', title: 'Voorstel van bpost' },
  { id: 'note', title: 'Opmerking zonder voorstel' },
  { id: 'ok', title: 'In orde' },
]

/** One option of the list under an address field: the address and where it comes from. */
export interface AddressOption {
  value: string
  source: SuggestionSource
}

/**
 * One row of step 4. `field` is `address` for an address bpost did not find (or found several
 * times): one field "straat en nummer, postcode en gemeente", split into Comp 92 and 93 (decision 41).
 */
export interface CheckRow {
  /** `<seq>:<field>`, unique on the screen. */
  key: string
  seq: number
  group: CheckGroupId
  field: 'address' | AddressField
  sent: Partial<Record<AddressField, string>>
  /** The value as sent. */
  original: string
  /** The proposal of bpost, in the user's writing. */
  proposal?: string
  options: AddressOption[]
  /** Explanation for a row without a proposal. */
  note?: string
  codes: string[]
}

/** Rows, number of addresses per group, and codes this app does not know. */
export interface CheckView {
  rows: CheckRow[]
  counts: Record<CheckGroupId, number>
  unknownCodes: string[]
}

const KNOWN = new Set(['MID-4000', 'MID-4010', 'MID-4020', 'MID-4030', 'MID-4040', 'MID-4050', 'MID-4060', 'MID-4070', 'MID-4080', 'MID-4090', '7001', 'MID-7001'])
const NOT_FOUND = new Set(['MID-4010', 'MID-4070', 'MID-4080'])
const NOTES: Record<string, string> = {
  'MID-4000': 'Een deel van het adres klopt niet volgens bpost. Optioneel nakijken.',
  'MID-4050': 'Ronde gevonden, maar geen afgiftepunt. Optioneel nakijken.',
  'MID-4060': 'Gebouw gevonden, maar geen perfecte match. Optioneel nakijken.',
  'MID-4090': 'Straat gevonden, maar geen ronde. Optioneel nakijken.',
}
const LOWER = new Set(['bus', 'b', 'bte', 'boite', 'boîte'])
const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

/**
 * Whether two texts differ only in capitals and spaces: bpost writes everything in capitals.
 * @param a One text.
 * @param b The other.
 * @returns True when they are the same apart from capitals.
 */
export function sameButCase(a: string, b: string): boolean {
  return norm(a).toLocaleUpperCase('nl') === norm(b).toLocaleUpperCase('nl')
}

/**
 * A correction of bpost in the writing of the user: words the user wrote keep the user's form, new
 * words get a capital (the box word `bus` stays small). When the user writes in capitals, so does
 * the result.
 * @param correction The correction of bpost (capitals).
 * @param sent What the user sent.
 * @returns The proposal.
 * @example inUserCase('MOLENBEEKSESTRAAT 184 BUS 35', 'Molenbeeksestraat 184 35') // 'Molenbeeksestraat 184 bus 35'
 */
export function inUserCase(correction: string, sent: string): string {
  const own = norm(sent).split(' ')
  if (own.join(' ') === own.join(' ').toLocaleUpperCase('nl')) return norm(correction)
  const used = new Set<number>()
  return norm(correction)
    .split(' ')
    .map((word) => {
      const i = own.findIndex((w, j) => !used.has(j) && w.toLocaleUpperCase('nl') === word.toLocaleUpperCase('nl'))
      if (i >= 0) {
        used.add(i)
        return own[i]
      }
      const lower = word.toLocaleLowerCase('nl')
      if (LOWER.has(lower)) return lower
      return lower.replace(/^\p{L}/u, (c) => c.toLocaleUpperCase('nl'))
    })
    .join(' ')
}

/**
 * Splits "straat en nummer, postcode en gemeente" into Comp 92 and 93: on the last comma, or before a
 * postcode of four digits.
 * @param text What the user typed or chose.
 * @returns Both parts, or null when there is no postcode.
 */
export function splitAddress(text: string): { streetHouseBox: string; postcodeCity: string } | null {
  const t = norm(text)
  const comma = t.lastIndexOf(',')
  if (comma > 0) {
    const streetHouseBox = t.slice(0, comma).trim()
    const postcodeCity = t.slice(comma + 1).trim()
    return /^\d{4} \S/.test(postcodeCity) && streetHouseBox ? { streetHouseBox, postcodeCity } : null
  }
  const m = /^(.+?) (\d{4} \S.*)$/.exec(t)
  return m ? { streetHouseBox: m[1], postcodeCity: m[2] } : null
}

/**
 * Street and postcode as one text, for the address field.
 * @param sent The address fields.
 * @returns "Kerkstraat 1, 9300 Aalst".
 */
export function joinAddress(sent: Partial<Record<AddressField, string>>): string {
  return [sent.streetHouseBox ?? '', sent.postcodeCity ?? ''].filter(Boolean).join(', ')
}

function rowsOf(item: ItemResult): Omit<CheckRow, 'key'>[] {
  const codes = item.messages.map((m) => m.code)
  const base = { seq: item.seq, sent: item.sent, codes }
  const address = { field: 'address' as const, original: joinAddress(item.sent) }
  if (codes.some((c) => NOT_FOUND.has(c))) return [{ ...base, ...address, group: 'noAddress', options: [] }]
  if (codes.includes('MID-4020')) {
    const options = item.candidates.map((c) => ({
      value: inUserCase(joinAddress(c), joinAddress(item.sent)),
      source: 'OptiAddress' as const,
    }))
    return [{ ...base, ...address, group: 'multiple', options }]
  }
  const real = item.suggestions.filter((s) => !sameButCase(s.value, item.sent[s.field] ?? ''))
  if (real.length > 0) {
    return real.map((s) => {
      const original = item.sent[s.field] ?? ''
      const proposal = inUserCase(s.value, original)
      return { ...base, field: s.field, original, proposal, group: 'proposal', options: [{ value: proposal, source: s.source }] }
    })
  }
  const hadCorrection = item.messages.some((m) => isCorrectionCode(m.code))
  const remarks = item.messages.filter((m) => m.severity !== 'INFO' && !isCorrectionCode(m.code))
  if (hadCorrection || remarks.length === 0) {
    return [{ ...base, field: 'streetHouseBox', original: item.sent.streetHouseBox ?? '', group: 'ok', options: [] }]
  }
  const code = remarks[0].code
  return [
    {
      ...base,
      field: 'streetHouseBox',
      original: item.sent.streetHouseBox ?? '',
      group: 'note',
      options: [],
      note: NOTES[code] ?? `Onbekende melding van bpost (${code}).`,
    },
  ]
}

/**
 * The rows of step 4 from a MailingCheck result. A proposal that only differs in capitals counts as
 * in order (decision 37 of 02/10). Addresses without a reply from bpost are in order.
 * @param result The parsed `_2RS`.
 * @param sentItems Number of addresses in the request (the reply may skip addresses without remarks).
 * @returns Rows, counts per group (addresses, not rows) and unknown codes.
 */
export function groupCheckResult(result: MailingResult, sentItems: number): CheckView {
  const rows = result.items.flatMap((item) => rowsOf(item).map((r) => ({ ...r, key: `${r.seq}:${r.field}` })))
  const counts: Record<CheckGroupId, number> = { noAddress: 0, multiple: 0, proposal: 0, note: 0, ok: 0 }
  const seen = new Map<number, CheckGroupId>()
  for (const row of rows) if (!seen.has(row.seq)) seen.set(row.seq, row.group)
  for (const group of seen.values()) counts[group]++
  counts.ok += Math.max(0, sentItems - seen.size)
  const unknownCodes = [...new Set(result.items.flatMap((i) => i.messages.map((m) => m.code)).filter((c) => !KNOWN.has(c)))]
  return { rows, counts, unknownCodes }
}

/**
 * The value of a row now: the correction, or the original.
 * @param row The row.
 * @param values Corrections by `<seq>:<field>`.
 * @returns The value shown.
 */
export function currentValue(row: CheckRow, values: Readonly<Record<string, string>>): string {
  if (row.field !== 'address') return values[row.key] ?? row.original
  return joinAddress({
    streetHouseBox: values[`${row.seq}:streetHouseBox`] ?? row.sent.streetHouseBox,
    postcodeCity: values[`${row.seq}:postcodeCity`] ?? row.sent.postcodeCity,
  })
}

/**
 * The corrections a new value of a row gives. For an address: street and postcode apart; a part that
 * equals what was sent clears its correction (`undefined`). Call only with a value `splitAddress` accepts.
 * @param row The row.
 * @param value The new value.
 * @returns Changes by key.
 */
export function valueChanges(row: CheckRow, value: string): { key: string; value: string | undefined }[] {
  if (row.field !== 'address') return [{ key: row.key, value: value === row.original ? undefined : value }]
  const parts = splitAddress(value)
  if (!parts) return []
  return (['streetHouseBox', 'postcodeCity'] as const).map((field) => ({
    key: `${row.seq}:${field}`,
    value: parts[field] === row.sent[field] ? undefined : parts[field],
  }))
}

/**
 * Whether a row still asks for something: an address not found, several found, or a proposal, as
 * long as the value is the one sent and the row is not excluded. Notes never block.
 * @param row The row.
 * @param values Corrections.
 * @param excluded Excluded rows by seq.
 * @returns True while open.
 */
export function isOpen(
  row: CheckRow,
  values: Readonly<Record<string, string>>,
  excluded: Readonly<Record<number, true>>,
): boolean {
  if (row.group === 'note' || row.group === 'ok' || excluded[row.seq]) return false
  return currentValue(row, values) === row.original
}

/**
 * The ARR bpost would give now, as a light "phantom" line (decision 39 of 02/10): bpost's rate, plus the
 * addresses not found that you changed, minus what you left out since. An estimate; only bpost decides.
 * @param input The ARR of bpost, the number sent, the rows, corrections, exclusions now and at sending.
 * @returns A percentage with one decimal, or null without an ARR.
 */
export function estimateArr(input: {
  arr: number | null
  sentItems: number
  rows: readonly CheckRow[]
  values: Readonly<Record<string, string>>
  excluded: Readonly<Record<number, true>>
  excludedAtSend: readonly number[]
}): number | null {
  const { arr, sentItems, rows, values, excluded } = input
  if (arr === null || sentItems === 0) return arr
  const errorRows = rows.filter((r) => r.group === 'noAddress' || r.group === 'multiple')
  const errorSeqs = new Set(errorRows.map((r) => r.seq))
  const before = new Set(input.excludedAtSend)
  const fixed = errorRows.filter((r) => !excluded[r.seq] && currentValue(r, values) !== r.original).length
  const dropErr = [...errorSeqs].filter((seq) => excluded[seq]).length
  const dropOther = Object.keys(excluded).map(Number).filter((seq) => !errorSeqs.has(seq) && !before.has(seq)).length
  const total = sentItems - dropErr - dropOther
  if (total <= 0) return null
  const recognized = (arr / 100) * sentItems + fixed - dropOther
  return Math.round(Math.min(100, Math.max(0, (recognized / total) * 100)) * 10) / 10
}
```

- [ ] **Step 4: Draai de tests.** Run: `npx vitest run tests/core/masspost/address-check.test.ts`. Expected: PASS. In het echte voorbeeld verschillen rij 3, 4 en 5 enkel in hoofdletters (bv. `BROGNIEZSTRAAT 179`); rij 1 en 2 krijgen "bus".

- [ ] **Step 5: Checkpoint.** Run: `npx vitest run tests/core/masspost/`. Expected: PASS.

### Task 6: Uitwisselingen bij een mailing (`exchanges`, `exchange.ts`)

**Files:**
- Modify: `src/core/masspost/store/mailing.ts` (schema, `MailingSummary`, `summarize`, `statusGroup`), `src/core/masspost/store/mailing-store.ts` (`MailingChange` krijgt `'exchanges'`)
- Create: `src/core/masspost/exchange.ts`
- Test: `tests/core/masspost/store/mailing.test.ts`, `tests/core/masspost/exchange.test.ts`

**Interfaces:**
- Consumes: `RequestFile`, `BpostMode` (taak 3); `parseBpostResponse`, `isRejected`, `NotABpostResponseError`, `BpostResponse`, `MailingResult` (taak 4); `groupCheckResult` (taak 5).
- Produces:
  - in `mailing.ts`: `exchangeSchema`, `type Exchange = z.infer<typeof exchangeSchema>`, `type CheckCounts = Record<'noAddress' | 'multiple' | 'proposal' | 'note' | 'ok', number>`, `isWaiting(m: Mailing): boolean`; `MailingSummary` krijgt `waiting: boolean` en `submittedMode: 'T' | 'C' | 'P' | null`.
  - in `exchange.ts`:
    - `nextRefNumber(m: Mailing, kind: 'check' | 'create'): number`
    - `latestExchange(m: Mailing, kind?: 'check' | 'create'): Exchange | undefined`
    - `recordSent(m: Mailing, file: RequestFile, excluded: readonly number[], by: string, now: Date): MailingChange`
    - `type ProcessOutcome = { outcome: 'applied'; change: MailingChange; event: string; response: BpostResponse } | { outcome: 'duplicate' | 'older'; response: BpostResponse } | { outcome: 'foreign'; mailingRef: string | null } | { outcome: 'invalid' }`
    - `processResponse(m: Mailing, fileName: string, xml: string, now: Date): ProcessOutcome`
    - `changedSinceSent(exchange: Exchange, fingerprint: string): boolean`

- [ ] **Step 1: Schrijf de tests voor het schema en de samenvatting** (voeg toe aan `tests/core/masspost/store/mailing.test.ts`):

```ts
import { isWaiting, mailingSchema, summarize, type Exchange } from '@/core/masspost/store/mailing'
import { sampleMailing } from './fixtures'

const exchange = (over: Partial<Exchange> = {}): Exchange => ({
  kind: 'check',
  fileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  mode: 'T',
  items: 789,
  fingerprint: 'cd'.repeat(32),
  excluded: [],
  sentAt: '2026-10-13T12:05:00.000Z',
  sentBy: 'an@contrapunt.be',
  state: 'sent',
  ...over,
})

describe('exchanges (design 13/10, part 2)', () => {
  it('keeps old mailings readable: exchanges and counts.check are optional', () => {
    expect(mailingSchema.safeParse(sampleMailing()).success).toBe(true)
    const m = sampleMailing({ exchanges: [exchange()], counts: { addresses: 789, formatIssuesOpen: 0, check: { noAddress: 1, multiple: 0, proposal: 2, note: 0, ok: 786 } } })
    expect(mailingSchema.safeParse(m).success).toBe(true)
  })

  it('is waiting while the last exchange is sent or received', () => {
    expect(isWaiting(sampleMailing())).toBe(false)
    expect(isWaiting(sampleMailing({ exchanges: [exchange()] }))).toBe(true)
    expect(isWaiting(sampleMailing({ exchanges: [exchange({ state: 'received' })] }))).toBe(true)
    expect(isWaiting(sampleMailing({ exchanges: [exchange({ state: 'processed' })] }))).toBe(false)
  })

  it('summarizes waiting and the mode of the accepted submission', () => {
    expect(summarize(sampleMailing({ exchanges: [exchange()] }))).toMatchObject({ waiting: true, submittedMode: null })
    const submitted = sampleMailing({
      status: 'submitted',
      exchanges: [exchange({ state: 'processed' }), exchange({ kind: 'create', mode: 'C', mailingRef: 'CP-2026-15', state: 'processed', statusCode: '100' })],
    })
    expect(summarize(submitted)).toMatchObject({ waiting: false, submittedMode: 'C' })
  })
})
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/core/masspost/store/mailing.test.ts`. Expected: FAIL (`isWaiting` en `Exchange` bestaan niet).

- [ ] **Step 3: Breid `mailing.ts` uit.** Boven `mailingSchema`:

```ts
/**
 * One file sent to bpost and what came back (design 13/10, part 2). The files themselves are in the
 * store under `e-masspost/`; this is the log and the state.
 */
export const exchangeSchema = z.object({
  kind: z.enum(['check', 'create']),
  /** Canonical name of the request, `…_0RQ.XML`; responses name it in `RequestProps`/`FileReceived`. */
  fileName: z.string().min(1),
  mailingRef: z.string().min(1).max(20),
  mode: z.enum(['T', 'C', 'P']),
  /** Addresses in the file. */
  items: z.number().int().nonnegative(),
  /** `itemsFingerprint` of what was sent: shows a change after sending. */
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  /** Rows excluded when it was sent (for the estimate). */
  excluded: z.array(z.number().int()),
  sentAt: z.string().datetime(),
  sentBy: z.string(),
  /** sent → received (acknowledgement) → processed, or rejected. */
  state: z.enum(['sent', 'received', 'processed', 'rejected']),
  receivedAt: z.string().nullable().optional(),
  /** Name of the result file (`_2RS`) once processed. */
  responseFile: z.string().optional(),
  statusCode: z.string().optional(),
  arr: z.number().nullable().optional(),
  /** Codes of bpost when refused, e.g. `MID-2040`. */
  problem: z.string().optional(),
})

/** One exchange with bpost. */
export type Exchange = z.infer<typeof exchangeSchema>

const checkCountsSchema = z.object({
  noAddress: z.number().int().nonnegative(),
  multiple: z.number().int().nonnegative(),
  proposal: z.number().int().nonnegative(),
  note: z.number().int().nonnegative(),
  ok: z.number().int().nonnegative(),
})

/** Addresses per group of the last address check. */
export type CheckCounts = z.infer<typeof checkCountsSchema>
```

  In `mailingSchema`: voeg in `counts` toe `check: checkCountsSchema.optional(),` (na `foreign`) en na `arr` het veld `exchanges: z.array(exchangeSchema).optional(),`. In `MailingSummary` voeg toe:

```ts
  /** A file is with bpost and no result came back yet: the icon "wachten". */
  waiting: boolean
  /** Mode of the accepted submission, for the pill Test or Certificatie; null when not submitted. */
  submittedMode: 'T' | 'C' | 'P' | null
```

  En boven `summarize`:

```ts
/**
 * Whether the mailing waits for bpost: its last exchange was sent or acknowledged, not answered.
 * @param m The mailing.
 * @returns True while waiting.
 */
export function isWaiting(m: Mailing): boolean {
  const last = m.exchanges?.at(-1)
  return last?.state === 'sent' || last?.state === 'received'
}
```

  In `summarize` voeg toe:

```ts
    waiting: isWaiting(m),
    submittedMode: m.status === 'submitted'
      ? (m.exchanges?.findLast((e) => e.kind === 'create' && e.state === 'processed')?.mode ?? null)
      : null,
```

  En in `statusGroup`: een wachtende mailing hoort bij "wachten" (groep 1):

```ts
function statusGroup(m: MailingSummary): 0 | 1 | 2 {
  if (m.waiting) return 1
  return m.status === 'mapped' && (m.formatIssuesOpen ?? 0) > 0 ? 0 : STATUS_GROUP[m.status]
}
```

  In `mailing-store.ts` voeg `| 'exchanges'` toe aan `MailingChange`. Zoek met `grep -rn "summary: {\|MailingSummary = {\|: MailingSummary\b" tests src` naar handgemaakte `MailingSummary`-objecten in tests (bv. `tests/components/mailings/MailingRow.test.tsx`) en vul daar `waiting: false, submittedMode: null` aan.

- [ ] **Step 4: Draai de tests.** Run: `npx vitest run tests/core/masspost/store tests/components/mailings`. Expected: PASS.

- [ ] **Step 5: Schrijf de tests voor `exchange.ts`** in `tests/core/masspost/exchange.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { applyChange } from '@/core/masspost/store/mailing-store'
import type { Exchange, Mailing } from '@/core/masspost/store/mailing'
import { changedSinceSent, latestExchange, nextRefNumber, processResponse, recordSent } from '@/core/masspost/exchange'
import { sampleMailing } from './store/fixtures'

const sample = (name: string) => readFileSync(path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip', name), 'latin1')
const now = new Date('2026-10-13T12:10:00.000Z')
const CHECK_RS = 'MID_0200_251614_REFERENCE0_261001152310_2RS.XML' // answers …261001151829_0RQ.XML
const ACK = 'MID_0200_251614_REFERENCE0_261001153940_1AK.XML' // acknowledges …261001153940_0RQ.XML
const CREATE_RS = 'MID_0200_251614_REFERENCE0_260929221652_2RS.XML' // answers …260929221329_0RQ.XML

const sent = (fileName: string, over: Partial<Exchange> = {}): Exchange => ({
  kind: 'check',
  fileName,
  mailingRef: 'CP-2026-15-C1',
  mode: 'T',
  items: 5,
  fingerprint: 'cd'.repeat(32),
  excluded: [],
  sentAt: '2026-10-13T12:05:00.000Z',
  sentBy: 'an@contrapunt.be',
  state: 'sent',
  ...over,
})
const apply = (m: Mailing, change: object) => applyChange(m, change, 'an@contrapunt.be', 'test', now)

describe('recordSent and numbering', () => {
  it('adds the exchange and counts per kind', () => {
    const m = sampleMailing({ status: 'format', counts: { addresses: 5, formatIssuesOpen: 0 } })
    expect(nextRefNumber(m, 'check')).toBe(1)
    const change = recordSent(
      m,
      { kind: 'check', fileName: 'F_0RQ.XML', bytes: new Uint8Array(), mailingRef: 'CP-2026-15-C1', mode: 'T', items: 5, fingerprint: 'cd'.repeat(32) },
      [977],
      'an@contrapunt.be',
      now,
    )
    const next = apply(m, change)
    expect(latestExchange(next)).toMatchObject({ fileName: 'F_0RQ.XML', state: 'sent', excluded: [977], sentAt: now.toISOString() })
    expect(nextRefNumber(next, 'check')).toBe(2)
    expect(nextRefNumber(next, 'create')).toBe(1)
  })
})

describe('processResponse', () => {
  const waiting = sampleMailing({
    status: 'format',
    counts: { addresses: 5, formatIssuesOpen: 0 },
    exchanges: [sent('MID_0200_251614_REFERENCE0_261001151829_0RQ.XML')],
  })

  it('applies a check result: status checked, ARR, counts, exchange processed', () => {
    const r = processResponse(waiting, CHECK_RS, sample(CHECK_RS), now)
    expect(r.outcome).toBe('applied')
    if (r.outcome !== 'applied') return
    const next = apply(waiting, r.change)
    expect(next).toMatchObject({ status: 'checked', arr: 100, counts: { check: { proposal: 2, ok: 3 } } })
    expect(latestExchange(next)).toMatchObject({ state: 'processed', responseFile: CHECK_RS, statusCode: '100', arr: 100 })
    expect(r.event).toBe('bpost-check')
  })

  it('ignores the same result twice, and an acknowledgement after the result', () => {
    const r = processResponse(waiting, CHECK_RS, sample(CHECK_RS), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    const done = apply(waiting, r.change)
    expect(processResponse(done, CHECK_RS, sample(CHECK_RS), now).outcome).toBe('duplicate')
    const withAckName = apply(waiting, { exchanges: [sent('MID_0200_251614_REFERENCE0_261001153940_0RQ.XML', { state: 'processed' })] })
    expect(processResponse(withAckName, ACK, sample(ACK), now).outcome).toBe('duplicate')
  })

  it('marks an acknowledgement as received', () => {
    const m = apply(waiting, { exchanges: [sent('MID_0200_251614_REFERENCE0_261001153940_0RQ.XML')] })
    const r = processResponse(m, ACK, sample(ACK), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    expect(latestExchange(apply(m, r.change))).toMatchObject({ state: 'received', receivedAt: '2026-10-01T15:41:05' })
  })

  it('refuses a response of another mailing, and keeps an older one aside', () => {
    const other = sampleMailing({ exchanges: [sent('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')] })
    expect(processResponse(other, CHECK_RS, sample(CHECK_RS), now)).toEqual({ outcome: 'foreign', mailingRef: 'OPTI20261001131829' })
    const twice = apply(waiting, {
      exchanges: [sent('MID_0200_251614_REFERENCE0_261001151829_0RQ.XML'), sent('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML', { mailingRef: 'CP-2026-15-C2' })],
    })
    expect(processResponse(twice, CHECK_RS, sample(CHECK_RS), now).outcome).toBe('older')
  })

  it('says invalid for a file that is not a bpost response', () => {
    expect(processResponse(waiting, 'x.xml', '<foo/>', now)).toEqual({ outcome: 'invalid' })
  })

  it('applies an accepted submission: status submitted', () => {
    const m = apply(waiting, {
      status: 'checked',
      exchanges: [sent('MID_0200_251614_REFERENCE0_260929221329_0RQ.XML', { kind: 'create', mode: 'T', mailingRef: 'CP-2026-15' })],
    })
    const r = processResponse(m, CREATE_RS, sample(CREATE_RS), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    expect(apply(m, r.change)).toMatchObject({ status: 'submitted', arr: 99.8 })
    expect(r.event).toBe('bpost-create')
  })

  it('records a refusal without changing the status', () => {
    const m = apply(waiting, { exchanges: [sent('MID_0100_251614_REFERENCE0_260928215959_0RQ.XML')] })
    const r = processResponse(m, 'MID_0100_251614_REFERENCE0_260928215959_2RS.XML', sample('MID_0100_251614_REFERENCE0_260928215959_2RS.XML'), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    const next = apply(m, r.change)
    expect(next.status).toBe('format')
    expect(latestExchange(next)).toMatchObject({ state: 'rejected', problem: expect.stringContaining('MID-2040') })
    expect(r.event).toBe('bpost-rejected')
  })
})

describe('changedSinceSent', () => {
  it('compares the fingerprint', () => {
    const e = sent('F_0RQ.XML')
    expect(changedSinceSent(e, 'cd'.repeat(32))).toBe(false)
    expect(changedSinceSent(e, 'ef'.repeat(32))).toBe(true)
  })
})
```

  Het geweigerde voorbeeld (`MID_0100_…_260928215959_2RS.XML`) antwoordt op `MID_0100_251614_REFERENCE0_260928215959_0RQ.XML` en heeft geen actie: enkel `MID-2040` `FATAL` op het bestand.

- [ ] **Step 6: Draai de tests.** Run: `npx vitest run tests/core/masspost/exchange.test.ts`. Expected: FAIL (module bestaat niet).

- [ ] **Step 7: Schrijf `src/core/masspost/exchange.ts`:**

```ts
// src/core/masspost/exchange.ts
// What the web app remembers of the files it sent to bpost, and how a response changes the mailing
// (design 13/10, parts 2 and 5). Pure functions: the caller saves the change through the store.
import { groupCheckResult } from './address-check'
import { isRejected, NotABpostResponseError, parseBpostResponse, type BpostResponse } from './parse-response'
import type { RequestFile } from './request-file'
import type { Exchange, Mailing } from './store/mailing'
import type { MailingChange } from './store/mailing-store'

/**
 * The number of the next check or submission, for its `mailingRef`.
 * @param m The mailing.
 * @param kind Check or submission.
 * @returns 1 for the first.
 */
export function nextRefNumber(m: Mailing, kind: 'check' | 'create'): number {
  return (m.exchanges ?? []).filter((e) => e.kind === kind).length + 1
}

/**
 * The last exchange, of one kind or of any.
 * @param m The mailing.
 * @param kind Optional kind.
 * @returns The exchange, or undefined.
 */
export function latestExchange(m: Mailing, kind?: 'check' | 'create'): Exchange | undefined {
  return (m.exchanges ?? []).findLast((e) => kind === undefined || e.kind === kind)
}

/**
 * The change that records a file put in the mailbox.
 * @param m The mailing.
 * @param file The file (`buildRequestFile`).
 * @param excluded Rows excluded at this moment.
 * @param by E-mail of the user.
 * @param now The time.
 * @returns A change for `MailingStore.update`.
 */
export function recordSent(m: Mailing, file: RequestFile, excluded: readonly number[], by: string, now: Date): MailingChange {
  const exchange: Exchange = {
    kind: file.kind,
    fileName: file.fileName,
    mailingRef: file.mailingRef,
    mode: file.mode,
    items: file.items,
    fingerprint: file.fingerprint,
    excluded: [...excluded],
    sentAt: now.toISOString(),
    sentBy: by,
    state: 'sent',
  }
  return { exchanges: [...(m.exchanges ?? []), exchange] }
}

/**
 * Whether the list changed since the file was sent.
 * @param exchange The exchange.
 * @param fingerprint `itemsFingerprint` of the rows that go along now.
 * @returns True when different.
 */
export function changedSinceSent(exchange: Exchange, fingerprint: string): boolean {
  return exchange.fingerprint !== fingerprint
}

/** What a response file does to a mailing. */
export type ProcessOutcome =
  | { outcome: 'applied'; change: MailingChange; event: string; response: BpostResponse }
  | { outcome: 'duplicate' | 'older'; response: BpostResponse }
  | { outcome: 'foreign'; mailingRef: string | null }
  | { outcome: 'invalid' }

const problemOf = (r: BpostResponse) =>
  [...new Set(r.messages.filter((m) => m.severity === 'FATAL' || m.severity === 'ERROR').map((m) => m.code))].join(', ') ||
  (r.kind === 'ack' ? 'geweigerd' : `status ${r.statusCode || 'onbekend'}`)

/**
 * Processes a file bpost sent back: links it to the request by file name and gives the change.
 * An acknowledgement marks the exchange received; a result marks it processed (check: status
 * `checked`, ARR and counts; submission: `submitted`), or rejected without changing the status.
 * @param m The mailing.
 * @param fileName Name of the response file.
 * @param xml Its text (ISO-8859-1 decoded).
 * @param now The time.
 * @returns `applied` with the change, or why nothing changes.
 * @example
 * const r = processResponse(mailing, file.name, decodeLatin1(file.bytes), new Date())
 * if (r.outcome === 'applied') await store.update(mailing.id, r.change, mailing.revision, user, r.event)
 */
export function processResponse(m: Mailing, fileName: string, xml: string, now: Date): ProcessOutcome {
  let response: BpostResponse
  try {
    response = parseBpostResponse(xml)
  } catch (e) {
    if (e instanceof NotABpostResponseError) return { outcome: 'invalid' }
    throw e
  }
  const exchanges = m.exchanges ?? []
  const index = exchanges.findIndex((e) => e.fileName === response.requestFileName)
  if (index < 0) return { outcome: 'foreign', mailingRef: response.kind === 'ack' ? null : response.mailingRef || null }
  const exchange = exchanges[index]
  if (exchanges.some((e, i) => i > index && e.kind === exchange.kind)) return { outcome: 'older', response }
  const done = exchange.state === 'processed' || exchange.state === 'rejected'
  const replace = (next: Exchange) => exchanges.map((e, i) => (i === index ? next : e))

  if (response.kind === 'ack') {
    if (exchange.state !== 'sent') return { outcome: 'duplicate', response }
    const rejected = isRejected(response)
    return {
      outcome: 'applied',
      response,
      event: rejected ? 'bpost-rejected' : 'bpost-ack',
      change: {
        exchanges: replace({
          ...exchange,
          state: rejected ? 'rejected' : 'received',
          receivedAt: response.receivedAt ?? now.toISOString(),
          ...(rejected ? { problem: problemOf(response) } : {}),
        }),
      },
    }
  }

  if (done || exchange.responseFile === fileName) return { outcome: 'duplicate', response }
  if (isRejected(response)) {
    return {
      outcome: 'applied',
      response,
      event: 'bpost-rejected',
      change: {
        exchanges: replace({ ...exchange, state: 'rejected', responseFile: fileName, statusCode: response.statusCode, problem: problemOf(response) }),
      },
    }
  }
  const processed = replace({ ...exchange, state: 'processed', responseFile: fileName, statusCode: response.statusCode, arr: response.arr })
  if (response.kind === 'check') {
    return {
      outcome: 'applied',
      response,
      event: 'bpost-check',
      change: {
        exchanges: processed,
        // A new check after a submission does not undo "Ingediend".
        status: m.status === 'submitted' ? 'submitted' : 'checked',
        arr: response.arr,
        counts: { ...m.counts, check: groupCheckResult(response, exchange.items).counts },
      },
    }
  }
  return { outcome: 'applied', response, event: 'bpost-create', change: { exchanges: processed, status: 'submitted', arr: response.arr } }
}
```

- [ ] **Step 8: Draai de tests.** Run: `npx vitest run tests/core/masspost/exchange.test.ts tests/core/masspost/store`. Expected: PASS.

- [ ] **Step 9: Checkpoint.** Run: `npx tsc --noEmit -p .`. Expected: geen fouten (ook niet in componenten die `MailingSummary` maken).

### Task 7: Bestanden per mailing in de store

**Files:**
- Modify: `src/core/masspost/store/mailing-store.ts` (interface, constante), `memory-store.ts`, `indexeddb-store.ts` (versie 2, object store `mailingFiles`)
- Test: `tests/core/masspost/store/mailing-store-contract.ts`, `tests/core/masspost/store/indexeddb-store.test.ts`

**Interfaces:**
- Produces (op `MailingStore`):
  - `saveFile(id: string, path: string, file: Blob): Promise<void>` (overschrijft; `MailingNotFoundError` voor een onbekende mailing)
  - `getFile(id: string, path: string): Promise<Blob | null>`
  - `listFiles(id: string, prefix: string): Promise<string[]>` (paden, gesorteerd)
  - `const MAILING_FILES_DIR = 'e-masspost/'`

- [ ] **Step 1: Schrijf de contracttests** (in `describeMailingStore`, voor de laatste `})`):

```ts
    it('keeps files per mailing under a path, lists them by prefix, overwrites', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      const other = await store.create(newInput('CP-2026-2'), file(), 'an@x.be')
      const xml = (text: string) => new Blob([new TextEncoder().encode(text)], { type: 'application/xml' })
      await store.saveFile(m.id, 'e-masspost/B_2RS.XML', xml('b'))
      await store.saveFile(m.id, 'e-masspost/A_0RQ.XML', xml('a'))
      await store.saveFile(other.id, 'e-masspost/C_0RQ.XML', xml('c'))
      expect(await store.listFiles(m.id, 'e-masspost/')).toEqual(['e-masspost/A_0RQ.XML', 'e-masspost/B_2RS.XML'])
      await store.saveFile(m.id, 'e-masspost/A_0RQ.XML', xml('a2'))
      expect(await (await store.getFile(m.id, 'e-masspost/A_0RQ.XML'))!.text()).toBe('a2')
      expect(await store.getFile(m.id, 'e-masspost/none.XML')).toBeNull()
      await expect(store.saveFile('nope', 'e-masspost/x', xml('x'))).rejects.toBeInstanceOf(MailingNotFoundError)
    })
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/core/masspost/store`. Expected: FAIL (`saveFile is not a function`).

- [ ] **Step 3: Breid de interface uit** in `mailing-store.ts`, na `getSourceFile`:

```ts
  /** Saves a file of the mailing under a path (e.g. `e-masspost/…_0RQ.XML`); overwrites. Throws `MailingNotFoundError`. */
  saveFile(id: string, path: string, file: Blob): Promise<void>
  /** A file of the mailing, or null. */
  getFile(id: string, path: string): Promise<Blob | null>
  /** Paths of the files of the mailing that start with `prefix`, sorted. */
  listFiles(id: string, prefix: string): Promise<string[]>
```

  En onder de interface:

```ts
/** Folder of the files exchanged with bpost, per mailing (design 13/10, part 2). Not `bpost/`: confusing. */
export const MAILING_FILES_DIR = 'e-masspost/'
```

- [ ] **Step 4: `MemoryMailingStore`:** voeg `private readonly mailingFiles = new Map<string, Blob>()` toe en:

```ts
  async saveFile(id: string, path: string, file: Blob): Promise<void> {
    if (!this.mailings.has(id)) throw new MailingNotFoundError(id)
    this.mailingFiles.set(`${id}/${path}`, file)
  }

  async getFile(id: string, path: string): Promise<Blob | null> {
    return this.mailingFiles.get(`${id}/${path}`) ?? null
  }

  async listFiles(id: string, prefix: string): Promise<string[]> {
    const start = `${id}/${prefix}`
    return [...this.mailingFiles.keys()].filter((k) => k.startsWith(start)).map((k) => k.slice(id.length + 1)).sort()
  }
```

- [ ] **Step 5: `IndexedDbMailingStore`:** zet `const VERSION = 2`, en in `onupgradeneeded` na de twee bestaande regels:

```ts
        // Version 2 (13/10): files exchanged with bpost, keyed `<id>/<path>`.
        if (!db.objectStoreNames.contains('mailingFiles')) db.createObjectStore('mailingFiles')
```

  Voeg de methodes toe:

```ts
  async saveFile(id: string, path: string, file: Blob): Promise<void> {
    if (!(await this.get(id))) throw new MailingNotFoundError(id)
    const db = await this.open()
    const stored: StoredFile = { bytes: await file.arrayBuffer(), type: file.type }
    const tx = db.transaction('mailingFiles', 'readwrite')
    const ended = finished(tx)
    tx.objectStore('mailingFiles').put(stored, `${id}/${path}`)
    try {
      await ended
    } catch (e) {
      throw writeError(e)
    }
  }

  async getFile(id: string, path: string): Promise<Blob | null> {
    const db = await this.open()
    const stored = (await done(db.transaction('mailingFiles').objectStore('mailingFiles').get(`${id}/${path}`))) as StoredFile | undefined
    return stored ? new Blob([stored.bytes], { type: stored.type }) : null
  }

  async listFiles(id: string, prefix: string): Promise<string[]> {
    const db = await this.open()
    const start = `${id}/${prefix}`
    const keys = await done(db.transaction('mailingFiles').objectStore('mailingFiles').getAllKeys(IDBKeyRange.bound(start, `${start}￿`)))
    return keys.map((k) => String(k).slice(id.length + 1)).sort()
  }
```

  In de bestaande test "shows a broken mailing as unreadable" opent de test de database met versie `1`; zet dat op `2` (anders `VersionError`).

- [ ] **Step 6: Test de upgrade** (in `indexeddb-store.test.ts`):

```ts
  it('upgrades a version 1 database: mailings stay, files work', async () => {
    const factory = new IDBFactory()
    await new Promise<void>((resolve, reject) => {
      const open = factory.open('bpost-e-masspost', 1)
      open.onupgradeneeded = () => {
        open.result.createObjectStore('mailings', { keyPath: 'id' })
        open.result.createObjectStore('files')
      }
      open.onsuccess = () => {
        open.result.close()
        resolve()
      }
      open.onerror = () => reject(open.error)
    })
    const store = new IndexedDbMailingStore({ indexedDB: factory })
    const m = await store.create(newInput(), file(), 'a@x.be')
    await store.saveFile(m.id, 'e-masspost/X_0RQ.XML', new Blob(['x']))
    expect(await store.listFiles(m.id, 'e-masspost/')).toEqual(['e-masspost/X_0RQ.XML'])
  })
```

- [ ] **Step 7: Draai de tests.** Run: `npx vitest run tests/core/masspost/store`. Expected: PASS. Zoek met `grep -rn "implements MailingStore\|: MailingStore = {" src tests` naar andere uitvoeringen of nagemaakte stores in tests (bv. een mock in `tests/components/mailing-flow/MailingPage.test.tsx`) en geef die de drie methodes (`vi.fn()` of een `MemoryMailingStore`).

- [ ] **Step 8: Checkpoint.** Run: `npx tsc --noEmit -p .`. Expected: geen fouten.

### Task 8: De brievenbus (`mailbox/`) en de exports

**Files:**
- Create: `src/core/masspost/mailbox/mailbox.ts`, `src/core/masspost/mailbox/manual-mailbox.ts`, `src/core/masspost/mailbox/index.ts`
- Modify: `src/core/masspost/index.ts`
- Test: `tests/core/masspost/mailbox.test.ts`

**Interfaces:**
- Produces:
  - `interface MailboxFile { name: string; bytes: Uint8Array }`
  - `type MailboxKind = 'manual' | 'drive'`
  - `interface Mailbox { readonly kind: MailboxKind; send(file: MailboxFile): Promise<void>; responses(): Promise<MailboxFile[]>; remove(name: string): Promise<void> }`
  - `const MAILBOX_KINDS: readonly { kind: MailboxKind; label: string; available: boolean; tip: string }[]`
  - `class ManualMailbox implements Mailbox` met `constructor(download: (file: MailboxFile) => void)` en `receive(file: MailboxFile): void`

- [ ] **Step 1: Schrijf de test** in `tests/core/masspost/mailbox.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { MAILBOX_KINDS, ManualMailbox } from '@/core/masspost/mailbox'

describe('ManualMailbox', () => {
  it('sends by downloading, and gives back what the user dropped until it is removed', async () => {
    const download = vi.fn()
    const box = new ManualMailbox(download)
    const request = { name: 'A_0RQ.XML', bytes: new Uint8Array([1]) }
    await box.send(request)
    expect(download).toHaveBeenCalledWith(request)
    expect(await box.responses()).toEqual([])
    box.receive({ name: 'A_2RS.XML', bytes: new Uint8Array([2]) })
    expect((await box.responses()).map((f) => f.name)).toEqual(['A_2RS.XML'])
    await box.remove('A_2RS.XML')
    expect(await box.responses()).toEqual([])
  })
})

describe('MAILBOX_KINDS', () => {
  it('has manual available and Google Drive coming', () => {
    expect(MAILBOX_KINDS.map((k) => [k.kind, k.available])).toEqual([['manual', true], ['drive', false]])
  })
})
```

- [ ] **Step 2: Draai de test.** Run: `npx vitest run tests/core/masspost/mailbox.test.ts`. Expected: FAIL (module bestaat niet).

- [ ] **Step 3: Schrijf `mailbox/mailbox.ts`:**

```ts
// src/core/masspost/mailbox/mailbox.ts
// The mailbox to bpost (SR-112 v1 spec, "brievenbus"; design 13/10, decisions 9 and 11): the app puts
// a request in it and takes responses out. How files travel to and from bpost, the app does not know.

/** A file in the mailbox: its bpost name and bytes (ISO-8859-1 XML). */
export interface MailboxFile {
  name: string
  bytes: Uint8Array
}

/** Kinds of mailbox. A choice in Instellingen once there is more than one (decision 11). */
export type MailboxKind = 'manual' | 'drive'

/** The mailbox of a tenant. */
export interface Mailbox {
  readonly kind: MailboxKind
  /** Puts a request in the mailbox. */
  send(file: MailboxFile): Promise<void>
  /** Response files (`_1AK`, `_2RS`) waiting to be processed. */
  responses(): Promise<MailboxFile[]>
  /** Takes a processed response out of the mailbox. */
  remove(name: string): Promise<void>
}

/** The kinds, for the block "Verbinding met bpost" in Instellingen. */
export const MAILBOX_KINDS: readonly { kind: MailboxKind; label: string; available: boolean; tip: string }[] = [
  {
    kind: 'manual',
    label: 'Manueel',
    available: true,
    tip: 'Je slaat het bestand voor bpost op, laadt het op via de e-MassPost-website en zet het antwoord terug in de app.',
  },
  {
    kind: 'drive',
    label: 'Google Drive',
    available: false,
    tip: 'Binnenkort: de app zet het bestand op je gedeelde drive en leest het antwoord van bpost vanzelf.',
  },
]
```

- [ ] **Step 4: Schrijf `mailbox/manual-mailbox.ts`:**

```ts
// src/core/masspost/mailbox/manual-mailbox.ts
import type { Mailbox, MailboxFile } from './mailbox'

/**
 * The mailbox for now: sending saves the file in the browser (download); a response is what the user
 * drops in step 4. Later `DriveMailbox` does both by itself, behind the same interface.
 * @example
 * const box = new ManualMailbox((file) => saveFile(file.bytes, { name: file.name, mime: 'application/xml' }))
 */
export class ManualMailbox implements Mailbox {
  readonly kind = 'manual' as const
  private readonly inbox = new Map<string, Uint8Array>()

  /** @param download Saves a file in the browser. */
  constructor(private readonly download: (file: MailboxFile) => void) {}

  async send(file: MailboxFile): Promise<void> {
    this.download(file)
  }

  /**
   * A response file the user dropped.
   * @param file The file.
   */
  receive(file: MailboxFile): void {
    this.inbox.set(file.name, file.bytes)
  }

  async responses(): Promise<MailboxFile[]> {
    return [...this.inbox].map(([name, bytes]) => ({ name, bytes }))
  }

  async remove(name: string): Promise<void> {
    this.inbox.delete(name)
  }
}
```

  `mailbox/index.ts`:

```ts
export * from './mailbox'
export * from './manual-mailbox'
```

- [ ] **Step 5: Exporteer de nieuwe modules** in `src/core/masspost/index.ts` (na `./parse-response`):

```ts
export * from './request-file'
export * from './address-check'
export * from './exchange'
export * from './mailbox'
```

- [ ] **Step 6: Draai de tests en bouw de documentatie.** Run: `npx vitest run tests/core/masspost && npm run docs:build`. Expected: PASS; `docs/ontwikkelaars/library/` krijgt pagina's voor de nieuwe exports (TypeDoc meldt geen ontbrekende TSDoc).

- [ ] **Step 7: Checkpoint.** Run: `npx tsc --noEmit -p . && npm run lint:fix`. Expected: geen fouten. De library van deel A is klaar.

# Deel A: interface

> Laad `.agent/prompts/customer-facing-agent.md` vóór taak 10. Taak 11 en 12 wachten op het akkoord van Mark over taak 1.

### Task 9: Eén lijst met correcties voor stap 3 en 4

Waarom: de correcties en uitsluitingen leven nu in de reducer van `FormatStep`, die verborgen gemonteerd blijft. Als stap 4 een eigen kopie zou bijhouden, overschrijft de volgende wijziging in stap 3 die van stap 4. De reducer verhuist naar `MailingFlow`; beide stappen krijgen dezelfde stand en `dispatch`.

**Files:**
- Create: `src/components/mailing-flow/corrections.ts`
- Modify: `src/components/mailing-flow/FormatStep.tsx` (reducer en types eruit; props `corrections` en `dispatch` in plaats van `initial` en `onChange`), `src/components/mailing-flow/MailingFlow.tsx`
- Test: `tests/components/mailing-flow/corrections.test.tsx` (nieuw), `tests/components/mailing-flow/FormatStep.render.test.tsx`

**Interfaces:**
- Produces:
  - `interface CorrectionChange { key: string; seq: number; value?: string | undefined; excluded?: boolean }`
  - `interface Corrections { values: Record<string, string>; excluded: Record<number, true>; undo: { id: number; items: CorrectionSnapshot[] }[]; nextId: number }`
  - `type CorrectionAction = { type: 'apply'; changes: CorrectionChange[] } | { type: 'toggleExclude'; key: string; seq: number } | { type: 'undo'; id?: number } | { type: 'reset'; values: Record<string, string>; excluded: Record<number, true> }`
  - `correctionsReducer(state: Corrections, action: CorrectionAction): Corrections`
  - `useCorrections(initial: { values: Record<string, string>; excluded: Record<number, true> }, onChange: (s: { values: Record<string, string>; excluded: Record<number, true> }) => void): [Corrections, Dispatch<CorrectionAction>]`
  - `FormatStep` props: `corrections: Corrections`, `dispatch: Dispatch<CorrectionAction>` (vervangen `initial`, `onChange`).

- [ ] **Step 1: Schrijf de tests** in `tests/components/mailing-flow/corrections.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { StrictMode, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { correctionsReducer, useCorrections, type Corrections } from '@/components/mailing-flow/corrections'

const empty: Corrections = { values: {}, excluded: {}, undo: [], nextId: 1 }

describe('correctionsReducer', () => {
  it('applies, excludes and undoes, one entry per action', () => {
    let s = correctionsReducer(empty, { type: 'apply', changes: [{ key: '2:name', seq: 2, value: 'Jan' }] })
    s = correctionsReducer(s, { type: 'toggleExclude', key: '3:name', seq: 3 })
    expect(s).toMatchObject({ values: { '2:name': 'Jan' }, excluded: { 3: true } })
    s = correctionsReducer(s, { type: 'undo' })
    expect(s.excluded).toEqual({})
    s = correctionsReducer(s, { type: 'undo' })
    expect(s.values).toEqual({})
  })

  it('reset replaces the values and clears the undo stack', () => {
    const s = correctionsReducer(
      correctionsReducer(empty, { type: 'apply', changes: [{ key: '2:name', seq: 2, value: 'Jan' }] }),
      { type: 'reset', values: { '5:postcodeCity': '9300 Aalst' }, excluded: { 7: true } },
    )
    expect(s).toMatchObject({ values: { '5:postcodeCity': '9300 Aalst' }, excluded: { 7: true }, undo: [] })
  })
})

describe('useCorrections', () => {
  const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>

  it('does not report the start as a change, also not in StrictMode; reports a change once', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useCorrections({ values: { '2:name': 'Jan' }, excluded: {} }, onChange), { wrapper: strict })
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current[1]({ type: 'toggleExclude', key: '2:name', seq: 2 }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith({ values: { '2:name': 'Jan' }, excluded: { 2: true } })
  })

  it('does not report a reset as a change', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useCorrections({ values: {}, excluded: {} }, onChange))
    act(() => result.current[1]({ type: 'reset', values: { '2:name': 'Jan' }, excluded: {} }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/components/mailing-flow/corrections.test.tsx`. Expected: FAIL (module bestaat niet).

- [ ] **Step 3: Schrijf `corrections.ts`.** Verplaats `Snapshot`, `Change`, `Corrections`, `Action`, `write` en `reducer` letterlijk uit `FormatStep.tsx` (regels ±32–92), hernoemd naar `CorrectionSnapshot`, `CorrectionChange`, `Corrections`, `CorrectionAction`, `write`, `correctionsReducer`, en voeg toe:

```ts
'use client'

import { useEffect, useReducer, useRef, type Dispatch } from 'react'

// … de verplaatste types en `write` …

/**
 * The corrections and exclusions of steps 3 and 4, with an undo stack (one entry per action).
 * `reset` starts over from given values (a new format check) and clears the undo stack.
 * @param state The current state.
 * @param action What happened.
 * @returns The new state.
 */
export function correctionsReducer(state: Corrections, action: CorrectionAction): Corrections {
  if (action.type === 'reset') return { values: { ...action.values }, excluded: { ...action.excluded }, undo: [], nextId: state.nextId }
  // … de rest van de oude `reducer`, met `reducer(` vervangen door `correctionsReducer(` …
}

/**
 * The corrections of a mailing, owned by `MailingFlow` and shared by the format step and step 4.
 * Reports every change by the user to save it; not the start and not a `reset`.
 * @param initial Values and exclusions to start from.
 * @param onChange Called after each change.
 * @returns The state and its dispatch.
 */
export function useCorrections(
  initial: { values: Record<string, string>; excluded: Record<number, true> },
  onChange: (s: { values: Record<string, string>; excluded: Record<number, true> }) => void,
): [Corrections, Dispatch<CorrectionAction>] {
  const [state, rawDispatch] = useReducer(correctionsReducer, undefined, () => ({
    values: initial.values,
    excluded: initial.excluded,
    undo: [],
    nextId: 1,
  }))
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // Compared with the last reported state, not a "first run" flag: StrictMode runs the effect twice.
  const reported = useRef({ values: state.values, excluded: state.excluded })
  const resetting = useRef(false)
  useEffect(() => {
    if (reported.current.values === state.values && reported.current.excluded === state.excluded) return
    reported.current = { values: state.values, excluded: state.excluded }
    if (resetting.current) {
      resetting.current = false
      return
    }
    onChangeRef.current({ values: state.values, excluded: state.excluded })
  }, [state.values, state.excluded])
  const dispatch = useRef<Dispatch<CorrectionAction>>((action) => {
    if (action.type === 'reset') resetting.current = true
    rawDispatch(action)
  }).current
  return [state, dispatch]
}
```

- [ ] **Step 4: Pas `FormatStep` aan.**
  - Verwijder de verplaatste code en importeer `import type { CorrectionAction, Corrections } from './corrections'` en `type Dispatch` uit `react`.
  - In `Props`: verwijder `initial` en `onChange`; voeg toe:

```ts
  /** Corrections and exclusions, owned by MailingFlow and shared with step 4. */
  corrections: Corrections
  dispatch: Dispatch<CorrectionAction>
```

  - Vervang `const [state, dispatch] = useReducer(reducer, { … })` door `const state = corrections` (de rest van de component gebruikt `state` en `dispatch` al), en verwijder het blok `onChangeRef` / `reported` / het `useEffect` dat `onChange` meldt.

- [ ] **Step 5: Pas `MailingFlow` aan.**
  - Importeer `useCorrections` uit `./corrections`.
  - Na `latestFormat` (regel ±116):

```ts
  // One list of corrections for steps 3 and 4 (design 13/10): saved 2 s after a change.
  const [corrections, dispatchCorrections] = useCorrections(initialFormat ?? { values: {}, excluded: {} }, (s) => {
    latestFormat.current = s
    saver.saveSoon({ corrections: s.values, excludedRows: Object.keys(s.excluded).map(Number) }, 'format-edited')
  })
```

  - In `check()`, na `setInitialFormat(kept)`: `dispatchCorrections({ type: 'reset', values: kept.values, excluded: kept.excluded })`. Verwijder `setInitialFormat` en de state `initialFormat` niet: `useCorrections` leest de beginwaarde er één keer uit. Voeg `dispatchCorrections` toe aan de afhankelijkheden van `check` (stabiel, dus geen extra runs).
  - Bij `<FormatStep>`: verwijder `initial={initialFormat}` en de prop `onChange={…}`; voeg `corrections={corrections}` en `dispatch={dispatchCorrections}` toe. Laat `key={checkRun}` staan: het zet de groepen, de focus en de toast terug bij een nieuwe controle.

- [ ] **Step 6: Pas de bestaande componenttest aan.** In `tests/components/mailing-flow/FormatStep.render.test.tsx`: geef elke `<FormatStep>` `corrections={{ values: {}, excluded: {}, undo: [], nextId: 1 }}` en `dispatch={() => {}}`; verwijder de test "does not report the starting corrections as a change" (verhuisd naar `corrections.test.tsx`).

- [ ] **Step 7: Draai de tests.** Run: `npx vitest run tests/components/mailing-flow`. Expected: PASS.

- [ ] **Step 8: Controleer in de browser** dat niets veranderde: start de dev-server (terminaltab "dev server", poort 3000), open MM-2026-1 in het paneel, ga naar Formaatvalidatie, pas een veld aan, sluit een rij uit, ⌘Z, herlaad: de correctie en uitsluiting blijven, ⌘Z werkt. **Niet MM-2026-3 aanpassen** (van Mark).

- [ ] **Step 9: Checkpoint.** Run: `npx tsc --noEmit -p . && npm run lint:fix`. Expected: geen fouten.

### Task 10: De bpost-nummers in de flow, en "Verbinding met bpost" in Instellingen

**Files:**
- Modify: `src/app/(app)/mailings/[code]/page.tsx`, `src/components/mailing-flow/MailingPage.tsx`, `src/components/mailing-flow/MailingFlow.tsx` (prop doorgeven), `src/components/settings/SettingsForms.tsx`
- Test: `tests/components/mailing-flow/MailingPage.test.tsx`

**Interfaces:**
- Consumes: `getTenantSettings` (`src/lib/tenant/settings.ts`), `auth` (`@/lib/auth`), `BpostIds` (taak 3), `MAILBOX_KINDS` (taak 8), `Placeholder` (`src/components/app-shell/Placeholder.tsx`).
- Produces: prop `bpost: BpostIds | null` op `MailingPage` en `MailingFlow`.

  Afwijking van de spec (deel 5 noemt een server action): de pagina is al een servercomponent die de tenant kent (zoals `mailings/nieuw/page.tsx`), dus de nummers gaan als prop mee. Zelfde doel: geen HTTP-route, geen wachtwoord, geen adressen naar de server.

- [ ] **Step 1: Schrijf de test** (voeg toe aan `tests/components/mailing-flow/MailingPage.test.tsx`, in de stijl van de bestaande tests daar): render `MailingPage` met `bpost={{ customerId: '251614', accountId: '1234567' }}` en controleer dat de bestaande flow rendert zoals voorheen (dezelfde verwachtingen als de eerste bestaande test). Dit vangt een vergeten prop in de keten op.

- [ ] **Step 2: Pagina.** In `src/app/(app)/mailings/[code]/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { getTenantSettings } from '@/lib/tenant/settings'
// …
  const session = await auth()
  const settings = session?.user?.tenantId ? await getTenantSettings(session.user.tenantId) : null
  // Only the numbers the XML repeats; the password stays on the server (design 13/10, decision 10).
  const bpost =
    settings?.bpost?.customerNumber && settings.bpost.accountId
      ? { customerId: settings.bpost.customerNumber, accountId: settings.bpost.accountId }
      : null
  return (
    <MailingPage
      code={decodeURIComponent(code)}
      editDetails={stap === 'gegevens'}
      docsUrl={env.NEXT_PUBLIC_DOCS_URL}
      aiModel={isProviderModel(model) ? model : undefined}
      bpost={bpost}
    />
  )
```

- [ ] **Step 3: Geef de prop door** in `MailingPage` (prop `bpost: BpostIds | null`, naar `<MailingFlow bpost={bpost} … />`) en in `MailingFlow` (prop `bpost: BpostIds | null`; gebruikt in taak 11). Importeer `type BpostIds` uit `@/core/masspost/request-file`.

- [ ] **Step 4: Instellingen.** In `SettingsForms.tsx`, vlak boven het blok Google Drive (`aria-labelledby="s-drive-title"`), een nieuw blok in dezelfde opbouw:

```tsx
      <section className={styles.card} aria-labelledby="s-mailbox-title">
        <h2 id="s-mailbox-title">Verbinding met bpost</h2>
        <p className={styles.m}>Hoe de bestanden voor bpost vertrekken en hoe het antwoord terugkomt.</p>
        <div role="radiogroup" aria-labelledby="s-mailbox-title">
          {MAILBOX_KINDS.map((k) =>
            k.available ? (
              <label key={k.kind} className={styles.tipStart} data-tip={k.tip}>
                <input type="radio" name="mailbox" value={k.kind} checked readOnly /> {k.label}
              </label>
            ) : (
              <Placeholder key={k.kind} tip={k.tip}>
                {k.label}
              </Placeholder>
            ),
          )}
        </div>
      </section>
```

  Gebruik de klassen die de andere blokken in dit bestand gebruiken (kijk naar het blok Google Drive en neem dezelfde `className`s over); `checked readOnly`: er is nog maar één keuze en er wordt niets bewaard (besluit 11).

- [ ] **Step 5: Draai de tests en kijk in de browser.** Run: `npx vitest run tests/components`. Expected: PASS. Open `/instellingen` in het paneel: het blok staat er, "Google Drive" is grijs met "binnenkort" en een hovertip. **Bewaar niets in Instellingen** (gedeelde database).

- [ ] **Step 6: Checkpoint.** Run: `npx tsc --noEmit -p .`. Expected: geen fouten.

### Task 11: Stap 4: versturen, wachten en antwoorden verwerken

**Poort:** start pas na het akkoord van Mark over taak 1.

**Files:**
- Create: `src/components/mailing-flow/useBpostExchange.ts`, `src/components/mailing-flow/AddressCheckStep.tsx`
- Modify: `src/components/mailing-flow/MailingFlow.tsx` (stap 4, stappenbalk), `src/components/mailing-flow/FormatStep.tsx` (weergave van stap 4 eruit: `done`, `onSave`, `SaveTarget`, `SaveChoices`), `src/components/mailing-flow/resume.ts`, `src/components/mailings/StatusIcon.tsx`, `src/components/mailings/labels.ts`, `src/components/mailing-flow/mailing-flow.module.css`
- Test: `tests/components/mailing-flow/AddressCheckStep.test.tsx` (nieuw), `tests/components/mailings/StatusIcon.test.tsx`, `tests/components/mailing-flow/resume.test.ts`, `tests/components/mailing-flow/FormatStep.render.test.tsx`

**Interfaces:**
- Consumes: `buildRequestFile`, `checkMailingRef`, `correctedRows`, `itemsFingerprint`, `decodeLatin1`, `BpostIds`, `BpostMode` (taak 3); `parseBpostResponse`, `MailingResult` (taak 4); `groupCheckResult`, `CheckView` (taak 5); `processResponse`, `recordSent`, `nextRefNumber`, `latestExchange`, `changedSinceSent` (taak 6); `MAILING_FILES_DIR` (taak 7); `ManualMailbox`, `Mailbox` (taak 8); `Corrections`, `CorrectionAction` (taak 9); `MailingSaver` (`useMailingSaver.ts`); `useMailingStore`; `saveFile` (`save-file.ts`); `mapRows` (`mapping.ts`).
- Produces:
  - `useBpostExchange(input: { saver: MailingSaver; rows: MappedRow[]; corrections: Corrections; bpost: BpostIds | null }): BpostExchange` met

```ts
export interface BpostExchange {
  /** Puts a check (always T) or a submission (mode chosen) in the mailbox. */
  send: (kind: 'check' | 'create', mode: BpostMode) => Promise<void>
  /** Saves the last request again (manual mailbox). */
  resend: () => Promise<void>
  /** Response files the user dropped. */
  receive: (files: readonly File[]) => Promise<void>
  /** The last processed check, read back from the store. */
  check: { result: MailingResult; view: CheckView } | null
  /** The last processed submission. */
  create: MailingResult | null
  /** The list changed since the last request was sent. */
  changed: boolean
  busy: boolean
  /** One sentence for the user (Vlaams), or null. */
  message: string | null
}
```

  - `AddressCheckStep` props: `{ mailing: Mailing; exchange: BpostExchange; bpost: BpostIds | null; corrections: Corrections; dispatch: Dispatch<CorrectionAction>; active: boolean }` (taak 12 vult het resultaat in, taak 15 het blok Indienen).

- [ ] **Step 1: Schrijf de componenttest** in `tests/components/mailing-flow/AddressCheckStep.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AddressCheckStep } from '@/components/mailing-flow/AddressCheckStep'
import type { BpostExchange } from '@/components/mailing-flow/useBpostExchange'
import { sampleMailing } from '../../core/masspost/store/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
afterEach(cleanup)

const exchange = (over: Partial<BpostExchange> = {}): BpostExchange => ({
  send: vi.fn(async () => {}),
  resend: vi.fn(async () => {}),
  receive: vi.fn(async () => {}),
  check: null,
  create: null,
  changed: false,
  busy: false,
  message: null,
  ...over,
})
const corrections = { values: {}, excluded: {}, undo: [], nextId: 1 }
const ids = { customerId: '251614', accountId: '1234567' }
const base = { corrections, dispatch: () => {}, active: true, bpost: ids }

describe('AddressCheckStep', () => {
  it('not checked yet: explains and offers "Controleren bij bpost"', () => {
    const ex = exchange()
    render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'format', counts: { addresses: 789, formatIssuesOpen: 0 } })} exchange={ex} />)
    expect(screen.getByText('bpost kijkt elk adres na en stelt verbeteringen voor.')).toBeTruthy()
    screen.getByRole('button', { name: 'Controleren bij bpost' }).click()
    expect(ex.send).toHaveBeenCalledWith('check', 'T')
  })

  it('waiting: the button is off, the state and the temporary manual block are shown', () => {
    const mailing = sampleMailing({
      status: 'format',
      counts: { addresses: 789, formatIssuesOpen: 0 },
      exchanges: [{ kind: 'check', fileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML', mailingRef: 'CP-2026-15-C1', mode: 'T', items: 789, fingerprint: 'cd'.repeat(32), excluded: [], sentAt: '2026-10-13T12:05:00.000Z', sentBy: 'an@x.be', state: 'sent' }],
    })
    render(<AddressCheckStep {...base} mailing={mailing} exchange={exchange()} />)
    expect((screen.getByRole('button', { name: /Wachten op bpost/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Zolang de automatische verbinding er niet is/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /XML opnieuw opslaan/ })).toBeTruthy()
    expect(screen.getByText('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')).toBeTruthy()
  })

  it('without bpost numbers: points to Instellingen, no send button', () => {
    render(<AddressCheckStep {...base} bpost={null} mailing={sampleMailing({ status: 'format' })} exchange={exchange()} />)
    expect(screen.getByText(/Vul eerst je klantnummer en account-ID in bij/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Instellingen' }).getAttribute('href')).toBe('/instellingen')
    expect((screen.getByRole('button', { name: 'Controleren bij bpost' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a refusal of bpost with its code', () => {
    const mailing = sampleMailing({
      status: 'format',
      exchanges: [{ kind: 'check', fileName: 'X_0RQ.XML', mailingRef: 'CP-2026-15-C1', mode: 'T', items: 5, fingerprint: 'cd'.repeat(32), excluded: [], sentAt: '2026-10-13T12:05:00.000Z', sentBy: 'an@x.be', state: 'rejected', problem: 'MID-2040' }],
    })
    render(<AddressCheckStep {...base} mailing={mailing} exchange={exchange()} />)
    expect(screen.getByRole('alert').textContent).toBe('bpost weigerde het bestand (MID-2040). Kijk de lijst na en controleer opnieuw.')
    expect(screen.getByRole('button', { name: 'Controleren bij bpost' })).toBeTruthy()
  })

  it('shows the message of the exchange, and the AFT export switched off', () => {
    render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'format' })} exchange={exchange({ message: 'Dit is geen antwoord van bpost. Kies het XML-bestand dat eindigt op _2RS of _1AK.' })} />)
    expect(screen.getByRole('alert').textContent).toContain('Dit is geen antwoord van bpost')
    const aft = screen.getByRole('button', { name: /Opslaan voor bpost \(AFT, \.xls\)/ }) as HTMLButtonElement
    expect(aft.getAttribute('aria-disabled')).toBe('true')
  })
})
```

- [ ] **Step 2: Draai de test.** Run: `npx vitest run tests/components/mailing-flow/AddressCheckStep.test.tsx`. Expected: FAIL (modules bestaan niet).

- [ ] **Step 3: Schrijf `useBpostExchange.ts`:**

```ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { groupCheckResult, type CheckView } from '@/core/masspost/address-check'
import { changedSinceSent, latestExchange, nextRefNumber, processResponse, recordSent } from '@/core/masspost/exchange'
import { ManualMailbox } from '@/core/masspost/mailbox'
import type { MappedRow } from '@/core/masspost/mapping'
import { parseBpostResponse, type MailingResult } from '@/core/masspost/parse-response'
import {
  buildRequestFile,
  checkMailingRef,
  createMailingRef,
  correctedRows,
  decodeLatin1,
  itemsFingerprint,
  RequestInvalidError,
  type BpostIds,
  type BpostMode,
} from '@/core/masspost/request-file'
import { MAILING_FILES_DIR } from '@/core/masspost/store/mailing-store'
import { useMailingStore } from '@/components/mailings/MailingStoreProvider'
import type { Corrections } from './corrections'
import { saveFile } from './save-file'
import type { MailingSaver } from './useMailingSaver'

// (interface BpostExchange zoals hierboven, met TSDoc)

const XML = 'application/xml'
const MESSAGES = {
  invalid: 'Dit is geen antwoord van bpost. Kies het XML-bestand dat eindigt op _2RS of _1AK.',
  older: 'Dit antwoord hoort bij een vorige controle; we tonen het nieuwste.',
  foreign: (ref: string | null) => (ref ? `Dit antwoord hoort bij een andere mailing (${ref}).` : 'Dit antwoord hoort niet bij deze mailing.'),
  invalidRequest: 'We konden het bestand voor bpost niet maken. Kijk de formaatvalidatie na.',
} as const

/**
 * Sending to bpost and processing what comes back, through the mailbox and the store (design 13/10).
 * Today the mailbox is manual: sending saves the XML, the user drops the answer.
 * @param input The saver of the mailing, its mapped rows, the corrections and the bpost numbers.
 * @returns What step 4 needs.
 */
export function useBpostExchange(input: {
  saver: MailingSaver
  rows: MappedRow[]
  corrections: Corrections
  bpost: BpostIds | null
}): BpostExchange {
  const { saver, rows, corrections, bpost } = input
  const { store, user } = useMailingStore()
  const mailing = saver.mailing
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [check, setCheck] = useState<BpostExchange['check']>(null)
  const [create, setCreate] = useState<MailingResult | null>(null)
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  // The only mailbox for now (decision 11); `DriveMailbox` comes with milestone 2 and replaces this line.
  const mailbox = useMemo(() => new ManualMailbox((file) => saveFile(file.bytes, { name: file.name, mime: XML })), [])
  const going = useMemo(
    () => correctedRows(rows, corrections.values, Object.keys(corrections.excluded).map(Number)),
    [rows, corrections.values, corrections.excluded],
  )
  useEffect(() => {
    let alive = true
    void itemsFingerprint(going, mailing.priority).then((f) => alive && setFingerprint(f))
    return () => {
      alive = false
    }
  }, [going, mailing.priority])

  // The last processed check and submission, read back from their files (also after a reload).
  const lastCheck = latestExchange(mailing, 'check')
  const lastCreate = latestExchange(mailing, 'create')
  const checkFile = lastCheck?.state === 'processed' ? lastCheck.responseFile : undefined
  const createFile = lastCreate?.state === 'processed' ? lastCreate.responseFile : undefined
  // Read in the effect, not a reason to read the files again: the file name decides that.
  const checkItems = useRef(0)
  checkItems.current = lastCheck?.items ?? 0
  useEffect(() => {
    let alive = true
    ;(async () => {
      const read = async (name?: string) => {
        const blob = name ? await store.getFile(mailing.id, MAILING_FILES_DIR + name) : null
        return blob ? (parseBpostResponse(decodeLatin1(new Uint8Array(await blob.arrayBuffer()))) as MailingResult) : null
      }
      const c = await read(checkFile)
      const s = await read(createFile)
      if (!alive) return
      setCheck(c ? { result: c, view: groupCheckResult(c, checkItems.current) } : null)
      setCreate(s)
    })()
    return () => {
      alive = false
    }
  }, [store, mailing.id, checkFile, createFile])

  const latest = useRef(mailing)
  latest.current = mailing

  /** Everything waiting in the mailbox, one file at a time. */
  const processInbox = useCallback(async () => {
    for (const file of await mailbox.responses()) {
      const r = processResponse(latest.current, file.name, decodeLatin1(file.bytes), new Date())
      if (r.outcome === 'applied' || r.outcome === 'older') {
        await store.saveFile(latest.current.id, MAILING_FILES_DIR + file.name, new Blob([file.bytes as BlobPart], { type: XML }))
      }
      if (r.outcome === 'applied') await saver.save(r.change, r.event)
      setMessage(
        r.outcome === 'invalid' ? MESSAGES.invalid : r.outcome === 'older' ? MESSAGES.older : r.outcome === 'foreign' ? MESSAGES.foreign(r.mailingRef) : null,
      )
      await mailbox.remove(file.name)
    }
  }, [mailbox, saver, store])

  const send = useCallback(
    async (kind: 'check' | 'create', mode: BpostMode) => {
      if (!bpost || busy) return
      setBusy(true)
      setMessage(null)
      try {
        await saver.flush()
        const m = latest.current
        const n = nextRefNumber(m, kind)
        const file = await buildRequestFile({
          kind,
          rows: going,
          mailingRef: kind === 'check' ? checkMailingRef(m.code, n) : createMailingRef(m.code, n),
          mode,
          priority: m.priority,
          ids: bpost,
          now: new Date(),
          create: { expectedDeliveryDate: m.expectedDeliveryDate, format: m.format, genMID: m.genMID, genPSC: m.genPSC },
        })
        await store.saveFile(m.id, MAILING_FILES_DIR + file.fileName, new Blob([file.bytes as BlobPart], { type: XML }))
        await saver.save(recordSent(m, file, Object.keys(corrections.excluded).map(Number), user.email, new Date()), kind === 'check' ? 'bpost-check-sent' : 'bpost-create-sent')
        await mailbox.send({ name: file.fileName, bytes: file.bytes })
      } catch (e) {
        if (e instanceof RequestInvalidError) setMessage(MESSAGES.invalidRequest)
        else throw e
      } finally {
        setBusy(false)
      }
    },
    [bpost, busy, corrections.excluded, going, mailbox, saver, store, user.email],
  )

  const resend = useCallback(async () => {
    const last = latestExchange(latest.current)
    const blob = last ? await store.getFile(latest.current.id, MAILING_FILES_DIR + last.fileName) : null
    if (last && blob) await mailbox.send({ name: last.fileName, bytes: new Uint8Array(await blob.arrayBuffer()) })
  }, [mailbox, store])

  const receive = useCallback(
    async (files: readonly File[]) => {
      for (const f of files) mailbox.receive({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })
      await processInbox()
    },
    [mailbox, processInbox],
  )

  const last = latestExchange(mailing)
  return {
    send,
    resend,
    receive,
    check,
    create,
    changed: !!last && fingerprint !== null && changedSinceSent(last, fingerprint),
    busy,
    message,
  }
}
```

  Het aantal adressen van de controle gaat via een ref (`checkItems`): geen `eslint-disable react-hooks/...` (werkafspraak). `saver.flush()` bestaat (`MailingSaver.flush`).

- [ ] **Step 4: Schrijf `AddressCheckStep.tsx`** (deel A: de toestanden; het resultaat komt in taak 12):

```tsx
'use client'

import { useRef, type Dispatch } from 'react'
import Link from 'next/link'
import { IconDownload, IconFileUpload } from '@tabler/icons-react'
import { latestExchange } from '@/core/masspost/exchange'
import type { BpostIds } from '@/core/masspost/request-file'
import { isWaiting, type Mailing } from '@/core/masspost/store/mailing'
import { formatCount } from './columns'
import type { CorrectionAction, Corrections } from './corrections'
import styles from './mailing-flow.module.css'
import { NextButton } from './NextButton'
import { Spinner } from './StatusIcons'
import { StepAction } from './StepAction'
import type { BpostExchange } from './useBpostExchange'

const time = (iso: string) =>
  new Date(iso).toLocaleString('nl-BE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

/**
 * Step 4, Adrescontrole (sketch adrescontrole.html v3): check at bpost, wait, the result, submit.
 * The button of the step follows the state (design 13/10, part 3).
 * @param props The mailing, the exchange with bpost, the bpost numbers and the shared corrections.
 */
export function AddressCheckStep({
  mailing,
  exchange,
  bpost,
  corrections,
  dispatch,
  active,
}: {
  mailing: Mailing
  exchange: BpostExchange
  bpost: BpostIds | null
  corrections: Corrections
  dispatch: Dispatch<CorrectionAction>
  active: boolean
}) {
  const waiting = isWaiting(mailing)
  const last = latestExchange(mailing)
  const arr = exchange.check?.result.arr ?? null
  const fileInput = useRef<HTMLInputElement>(null)

  const action = waiting ? (
    <NextButton disabled busy>
      Wachten op bpost
    </NextButton>
  ) : exchange.check && arr !== null && arr >= 96 ? (
    <NextButton onClick={() => document.getElementById('indienen')?.scrollIntoView({ behavior: 'smooth' })}>Indienen bij bpost</NextButton>
  ) : (
    <NextButton disabled={!bpost || exchange.busy} busy={exchange.busy} onClick={() => void exchange.send('check', 'T')}>
      {exchange.check ? 'Opnieuw controleren' : 'Controleren bij bpost'}
    </NextButton>
  )

  return (
    <section aria-label="Adrescontrole">
      <div className={styles.hd}>
        <div>
          <p className={styles.m}>bpost kijkt elk adres na en stelt verbeteringen voor.</p>
        </div>
        <StepAction step="check">{action}</StepAction>
      </div>

      {!bpost && (
        <p className={styles.alert} role="alert">
          Vul eerst je klantnummer en account-ID in bij <Link href="/instellingen">Instellingen</Link>.
        </p>
      )}
      {exchange.message && (
        <p className={styles.alert} role="alert">
          {exchange.message}
        </p>
      )}
      {last?.state === 'rejected' && (
        <p className={styles.alert} role="alert">
          bpost weigerde het bestand ({last.problem}). Kijk de lijst na en {last.kind === 'check' ? 'controleer opnieuw' : 'dien opnieuw in'}.
        </p>
      )}

      {waiting && last && (
        <div className={styles.saveCards}>
          <section className={styles.saveCard} aria-label="Stand bij bpost">
            <ol className={styles.exchangeSteps}>
              <li data-done>✓ Verstuurd · {time(last.sentAt)} · {formatCount(last.items)} adressen</li>
              <li data-done={last.state === 'received' ? '' : undefined}>Ontvangen door bpost</li>
              <li>Antwoord</li>
            </ol>
          </section>
          <section className={`${styles.saveCard} ${styles.manualBox}`} aria-labelledby="manual-title">
            <h2 className={styles.gn} id="manual-title">
              Zolang de automatische verbinding er niet is
            </h2>
            <p className={styles.m}>① Laad dit bestand op via de e-MassPost-website.</p>
            <button type="button" className={`${styles.b} ${styles.withIcon}`} onClick={() => void exchange.resend()}>
              <IconDownload size={14} stroke={1.75} aria-hidden="true" />
              XML opnieuw opslaan
            </button>
            <p className={styles.fileName}>{last.fileName}</p>
            <p className={styles.m}>② Zet hier het antwoord van bpost (_1AK of _2RS).</p>
            <button type="button" className={`${styles.b} ${styles.withIcon}`} onClick={() => fileInput.current?.click()}>
              <IconFileUpload size={14} stroke={1.75} aria-hidden="true" />
              Antwoord van bpost kiezen
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".xml,.XML"
              multiple
              hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])]
                e.target.value = ''
                if (files.length) void exchange.receive(files)
              }}
            />
          </section>
        </div>
      )}

      {/* Taak 12: het resultaat (ARR-balk en groepen). Taak 15: het blok Indienen. */}

      <section className={styles.otherFiles} aria-labelledby="other-files">
        <h2 className={styles.gn} id="other-files">
          Andere bestanden
        </h2>
        <span className={styles.tipStart} data-tip="Niet in deze versie">
          <button type="button" className={`${styles.b} ${styles.withIcon}`} aria-disabled="true" onClick={(e) => e.preventDefault()}>
            <IconDownload size={14} stroke={1.75} aria-hidden="true" />
            Opslaan voor bpost (AFT, .xls)
          </button>
        </span>
      </section>
    </section>
  )
}
```

  Het sleepvak: `FileDrop.tsx` is gemaakt voor één adreslijst en leest die in; gebruik het niet. Maak het manuele kader zelf een sleepvak: `onDragOver={(e) => e.preventDefault()}` en `onDrop={(e) => { e.preventDefault(); void exchange.receive([...e.dataTransfer.files]) }}` op de tweede `<section>`, met `data-over` tijdens het slepen (grijs, besluit 22 van 11/10: enkel grijs bij slepen). `NextButton` met `busy` houdt het label en toont het wieltje in plaats van het pijltje, dus "Wachten op bpost" blijft staan.

- [ ] **Step 5: CSS** in `mailing-flow.module.css`:

```css
.exchangeSteps { display: flex; gap: 24px; list-style: none; margin: 0; padding: 0; color: var(--text-muted); font-size: 13px; }
.exchangeSteps li[data-done] { color: var(--text-primary); }
.manualBox { background: var(--surface-1); }
.manualBox[data-over] { outline: 2px dashed var(--text-muted); }
.fileName { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; color: var(--text-muted); margin: 4px 0 12px; word-break: break-all; }
.otherFiles { margin-top: 40px; display: flex; gap: 16px; align-items: center; }
.otherFiles button[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }
@media (max-width: 640px) { .exchangeSteps { flex-direction: column; gap: 6px; } }
```

  De variabelen komen uit `src/components/app-shell/tokens.css` (`--surface-1` is het grijze vlak, `--text-primary`, `--text-muted`), licht en donker.

- [ ] **Step 6: `FormatStep` zonder stap 4.** Verwijder in `FormatStep.tsx` het blok `if (done) { … }`, de functie `save`, de state `saving`, de types `SaveTarget` en `SaveChoices` en de props `done` en `onSave`. Laat `onDone` staan: de knop "Verder naar adrescontrole" roept `onDone(true)` aan. Verwijder in `FormatStep.render.test.tsx` de test "FormatStep, address check (step 4)" en de props `done`/`onSave`.

- [ ] **Step 7: `MailingFlow`.**
  - Verwijder de functie `save` (AFT en drukker) en de imports die enkel zij gebruikte (`exportBaseName`, `printerFile`, `saveFile`, `SaveChoices`, `SaveTarget`, `AddressField` als die nergens anders meer nodig is). Het bestand voor de drukker komt terug in taak 15.
  - Maak de rijen en de uitwisseling:

```ts
  const mappedRows = useMemo(
    () => mapRows(list.rows, rolesToMapping(columnOrder, roles).mapping, { rowNumbers: list.rowNumbers }).rows,
    [list, columnOrder, roles],
  )
  const bpostExchange = useBpostExchange({ saver, rows: mappedRows, corrections, bpost })
```

  - `onFormatStep` wordt `step === 'format'`; `<FormatStep … active={step === 'format'} />` zonder `done`/`onSave`; `onDone={(d) => setStep(d ? 'check' : 'format')}` blijft.
  - Onder `<FormatStep>`:

```tsx
          {step === 'check' && checkedFor !== null && (
            <AddressCheckStep
              mailing={saver.mailing}
              exchange={bpostExchange}
              bpost={bpost}
              corrections={corrections}
              dispatch={dispatchCorrections}
              active={step === 'check'}
            />
          )}
```

  - Stappenbalk (`stepStatus.check` en `progress.check`):

```ts
  const lastCheck = latestExchange(saver.mailing, 'check')
  const checkArr = lastCheck?.state === 'processed' ? (lastCheck.arr ?? null) : null
  // Yellow until checked and while below 96 %, green from 96 % (design 13/10, part 3).
  check: checkArr === null ? (lastCheck ? 'action' : 'none') : checkArr >= 96 ? 'done' : 'action',
  // in progress:
  check: checkArr === null ? (isWaiting(saver.mailing) ? 0.5 : 0) : Math.min(1, checkArr / 96),
```

- [ ] **Step 8: Hervatten.** In `resume.ts`: een mailing die wacht of gecontroleerd is, opent op stap 4. Test eerst (in `tests/components/mailing-flow/resume.test.ts`):

```ts
  it('opens step 4 for a mailing that waits for bpost or was checked', () => {
    const mapped = { order: ['A'], roles: { A: 'name' } }
    expect(resumeStep(sampleMailing({ mapping: mapped, status: 'checked', counts: { addresses: 5, formatIssuesOpen: 3 } }))).toBe('check')
  })
```

  Implementatie: `if (m.status === 'checked' || m.status === 'submitted' || isWaiting(m)) return 'check'` vóór de bestaande regel met `formatIssuesOpen` (importeer `isWaiting`). Zo blijft een mailing waarvan je na het versturen nog een formaatfout opende, toch op stap 4 openen.

- [ ] **Step 9: Statusicoon en tekst "wachten".** Test eerst (in `tests/components/mailings/StatusIcon.test.tsx`, in de stijl van de bestaande tests): een samenvatting met `waiting: true` toont de tekst "Wachten op bpost" (hovertip en `srOnly`). Implementatie: in `labels.ts` `statusLabel`: `if (m.waiting) return 'Wachten op bpost'` als eerste regel; in `StatusIcon.tsx` vóór de `switch`: `if (mailing.waiting)` → `<Spinner size={size} />` (uit `@/components/mailing-flow/StatusIcons`), zoals "Wachten" in `statusiconen.html`.

- [ ] **Step 10: Draai de tests.** Run: `npx vitest run tests/components`. Expected: PASS.

- [ ] **Step 11: Ronde in de browser** (dev-server op poort 3000, paneel, testmailing MM-2026-1 of SR-2026-1; **niet MM-2026-3**):
  - Stap 4 toont "Controleren bij bpost". Vang de download op met `HTMLAnchorElement.prototype.click` (geen echte download zonder akkoord) en controleer naam (`MID_0200_…_0RQ.XML`) en inhoud (`<MailingCheck`, `mode="T"`).
  - Na de klik: wachttoestand, wieltje voor de titel, in het overzicht het icoon "wachten" in de groep "wachten".
  - Laad via `DataTransfer` op de `input[type=file]` een `_2RS` op waarvan `RequestProps fileName` gelijk is aan de verstuurde naam (maak er een kopie van `docs/samples/contrapunt/bpost-roundtrip/MID_0200_251614_REFERENCE0_261001152310_2RS.XML` met de juiste naam in je kladmap, via de CORS-server op `127.0.0.1:8799`): de status wordt "Gecontroleerd".
  - Laad hetzelfde bestand opnieuw: niets verandert. Laad een `_2RS` met een andere naam: de melding "Dit antwoord hoort bij een andere mailing (…)". Laad een willekeurig XML-bestand: "Dit is geen antwoord van bpost…".
  - Herlaad: de toestand blijft.

- [ ] **Step 12: Checkpoint.** Run: `npx tsc --noEmit -p . && npm run lint:fix`. Expected: geen fouten.

### Task 12: Het resultaat: ARR-balk, groepen en rijen met keuzelijst

**Poort:** na het akkoord van Mark over taak 1. Volg de schets v3 voor maten en plaatsing.

**Files:**
- Create: `src/components/mailing-flow/ArrBar.tsx`, `src/components/mailing-flow/AddressRow.tsx`, `src/components/mailing-flow/CheckGroups.tsx`
- Modify: `src/components/mailing-flow/AddressCheckStep.tsx` (resultaat tonen), `src/components/mailing-flow/MailingFlow.tsx` (pills van stap 4), `src/components/mailing-flow/mailing-flow.module.css`
- Test: `tests/components/mailing-flow/CheckGroups.test.tsx` (nieuw), `tests/components/mailing-flow/ArrBar.test.tsx` (nieuw)

**Interfaces:**
- Consumes: `CheckRow`, `CheckView`, `CHECK_GROUPS`, `currentValue`, `valueChanges`, `isOpen`, `estimateArr`, `splitAddress` (taak 5); `Corrections`, `CorrectionAction` (taak 9); `arrTone`, `formatPercent` (`src/components/mailings/labels.ts`); `FIELD_LABELS`, `formatCount` (`columns.ts`).
- Produces:
  - `ArrBar({ arr, estimate }: { arr: number; estimate: number | null })`
  - `AddressRow` (memo) met props `{ row: CheckRow; value: string; excluded: boolean; tabStop: boolean; onCommit: (row: CheckRow, value: string) => void; onToggleExclude: (row: CheckRow) => void; onFocusRow: (row: CheckRow) => void; onMove: (from: HTMLElement, delta: number | 'first' | 'last') => void }`
  - `CheckGroups({ view, corrections, dispatch, active }: { view: CheckView; corrections: Corrections; dispatch: Dispatch<CorrectionAction>; active: boolean })`

- [ ] **Step 1: Schrijf de tests.** `tests/components/mailing-flow/ArrBar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ArrBar } from '@/components/mailing-flow/ArrBar'

afterEach(cleanup)

describe('ArrBar', () => {
  it('shows the ARR of bpost and, when different, the estimate', () => {
    render(<ArrBar arr={93.4} estimate={95.1} />)
    expect(screen.getByText('ARR van bpost: 93,4 %')).toBeTruthy()
    expect(screen.getByText('Geschat na je aanpassingen: 95,1 %')).toBeTruthy()
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('93.4')
  })
  it('leaves the estimate out when it equals the ARR', () => {
    render(<ArrBar arr={99.8} estimate={99.8} />)
    expect(screen.queryByText(/Geschat/)).toBeNull()
  })
})
```

  `tests/components/mailing-flow/CheckGroups.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { groupCheckResult } from '@/core/masspost/address-check'
import type { MailingResult } from '@/core/masspost/parse-response'
import { CheckGroups } from '@/components/mailing-flow/CheckGroups'

afterEach(cleanup)

const sent = { name: 'Luc', streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' }
const result: MailingResult = {
  kind: 'check',
  requestFileName: 'X_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  statusCode: '100',
  arr: 90,
  messages: [],
  items: [
    { seq: 58, messages: [{ code: 'MID-4010', severity: 'ERROR', contents: {} }], suggestions: [], candidates: [], sent },
    { seq: 412, messages: [{ code: 'MID-4020', severity: 'ERROR', contents: {} }], suggestions: [], candidates: [{ streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9310 MOORSEL' }], sent },
    { seq: 2, messages: [{ code: '7001', severity: 'WARN', contents: { compCode: '92', compCorrection: 'KERKSTRAAT 1 BUS 2' } }], suggestions: [{ field: 'streetHouseBox', value: 'KERKSTRAAT 1 BUS 2', source: 'OptiAddress' }], candidates: [], sent },
    { seq: 3, messages: [{ code: '7001', severity: 'WARN', contents: { compCode: '92', compCorrection: 'KERKSTRAAT 3 BUS 1' } }], suggestions: [{ field: 'streetHouseBox', value: 'KERKSTRAAT 3 BUS 1', source: 'OptiAddress' }], candidates: [], sent: { ...sent, streetHouseBox: 'Kerkstraat 3 1' } },
  ],
}
const view = groupCheckResult(result, 10)
const corrections = { values: {}, excluded: {}, undo: [], nextId: 1 }

describe('CheckGroups', () => {
  it('shows the groups in order, with the open addresses per group', () => {
    render(<CheckGroups view={view} corrections={corrections} dispatch={() => {}} active />)
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Geen adres gevonden', 'Meerdere adressen gevonden', 'Voorstel van bpost', 'In orde'])
  })

  it('takes a proposal over with Enter, and all proposals in one action', () => {
    const dispatch = vi.fn()
    render(<CheckGroups view={view} corrections={corrections} dispatch={dispatch} active />)
    fireEvent.keyDown(screen.getByRole('group', { name: /Rij 2 · straat/ }), { key: 'Enter' })
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'apply', changes: [{ key: '2:streetHouseBox', seq: 2, value: 'Kerkstraat 1 bus 2' }] })
    fireEvent.click(screen.getByRole('button', { name: /Alles overnemen/ }))
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'apply',
      changes: [
        { key: '2:streetHouseBox', seq: 2, value: 'Kerkstraat 1 bus 2' },
        { key: '3:streetHouseBox', seq: 3, value: 'Kerkstraat 3 bus 1' },
      ],
    })
  })

  it('excludes a row with X', () => {
    const dispatch = vi.fn()
    render(<CheckGroups view={view} corrections={corrections} dispatch={dispatch} active />)
    fireEvent.keyDown(screen.getByRole('group', { name: /Rij 58 · adres/ }), { key: 'x' })
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'toggleExclude', key: '58:address', seq: 58 })
  })

  it('offers the candidates of bpost for multiple matches, with the source', () => {
    render(<CheckGroups view={view} corrections={corrections} dispatch={() => {}} active />)
    fireEvent.focus(screen.getByRole('combobox', { name: /Rij 412 · adres/ }))
    const option = screen.getByRole('option', { name: /Kerkstraat 1, 9310 Moorsel/ })
    expect(option.textContent).toContain('OptiAddress')
  })

  it('refuses an address without postcode', () => {
    const dispatch = vi.fn()
    render(<CheckGroups view={view} corrections={corrections} dispatch={dispatch} active />)
    const input = screen.getByRole('combobox', { name: /Rij 58 · adres/ })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Kerkstraat 10' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByText('Schrijf het adres als: straat en nummer, postcode en gemeente.')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/components/mailing-flow/ArrBar.test.tsx tests/components/mailing-flow/CheckGroups.test.tsx`. Expected: FAIL (modules bestaan niet).

- [ ] **Step 3: Schrijf `ArrBar.tsx`:**

```tsx
import { arrTone, formatPercent } from '@/components/mailings/labels'
import styles from './mailing-flow.module.css'

const TONE = { red: 'var(--red)', orange: 'var(--orange)', green: 'var(--green)' } as const

/**
 * The ARR of bpost on a bar from 0 to 100 %, with the limits 96 and 98 % (decision 1 of 02/10), and the
 * estimate after your changes as a lighter "phantom" part in the colour of its zone (decision 39).
 * @param props The ARR of bpost and the estimate (null: none).
 */
export function ArrBar({ arr, estimate }: { arr: number; estimate: number | null }) {
  const shown = estimate !== null && Math.abs(estimate - arr) >= 0.05
  const ahead = shown && estimate! > arr
  return (
    <div className={styles.arr}>
      <div
        className={styles.arrTrack}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={arr}
        aria-label="ARR van bpost"
      >
        <span className={styles.arrFill} style={{ width: `${Math.min(arr, ahead ? arr : estimate ?? arr)}%`, background: TONE[arrTone(arr)] }} />
        {shown && (
          <span
            className={styles.arrPhantom}
            style={{
              left: `${Math.min(arr, estimate!)}%`,
              width: `${Math.abs(estimate! - arr)}%`,
              background: TONE[arrTone(estimate!)],
            }}
          />
        )}
        <span className={styles.arrMark} style={{ left: '96%' }} data-tip="Minimum: 96 %" />
        <span className={styles.arrMark} style={{ left: '98%' }} data-tip="Extra korting vanaf 98 %" />
      </div>
      <p className={styles.m}>ARR van bpost: {formatPercent(arr)}</p>
      {shown && <p className={styles.m}>Geschat na je aanpassingen: {formatPercent(estimate!)}</p>}
    </div>
  )
}
```

  CSS:

```css
.arr { margin: 8px 0 24px; }
.arrTrack { position: relative; height: 8px; border-radius: 4px; background: var(--surface-1); overflow: visible; }
.arrFill, .arrPhantom { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 4px; }
.arrPhantom { opacity: 0.35; }
.arrMark { position: absolute; top: -3px; bottom: -3px; width: 1px; background: var(--text-muted); }
```


- [ ] **Step 4: Schrijf `AddressRow.tsx`.** Bouw op `IssueRow.tsx` (lees het volledig): dezelfde opbouw van de rij (`styles.row`, `styles.k`, `styles.cell`, `styles.fw`, `styles.in`, `styles.why`, `styles.st`, `styles.prop`, `styles.xbtn`, `styles.ib`, `styles.ctx`), dezelfde knoppen (voorstel overnemen ↵, terugzetten, uitsluiten met envelop) en dezelfde toetsen. De verschillen:

```tsx
'use client'

import { memo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { IconArrowBackUp, IconCircleCheck, IconCircleX, IconCornerDownLeft, IconMail, IconMailOff } from '@tabler/icons-react'
import { splitAddress, type CheckRow } from '@/core/masspost/address-check'
import { FIELD_LABELS } from './columns'
import styles from './mailing-flow.module.css'

const ADDRESS_HELP = 'Schrijf het adres als: straat en nummer, postcode en gemeente.'
const noBlur = (e: MouseEvent) => e.preventDefault()

/** Props of one row of step 4. */
export interface AddressRowProps {
  row: CheckRow
  /** The value now (`currentValue`). */
  value: string
  excluded: boolean
  tabStop: boolean
  onCommit: (row: CheckRow, value: string) => void
  onToggleExclude: (row: CheckRow) => void
  onFocusRow: (row: CheckRow) => void
  onMove: (from: HTMLElement, delta: number | 'first' | 'last') => void
}

/**
 * One address in step 4: the value, a list of proposed addresses with their source (OptiAddress),
 * take a proposal over, change it yourself, put it back or exclude the row (sketch adrescontrole.html).
 */
export const AddressRow = memo(function AddressRow({ row, value, excluded, tabStop, onCommit, onToggleExclude, onFocusRow, onMove }: AddressRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const shown = draft ?? value
  const changed = !excluded && value !== row.original
  const showsProp = !excluded && !!row.proposal && value === row.original
  const label = `Rij ${row.seq} · ${row.field === 'address' ? 'adres' : FIELD_LABELS[row.field].short}`
  const id = `a-${row.key.replace(':', '-')}`
  // Filter only on what the user typed; on focus the field holds the current value and every option shows.
  const typed = draft !== null && draft !== value
  const query = typed ? draft!.toLowerCase() : ''
  const options = query ? row.options.filter((o) => o.value.toLowerCase().includes(query)) : row.options

  function commit(next: string): boolean {
    if (row.field === 'address' && next !== row.original && !splitAddress(next)) {
      setError(ADDRESS_HELP)
      return false
    }
    setError(null)
    setDraft(null)
    setOpen(false)
    if (next !== value) onCommit(row, next)
    return true
  }

  function startEdit() {
    if (excluded) return
    inputRef.current?.focus()
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== rowRef.current) return
    const key = e.key.toLowerCase()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      onMove(rowRef.current!, 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onMove(rowRef.current!, -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (showsProp) commit(row.proposal!)
      else startEdit()
    } else if (key === 'e' || e.key === 'F2') {
      e.preventDefault()
      startEdit()
    } else if (key === 'x') {
      e.preventDefault()
      onToggleExclude(row)
    }
  }

  return (
    <div
      ref={rowRef}
      role="group"
      className={`${styles.row} ${draft !== null ? styles.editing : ''} ${excluded ? styles.excl : ''}`}
      tabIndex={tabStop ? 0 : -1}
      data-nav=""
      data-key={row.key}
      aria-label={`${label}: ${shown || '(leeg)'}`}
      aria-keyshortcuts="ArrowUp ArrowDown Enter E X"
      onKeyDown={onRowKeyDown}
      onFocus={(e) => e.target === rowRef.current && onFocusRow(row)}
    >
      <div className={styles.k}>{label}</div>
      <div className={styles.cell}>
        <div className={styles.fw}>
          <input
            ref={inputRef}
            id={id}
            className={styles.in}
            tabIndex={-1}
            role="combobox"
            aria-label={label}
            aria-expanded={open && options.length > 0}
            aria-controls={`${id}-list`}
            aria-invalid={!!error}
            aria-describedby={`${id}-why`}
            value={shown}
            disabled={excluded}
            onFocus={() => {
              setDraft(value)
              setOpen(true)
              setHighlight(-1)
              onFocusRow(row)
            }}
            onChange={(e) => {
              setDraft(e.target.value)
              setOpen(true)
              setError(null)
            }}
            onBlur={() => {
              if (draft !== null && !commit(draft)) return
              setOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && options.length) {
                e.preventDefault()
                setHighlight((h) => Math.min(options.length - 1, h + 1))
              } else if (e.key === 'ArrowUp' && options.length) {
                e.preventDefault()
                setHighlight((h) => Math.max(0, h - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (commit(highlight >= 0 ? options[highlight].value : shown)) rowRef.current?.focus()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setDraft(null)
                setOpen(false)
                setError(null)
                rowRef.current?.focus()
              }
            }}
          />
          {open && options.length > 0 && (
            <ul className={styles.sug} role="listbox" id={`${id}-list`}>
              {options.map((o, i) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={i === highlight}
                  className={i === highlight ? styles.hl : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commit(o.value)
                    rowRef.current?.focus()
                  }}
                >
                  <span>{o.value}</span>
                  <small>{o.source}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.why} id={`${id}-why`}>
          {error ?? (!excluded && row.note) ?? null}
        </div>
      </div>
      {/* status, proposal, ↵ / undo and exclude: as in IssueRow, with `showsProp`, `changed`, `excluded`. */}
    </div>
  )
})
```

  Vul het commentaar onderaan in met de vier elementen van `IssueRow` (regels ±185–260: `styles.st` met `IconCircleX` als de rij open is en `IconCircleCheck` als ze opgelost of in orde is; `styles.prop` met "Uitgesloten uit de mailing" of het voorstel; de knop ↵ (`IconCornerDownLeft`, `commit(row.proposal!)`) of terugzetten (`IconArrowBackUp`, `commit(row.original)`); de knop uitsluiten (`IconMail`/`IconMailOff`, `onToggleExclude(row)`)), met `onMouseDown={noBlur}` en `tabIndex={-1}` zoals daar. De hovertips: "Voorstel overnemen (Enter)", "Oorspronkelijke waarde terugzetten: <origineel>", "Uitsluiten uit de mailing (X)" / "Opnieuw opnemen (X)".

  CSS voor de keuzelijst (overgenomen uit de schets `adrescontrole.html`, klasse `.sug`):

```css
.sug { position: absolute; z-index: 5; left: 0; right: 0; top: 100%; margin: 2px 0 0; padding: 4px 0; list-style: none; background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 4px 12px rgb(0 0 0 / 0.12); }
.sug li { display: flex; justify-content: space-between; gap: 12px; padding: 6px 10px; cursor: pointer; }
.sug li small { color: var(--text-muted); }
.sug .hl, .sug li:hover { background: var(--surface-1); }
```

  `.fw` heeft al `position: relative`; `--border`, `--red`, `--orange` en `--green` staan in `tokens.css`.

- [ ] **Step 5: Schrijf `CheckGroups.tsx`** naar het model van de groepen in `FormatStep.tsx` (regels ±162–355: `groups`, `groupStates`, `navItems`, `focusItem`, `move`, `closeGroup`, het toetsenbord op de knop van een groep, ⌘Z en de toast):
  - groepen in de volgorde van `CHECK_GROUPS`: elke groep met rijen, en `ok` altijd zodra `view.counts.ok > 0`; de titel alleen in een `<h3>`, de pill "open/totaal" ernaast (niet in de `<h3>`; geel bij open rijen, neutraal met groen icoon bij nul, besluit 51 en 58 van 02/10);
  - groep `ok`: dicht, met de pill `view.counts.ok` en de knop "Toon een paar voorbeelden" (de eerste 3 rijen van de groep, enkel als er rijen zijn: adressen zonder antwoord van bpost hebben er geen);
  - groep `proposal`: knop **Alles overnemen** (dubbel vinkje, `IconChecks`), die in één `apply` alle rijen overneemt die nog hun voorstel tonen; toast "N voorstellen overgenomen · Ongedaan maken";
  - groepen `noAddress` en `multiple`: knop **Alles uitsluiten** (besluit 54), één `apply` met `excluded: true` per open rij; toast "N rijen uitgesloten · Ongedaan maken";
  - `onCommit(row, value)`: `dispatch({ type: 'apply', changes: valueChanges(row, value).map((c) => ({ ...c, seq: row.seq })) })`;
  - `onToggleExclude(row)`: `dispatch({ type: 'toggleExclude', key: row.key, seq: row.seq })`;
  - per rij `value={currentValue(row, corrections.values)}` en `excluded={!!corrections.excluded[row.seq]}`;
  - ⌘Z enkel als `active`: `dispatch({ type: 'undo' })`;
  - onder de lijst de toetsenregel uit de schets: "Tab naar de volgende knop of groep rijen · ↑ ↓ rij kiezen · → ← rijen tonen of verbergen · Enter voorstel overnemen, of adres kiezen · E aanpassen · Esc terugzetten · X uitsluiten of opnieuw opnemen · ⌘Z laatste actie ongedaan maken".

  Gebruik de CSS-klassen van de formaatvalidatie (`styles.gh`, `styles.gn`, `styles.pill`, `styles.toast`) zodat beide stappen er hetzelfde uitzien.

- [ ] **Step 6: Toon het resultaat in `AddressCheckStep`.** Vervang het commentaar "Taak 12: …" door:

```tsx
      {exchange.check && !waiting && (
        <>
          <div className={styles.arrRow}>
            <ArrBar
              arr={exchange.check.result.arr ?? 0}
              estimate={estimateArr({
                arr: exchange.check.result.arr,
                sentItems: latestExchange(mailing, 'check')?.items ?? 0,
                rows: exchange.check.view.rows,
                values: corrections.values,
                excluded: corrections.excluded,
                excludedAtSend: latestExchange(mailing, 'check')?.excluded ?? [],
              })}
            />
            {arr !== null && arr >= 96 && (
              <button type="button" className={styles.b} disabled={!bpost || exchange.busy} onClick={() => void exchange.send('check', 'T')}>
                Opnieuw controleren
              </button>
            )}
          </div>
          {exchange.changed && (
            <p className={styles.alert}>
              Je wijzigde de lijst na het versturen.{' '}
              <button type="button" className={styles.b} onClick={() => void exchange.send('check', 'T')}>
                Opnieuw controleren
              </button>
            </p>
          )}
          <CheckGroups view={exchange.check.view} corrections={corrections} dispatch={dispatch} active={active} />
        </>
      )}
```

  CSS: `.arrRow { display: flex; gap: 24px; align-items: flex-start; } .arrRow > :first-child { flex: 1; }`.

- [ ] **Step 7: Pills van stap 4.** In `MailingFlow` (`listPills`): op stap 4 tellen de uitgesloten rijen en de ARR mee (besluit 46: "stap 4 hoeveel adressen meegaan, en de ARR"). Lees `listPills` in `MetaPills.tsx`; voeg een optionele invoer `arr?: number | null` toe die een pill maakt met het bolletje in `arrTone` en `formatPercent` (hovertip "ARR van bpost: …"), en geef op `step === 'check'` `arr: checkArr` en `excludedRows: Object.keys(corrections.excluded).length` mee. Er is nog geen test van `listPills`: maak `tests/components/mailing-flow/MetaPills.test.tsx` (jsdom) die `listPills({ fileName: 'a.xlsx', rowCount: 789, foreignCount: 0, excludedRows: 3, arr: 97.2 })` aanroept en nagaat dat er een pill met `text: '97,2 %'` en de hovertip "ARR van bpost: 97,2 %" is, en geen ARR-pill zonder `arr`.

- [ ] **Step 8: Draai de tests.** Run: `npx vitest run tests/components`. Expected: PASS.

- [ ] **Step 9: Ronde in de browser** (paneel, testmailing, niet MM-2026-3) met de antwoorden uit taak 11 en het synthetische antwoord uit taak 4 (in je kladmap als bestand, met de juiste `RequestProps fileName`): de groepen, de keuzelijst met "OptiAddress", Enter/E/X/⌘Z, Alles overnemen met Ongedaan maken, de fantoomlijn die meeschuift, de melding "Je wijzigde de lijst na het versturen" na een correctie, en herladen (de correcties blijven). Ook op 375 px en in donkere modus. Neem schermafdrukken voor Mark.

- [ ] **Step 10: Checkpoint.** Run: `npx tsc --noEmit -p . && npm run lint:fix`. Expected: geen fouten.

### Task 13: Deel A afronden: documentatie, DoD en een ronde met bpost

**Files:**
- Create: `docs/documentatie/webapp/adrescontrole.md`
- Modify: `docs/documentatie/webapp/SUMMARY.md` (of de `SUMMARY.md` van die map), `docs/SUMMARY.md`, `CHANGELOG.md`, `.agent/plans/INDEX.md`, `.agent/plans/2026-10-13-adrescontrole-indienen-design.md` (status)

- [ ] **Step 1: Gebruikersuitleg** `docs/documentatie/webapp/adrescontrole.md`, in het Vlaams, volgens `.agent/prompts/customer-facing-agent.md`, zonder verwijzingen naar `docs/ontwikkelaars/`: wat de adrescontrole doet, de drie stappen van de manuele weg (bestand opslaan, opladen op de e-MassPost-website, antwoord terugzetten), wat de groepen betekenen, wat de ARR is (96 % minimum, 98 % extra korting), en dat de app het antwoord vanzelf verwerkt. Voeg de pagina toe aan de `SUMMARY.md` van `docs/documentatie/` (of `docs/documentatie/webapp/`, kijk waar `mailings.md` staat) en aan `docs/SUMMARY.md` met het mappad als voorvoegsel.

- [ ] **Step 2: `CHANGELOG.md`** onder `## [Unreleased]`: één samenhangend item voor deel A, in de vier groepen (NL `Nieuw`/`Aanpassingen`, EN `Added`/`Changed`), met de link naar SR-130:
  - Nieuw: adrescontrole bij bpost in stap 4 (bestand voor bpost opslaan, antwoord terugzetten, vanzelf verwerkt; ARR met schatting; voorstellen van OptiAddress in een keuzelijst; corrigeren, uitsluiten, opnieuw controleren); blok "Verbinding met bpost" in Instellingen.
  - Aanpassingen: AFT-export uitgeschakeld; een wachtende mailing toont het icoon "wachten"; de correcties van stap 3 en 4 zijn één lijst.
  - Added/Changed (EN): `request-file.ts`, `parseBpostResponse`, `address-check.ts`, `exchange.ts`, `Mailbox`/`ManualMailbox`, store files (`saveFile`/`getFile`/`listFiles`, IndexedDB v2), ADR 0010.

- [ ] **Step 3: DoD.** Run: `npm run lint:fix && npx tsc --noEmit && npm test && npm run docs:build`. Expected: alles groen; `docs/ontwikkelaars/library/` bijgewerkt.

- [ ] **Step 4: Ronde met bpost in Test (met Mark).** Vraag Mark om een testmailing (niet MM-2026-3) te controleren: hij slaat het bestand op, laadt het op via de e-MassPost-website en zet het `_1AK`- en `_2RS`-antwoord terug. Kijk na: ontvangen, verwerkt, de groepen, de ARR. Noteer elke onbekende code of afwijking (Continuous Learning) voor `field-findings.md`.

- [ ] **Step 5: Field findings.** Bereid in de skills-repo (`docs/internal/e-masspost`, eigen branch en pull request naar `main`, ook een regel in haar `CHANGELOG.md`) de aanvulling voor `docs/reference/field-findings.md` voor: "Test (`T`) aanvaardt meer dan 500 adressen (Mark, 13/10/2026)", plus wat de ronde van stap 4 opleverde. Vraag Mark vóór je pusht of de pull request opent (de submodule-pointer in `bpost-mcp` volgt pas daarna, met een `CHANGELOG.md`-item).

- [ ] **Step 6: Plannen bijwerken.** Status van de spec en dit plan ("Deel A gebouwd, wacht op review van Mark"), `INDEX.md` bijwerken. SR-130 in Linear blijft open; meld Mark dat deel A klaar is voor zijn review.

- [ ] **Step 7: Commit, enkel na "je mag committen" van Mark.**

```bash
git add -A -- . ':!docs/internal/e-masspost'
git commit -m "feat: adrescontrole bij bpost in stap 4 via de brievenbus (SR-130 deel A)"
```

  Daarna `npm run docs:check`. Pushen enkel als Mark het vraagt.

# Deel B: indienen

> Start pas als Mark deel A nakeek. De library van het indienen (`buildRequestFile` met `kind: 'create'`, `createMailingRef`, de Mail ID in `parseBpostResponse`, `processResponse` naar `submitted`) bestaat al uit taak 3, 4 en 6.

### Task 14: Het bestand voor de drukker met Mail ID en adres zoals aangekondigd

**Files:**
- Modify: `src/core/masspost/request-file.ts` (`readRequestItems`), `src/core/masspost/printer-export.ts`, `src/components/mailing-flow/exports.ts`
- Test: `tests/core/masspost/request-file.test.ts`, `tests/core/masspost/printer-export.test.ts`, `tests/components/mailing-flow/exports.test.ts`

**Interfaces:**
- Consumes: `parseXml` (`@/lib/xml`); `MailingResult`, `parseBpostResponse` (taak 4); `latestExchange` (taak 6); `MAILING_FILES_DIR` (taak 7); `decodeLatin1` (taak 3).
- Produces:
  - `readRequestItems(xml: string): Map<number, Partial<Record<AddressField, string>>>` (de adressen zoals ze in een `…_0RQ.XML` staan)
  - `interface Announced { midNum?: string; address: string }`
  - `PrinterExportInput` krijgt `announced?: ReadonlyMap<number, Announced>` en `testMode?: boolean`
  - `PRINTER_EXPORT_COLUMNS` krijgt `mid: 'Mail ID'` en `announced: 'Adres zoals aangekondigd'`
  - `printerFile(source: ArrayBuffer, excludedRows: readonly number[], announce?: { announced: ReadonlyMap<number, Announced>; testMode: boolean }): Promise<Uint8Array>`
  - `announcedForMailing(store: MailingStore, mailing: Mailing): Promise<{ announced: Map<number, Announced>; testMode: boolean } | undefined>`

- [ ] **Step 1: Schrijf de tests.** In `request-file.test.ts`:

```ts
describe('readRequestItems', () => {
  it('reads the addresses of a request back, by seq', async () => {
    const file = await buildRequestFile({ kind: 'check', rows: [row(5, 'Rue de Liège 4')], mailingRef: 'CP-2026-15-C1', mode: 'T', priority: 'NP', ids, now })
    expect(readRequestItems(decodeLatin1(file.bytes)).get(5)).toEqual({ name: 'Anna Vanderstappen', streetHouseBox: 'Rue de Liège 4', postcodeCity: '1020 Brussel' })
  })
})
```

  In `printer-export.test.ts` (volg de opbouw van de bestaande tests, die `parsed` maken en het resultaat met SheetJS teruglezen):

```ts
  it('adds the Mail ID and the address as announced; marks a test', () => {
    const bytes = buildPrinterExport({
      parsed,
      excludedRowNumbers: new Set([3]),
      announced: new Map([[2, { midNum: '90002109818449', address: 'Kerkstraat 1 bus 2, 9300 Aalst' }]]),
      testMode: true,
    })
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(XLSX.read(bytes).Sheets[XLSX.read(bytes).SheetNames[0]])
    expect(rows[0]['Mail ID (TEST, niet drukken)']).toBe('90002109818449')
    expect(rows[0]['Adres zoals aangekondigd']).toBe('Kerkstraat 1 bus 2, 9300 Aalst')
  })

  it('has no extra columns without a submission', () => {
    const bytes = buildPrinterExport({ parsed, excludedRowNumbers: new Set() })
    const header = XLSX.utils.sheet_to_json<string[]>(XLSX.read(bytes).Sheets[XLSX.read(bytes).SheetNames[0]], { header: 1 })[0]
    expect(header).not.toContain('Mail ID')
  })
```

  Pas `parsed` en de rijnummers aan de bestaande `parsed` van dat testbestand aan (rij 2 = eerste adres).

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/core/masspost/request-file.test.ts tests/core/masspost/printer-export.test.ts`. Expected: FAIL.

- [ ] **Step 3: `readRequestItems`** in `request-file.ts`:

```ts
import { parseXml } from '@/lib/xml'
import { COUNTRY_COMP_CODES, UNSTRUCTURED_COMP_CODES } from './mapping'

const FIELD_OF: Record<string, AddressField> = {
  ...Object.fromEntries(Object.entries(UNSTRUCTURED_COMP_CODES).map(([f, c]) => [c, f as AddressField])),
  [COUNTRY_COMP_CODES.isoCode]: 'country',
  [COUNTRY_COMP_CODES.name]: 'country',
}

/**
 * The addresses as they stand in a request file (what bpost got announced), by `seq`.
 * @param xml A MailingRequest (`…_0RQ.XML`), decoded.
 * @returns Address fields per row number.
 */
export function readRequestItems(xml: string): Map<number, Partial<Record<AddressField, string>>> {
  type N = Record<string, unknown>
  const list = (v: unknown): N[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]) as N[]
  const root = (parseXml<N>(xml).MailingRequest ?? {}) as N
  const action = list(root.MailingCreate)[0] ?? list(root.MailingCheck)[0]
  const out = new Map<number, Partial<Record<AddressField, string>>>()
  for (const item of list((action?.Items as N | undefined)?.Item)) {
    const fields: Partial<Record<AddressField, string>> = {}
    for (const comp of list((item.Comps as N | undefined)?.Comp)) {
      const field = FIELD_OF[String(comp['@_code'])]
      if (field) fields[field] = String(comp['@_value'] ?? '')
    }
    out.set(Number(item['@_seq']), fields)
  }
  return out
}
```

- [ ] **Step 4: `buildPrinterExport`.** Breid `PRINTER_EXPORT_COLUMNS` uit met `mid: 'Mail ID'` en `announced: 'Adres zoals aangekondigd'`, en `PrinterExportInput` met:

```ts
  /** After a submission: the Mail ID and the address as announced to bpost, per row number (decisions 45 and 48 of 02/10). */
  announced?: ReadonlyMap<number, Announced>
  /** The submission was Test or Certification: the Mail ID column says "TEST, niet drukken". */
  testMode?: boolean
```

  met `export interface Announced { midNum?: string; address: string }`. Voeg na `seqCol` twee kolommen toe als `input.announced` er is: titel `testMode ? 'Mail ID (TEST, niet drukken)' : 'Mail ID'` en `Adres zoals aangekondigd` (via `uniqueTitle`), en per rij die meegaat de waarden uit `announced.get(rowNumber)` (Mail ID als tekst `t: 's'`, zodat Excel de 14 cijfers niet afrondt). `range.e.c` wordt de laatste kolom. Zonder `announced` blijft alles zoals nu.

- [ ] **Step 5: `exports.ts`.**

```ts
/**
 * The Mail IDs and announced addresses of the last accepted submission, from its files in the store.
 * @param store The mailing store.
 * @param mailing The mailing.
 * @returns Per row number, and whether it was a test; undefined without an accepted submission.
 */
export async function announcedForMailing(
  store: MailingStore,
  mailing: Mailing,
): Promise<{ announced: Map<number, Announced>; testMode: boolean } | undefined> {
  const last = (mailing.exchanges ?? []).findLast((e) => e.kind === 'create' && e.state === 'processed')
  if (!last?.responseFile) return undefined
  const [request, response] = await Promise.all([
    store.getFile(mailing.id, MAILING_FILES_DIR + last.fileName),
    store.getFile(mailing.id, MAILING_FILES_DIR + last.responseFile),
  ])
  if (!request || !response) return undefined
  const read = async (b: Blob) => decodeLatin1(new Uint8Array(await b.arrayBuffer()))
  const items = readRequestItems(await read(request))
  const result = parseBpostResponse(await read(response))
  const mids = new Map(result.kind === 'ack' ? [] : result.items.map((i) => [i.seq, i.midNum]))
  const announced = new Map<number, Announced>()
  for (const [seq, f] of items) {
    announced.set(seq, {
      midNum: mids.get(seq),
      address: [f.name, f.companyDepartment, f.streetHouseBox, f.postcodeCity, f.country].filter(Boolean).join(', '),
    })
  }
  return { announced, testMode: last.mode !== 'P' }
}
```

  `printerFile` krijgt de derde parameter en geeft `announced`/`testMode` door aan `buildPrinterExport`. `savePrinterFileForMailing` roept `announcedForMailing(store, mailing)` aan en geeft het resultaat mee. `printerReady` blijft zoals het is.

  Test in `tests/components/mailing-flow/exports.test.ts`: een `MemoryMailingStore` met een mailing waarvan een `create`-uitwisseling `processed` is, met als bestanden een verzoek gemaakt met `buildRequestFile` (seq 2) en een kopie van `MID_0200_…_260929221652_2RS.XML` waarin `seq="1"` vervangen is door `seq="2"` (enkel de `Location attributeValue` van het eerste item); verwacht `announced.get(2)` met `midNum: '90002109818449'` en `testMode: true` voor modus `T`.

- [ ] **Step 6: Draai de tests.** Run: `npx vitest run tests/core/masspost tests/components/mailing-flow/exports.test.ts`. Expected: PASS.

- [ ] **Step 7: Checkpoint.** Run: `npx tsc --noEmit -p . && npm run docs:build`. Expected: geen fouten.

### Task 15: Het blok Indienen

**Files:**
- Create: `src/components/mailing-flow/SubmitBlock.tsx`
- Modify: `src/components/mailing-flow/AddressCheckStep.tsx`, `src/components/mailings/MailingRow.tsx` (pill Test/Certificatie), `src/components/mailing-flow/mailing-flow.module.css`
- Test: `tests/components/mailing-flow/SubmitBlock.test.tsx` (nieuw), `tests/components/mailings/MailingRow.test.tsx`

**Interfaces:**
- Consumes: `BpostExchange` (taak 11, `send('create', mode)`), `isOpen`, `CheckView` (taak 5), `latestExchange` (taak 6), `isBpostWorkingDay` (`store/mailing.ts`), `savePrinterFileForMailing` (taak 14), `useMailingStore`.
- Produces: `SubmitBlock({ mailing, exchange, view, corrections, today }: { mailing: Mailing; exchange: BpostExchange; view: CheckView; corrections: Corrections; today: string })`

- [ ] **Step 1: Schrijf de tests** in `tests/components/mailing-flow/SubmitBlock.test.tsx` (jsdom; importeer `cleanup, render, screen, within` uit `@testing-library/react` en `afterEach(cleanup)`; mock `next/navigation` en `@/components/mailings/MailingStoreProvider` met `useMailingStore: () => ({ store: new MemoryMailingStore(), user: { email: 'an@x.be' } })`):

```tsx
describe('SubmitBlock', () => {
  const checked = (arr: number, over = {}) =>
    sampleMailing({ status: 'checked', arr, counts: { addresses: 789, formatIssuesOpen: 0 }, expectedDeliveryDate: '2026-10-23', ...over })

  it('is off below 96 %', () => {
    render(<SubmitBlock mailing={checked(93.4)} exchange={exchange()} view={view} corrections={corrections} today="2026-10-13" />)
    expect((screen.getByRole('button', { name: 'Indienen bij bpost' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('warns between 96 and 98 % and about addresses without a solution, but lets you submit in Test', () => {
    const ex = exchange()
    render(<SubmitBlock mailing={checked(97.2)} exchange={ex} view={view} corrections={corrections} today="2026-10-13" />)
    expect(screen.getByText('Vanaf 98 % krijg je extra korting.')).toBeTruthy()
    expect(screen.getByText(/Nog 2 adressen zonder oplossing gaan mee zoals ze zijn, of sluit ze uit/)).toBeTruthy()
    expect((screen.getByRole('radio', { name: 'Test' }) as HTMLInputElement).checked).toBe(true)
    screen.getByRole('button', { name: 'Indienen bij bpost' }).click()
    expect(ex.send).toHaveBeenCalledWith('create', 'T')
  })

  it('asks first for Production, and sends only after "Indienen"', () => {
    const ex = exchange()
    render(<SubmitBlock mailing={checked(99.8)} exchange={ex} view={view} corrections={corrections} today="2026-10-13" />)
    screen.getByRole('radio', { name: 'Productie' }).click()
    screen.getByRole('button', { name: 'Indienen bij bpost' }).click()
    expect(ex.send).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.textContent).toContain('Je dient deze mailing in bij bpost in productie.')
    within(dialog).getByRole('button', { name: 'Indienen' }).click()
    expect(ex.send).toHaveBeenCalledWith('create', 'P')
  })

  it('blocks a delivery date in the past or on a non-working day', () => {
    render(<SubmitBlock mailing={checked(99.8, { expectedDeliveryDate: '2026-10-24' })} exchange={exchange()} view={view} corrections={corrections} today="2026-10-13" />)
    expect(screen.getByText(/Pas de afgiftedatum aan in stap 1/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Indienen bij bpost' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('after an accepted submission: summary, pill Test, printer file and submit again', () => {
    const mailing = checked(99.8, {
      status: 'submitted',
      exchanges: [{ kind: 'create', fileName: 'X_0RQ.XML', mailingRef: 'CP-2026-15', mode: 'T', items: 786, fingerprint: 'cd'.repeat(32), excluded: [], sentAt: '2026-10-13T12:20:00.000Z', sentBy: 'an@x.be', state: 'processed', statusCode: '100', responseFile: 'X_2RS.XML', arr: 99.8 }],
    })
    render(<SubmitBlock mailing={mailing} exchange={exchange({ create: createResult })} view={view} corrections={corrections} today="2026-10-13" />)
    expect(screen.getByText(/Ingediend · Test/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Opslaan voor de drukker/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Opnieuw indienen' })).toBeTruthy()
  })
})
```

  `exchange()`, `corrections` en `sampleMailing` zoals in `AddressCheckStep.test.tsx`; `view` = `groupCheckResult` van het resultaat uit `CheckGroups.test.tsx` (twee open adressen: 58 en 412); `createResult` = `parseBpostResponse` van `MID_0200_…_260929221652_2RS.XML`. 2026-10-24 is een zaterdag.

- [ ] **Step 2: Draai de tests.** Run: `npx vitest run tests/components/mailing-flow/SubmitBlock.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Schrijf `SubmitBlock.tsx`.** Gedrag (spec deel 4, schets v3 stap 6):
  - `id="indienen"` op de sectie (de hoofdknop springt ernaartoe).
  - Samenvatting met pills: adressen die meegaan (`addressesInfo` uit `pill-info.ts`), afgiftedatum (`shortDate` uit `src/components/mailings/labels.ts`), formaat (Klein/Groot), prioriteit (Non-prior/Prior), barcode (Geen/bpost 7/9/11), en een link "Aanpassen in stap 1" (`?stap=gegevens`).
  - `arr = mailing.arr`; `openCount` = aantal unieke `seq` van `view.rows` waarvoor `isOpen(row, corrections.values, corrections.excluded)`.
  - Waarschuwingen (oranje, niet blokkerend; nieuwe klasse `.warn { color: var(--orange); }` in `mailing-flow.module.css`): `96 <= arr < 98` → "Vanaf 98 % krijg je extra korting."; `openCount > 0` → "Nog N adressen zonder oplossing gaan mee zoals ze zijn, of sluit ze uit." (enkelvoud "adres" bij 1); `exchange.changed` → "Je wijzigde de lijst na de laatste controle."
  - Blokkerend: `expectedDeliveryDate < today || !isBpostWorkingDay(expectedDeliveryDate)` → "Pas de afgiftedatum aan in stap 1." (rood, met link); ook `arr === null || arr < 96`, `isWaiting(mailing)` en `exchange.busy` zetten de knop uit.
  - Modus: drie radio's in een `fieldset` met `legend` "Modus": Test (standaard), Certificatie, Productie, met hovertips "Proef: bpost bezorgt niets", "Certificatie bij bpost", "Echt: bpost bezorgt deze mailing".
  - Knop **Indienen bij bpost** (zwart, `styles.primary`). Bij `T`: meteen `exchange.send('create', 'T')`. Bij `C` of `P`: een `role="alertdialog"` met `aria-labelledby`, tekst "Je dient deze mailing in bij bpost in productie." (of "… in certificatie."), knoppen **Indienen** (`send('create', mode)`) en **Annuleren**; Esc sluit, de focus gaat naar **Annuleren** bij openen en terug naar de knop bij sluiten.
  - Na een aanvaarde indiening (`latestExchange(mailing, 'create')?.state === 'processed'`): "Ingediend · Test · 13/10 14:20 · 786 adressen aanvaard, 786 Mail ID's" (aantal Mail ID's = items met `midNum` in `exchange.create`), een pill met de modus (Test/Certificatie; geen pill bij Productie), de knop **Opslaan voor de drukker (.xlsx)** (`savePrinterFileForMailing(store, mailing.id)`, met `store` uit `useMailingStore()`), en **Opnieuw indienen** (toont het formulier weer).
  - Geweigerd (`state === 'rejected'`, `kind === 'create'`): de melding uit taak 11 staat al bovenaan stap 4; het formulier blijft.

- [ ] **Step 4: In `AddressCheckStep`** onder `<CheckGroups>`: `{exchange.check && !waiting && <SubmitBlock mailing={mailing} exchange={exchange} view={exchange.check.view} corrections={corrections} today={new Date().toISOString().slice(0, 10)} />}`. Verwijder in de testsuite van `AddressCheckStep` niets: de bestaande tests blijven gelden.

- [ ] **Step 5: Pill in het overzicht.** Test eerst in `MailingRow.test.tsx`: een samenvatting met `status: 'submitted', submittedMode: 'T'` toont een pill "Test"; met `'P'` geen pill. Implementatie in `MailingRow.tsx` bij de andere pills: `submittedMode === 'T' ? 'Test' : submittedMode === 'C' ? 'Certificatie' : null`, met hovertip "Ingediend in testmodus: bpost bezorgt niets" / "Ingediend in certificatie".

- [ ] **Step 6: Draai de tests.** Run: `npx vitest run tests/components`. Expected: PASS.

- [ ] **Step 7: Checkpoint.** Run: `npx tsc --noEmit -p . && npm run lint:fix`. Expected: geen fouten.

### Task 16: Deel B afronden

**Files:**
- Modify: `docs/documentatie/webapp/adrescontrole.md`, `CHANGELOG.md`, `.agent/plans/INDEX.md`, dit plan en de spec (status)

- [ ] **Step 1: Gebruikersuitleg** aanvullen met "Indienen": de modi (Test, Certificatie, Productie, en dat enkel Productie echt bezorgd wordt), de bevestiging, het bestand voor de drukker met Mail ID en "TEST, niet drukken".

- [ ] **Step 2: `CHANGELOG.md`** onder `## [Unreleased]`: het item van deel A aanvullen (bundelen, geen tweede item): indienen bij bpost in Test, Certificatie of Productie; Mail ID en adres zoals aangekondigd in het bestand voor de drukker; pill Test/Certificatie.

- [ ] **Step 3: DoD.** Run: `npm run lint:fix && npx tsc --noEmit && npm test && npm run docs:build`. Expected: alles groen.

- [ ] **Step 4: Ronde met bpost in Test (met Mark):** indienen in Test, het antwoord terugzetten, Ingediend met de pill, het bestand voor de drukker (vang de download op met `HTMLAnchorElement.prototype.click`) met de Mail ID's. Geen Certificatie of Productie zonder uitdrukkelijke vraag van Mark.

- [ ] **Step 5: Plannen en Linear.** Status "gebouwd, wacht op review van Mark" in de spec, dit plan en `INDEX.md`; zet SR-130 in Linear op **In review** (niet sluiten).

- [ ] **Step 6: Commit, enkel na "je mag committen".**

```bash
git add -A -- . ':!docs/internal/e-masspost'
git commit -m "feat: indienen bij bpost in stap 4, Mail ID in het bestand voor de drukker (SR-130 deel B)"
```

  Daarna `npm run docs:check`. Pushen enkel als Mark het vraagt.
