# SR-112 v1: overdracht aan de volgende agent

*Sonic Rocket · 12 oktober 2026 · status: v1 gecommit op `develop` als `16f0470` (niet gepusht); eerste reviewronde van Mark verwerkt (zie onderaan), nog niet gecommit*

Dit is de prompt voor een agent die het werk overneemt. Kopieer alles onder de lijn.

---

Je neemt het werk over aan de webapp van **bpost-mcp** (Next.js 16 App Router, React 19, TypeScript, Zod 4, Vitest; repo `/Users/markminnoye/git/bpost-mcp`, branch `develop`). Lees eerst `AGENTS.md`: library eerst en dan de interface, Vlaamse klantteksten (`.agent/prompts/customer-facing-agent.md`), `CHANGELOG.md` bijwerken onder `[Unreleased]`, en de DoD (`npm run lint:fix`, `npx tsc --noEmit`, `npm test`).

## Werkafspraken met Mark

- **Eén commit op het einde** van een batch, geen tussentijdse commits. Pushen enkel als Mark het vraagt.
- **Architectuurbeslissingen neemt Mark.** Leg opties voor met een aanbeveling, beslis niet zelf.
- Mark zegt "GDPR", niet "AVG". Hij schrijft kort ("kk" = ok) en verwacht korte, concrete antwoorden in het Vlaams.
- Een GitHub-issue sluit je niet: zet het op **In review**. Werk in Linear gebeurt onder SR-112.
- Wijzigingen aan de gedeelde Neon-database voert Mark zelf uit; geef hem de SQL.

## Lees in deze volgorde

1. `.agent/plans/2026-10-11-sr-112-webapp-shell-design.md`: het ontwerp van SR-112 met de 27 besluiten. Opslag op een gedeelde Google Drive, login per Workspace-domein, de shell in GitHub-stijl.
2. `.agent/plans/2026-10-12-sr-112-v1-design.md`: de spec van **v1** (wat nu gebouwd is). Bevat ook de mijlpaal 2 en de brievenbus naar bpost (`bpost-e-masspost/_io/requests|responses`, 1-op-1 met de FTP).
3. `.agent/plans/2026-10-12-sr-112-v1-implementatie.md`: het plan in 11 taken (uitgevoerd).
4. ADR's `docs/adr/0007` (mailings op de gedeelde drive), `0008` (Drive-token via de browser, voorlopig), `0009` (tenant = Workspace-domein).
5. De schets `docs/ontwerp/webapp/app-shell.html` (open in de browser; rechtsonder schakel je tussen schermen).

## Wat er staat (v1)

- **Library** `src/core/masspost/store/`: Zod-schema van `mailing.json`, sortering, codes (`nextMailingCode`), regels voor presortering en ronde/sequentie, `MailingStore` met `MemoryMailingStore` en `IndexedDbMailingStore` (één database per tenant, `bpost-e-masspost:<tenantId>`), revisiecontrole (`RevisionConflictError`). Contracttest in `tests/core/masspost/store/mailing-store-contract.ts` voor elke store.
- **Routes** `src/app/(app)/` achter de login: `/mailings`, `/mailings/nieuw`, `/mailings/[code]` (`?stap=gegevens`), `/archief`, `/deposits` (plaatshouder), `/instellingen`. `/` is de landingspagina met enkel "Aanmelden met Google".
- **Componenten**: `src/components/app-shell/` (zijbalk, `tokens.css` met o.a. `--accent` = kleur van de hoofdknop, `app.module.css` vertaald uit de schets), `src/components/mailings/`, `src/components/mailing-flow/` (de vroegere POC: `MailingFlow`, `ImportStep`, `FileDrop`, `useMailingSaver`, `useLeaveGuard`, `resume.ts`), `src/components/settings/`.
- **Opslaan voor de drukker** staat ook in het menu **…** van een mailing in het overzicht (Mark, 12/10), pas actief als de formaatvalidatie in orde is. Stap 4 en het menu delen `src/components/mailing-flow/exports.ts`.
- **Database**: `tenant_preferences` kreeg 5 kolommen (`drizzle/0005_tenant_preferences_defaults.sql`, door Mark uitgevoerd op Neon, bevestigd 12/10).
- **Weg**: `/masspost/poc`, `/dashboard` (app-tokens maak je niet meer in de UI; bestaande blijven werken), de oude home, `npm run build:poc`. De MCP-login zonder bpost-gegevens stuurt naar `/`.
- **Componenttests** draaien met `// @vitest-environment jsdom` en `@testing-library/react`. `timeout` bestaat niet op macOS: gebruik `perl -e 'alarm 120; exec @ARGV' npx vitest run …` als een test kan blijven hangen.

## Ontwerpregels die Mark tijdens de review vastlegde

- **Stappenbalk**: het icoon is zwart, en groen zodra de stap klaar is voor de volgende. Het streepje eronder: geel als er iets te doen is, groen als de stap in orde is, en de accentkleur voor de huidige stap zonder status. Stap 1 volgt dezelfde regels als Koppelen. De balk heeft een vaste breedte (720 px), zodat de stappen in elke stap even breed zijn.
- **Accentkleur** (`--accent`) = de kleur van de hoofdknop. Ook het streepje bij het actieve item in de zijbalk.
- **Stap 1** heeft dezelfde opbouw als de andere stappen: titel en code van de mailing bovenaan (grijze plaatshouder "Nieuwe mailing" zolang er geen titel is), de stappenbalk, en dan de kop "Importeren" met "Verder naar koppelen" rechts.
- **Witruimte** rond de inhoud: 40 px boven, 48 px opzij.
- **Plaatshouders** voor wat nog komt: gedempt, label "binnenkort", niet klikbaar.
- Landingspagina: "Adreslijsten controleren en mailings voorbereiden voor bpost."

## Open punten en volgende stappen

1. **Review van Mark** van v1; daarna SR-112 in Linear op In review en de acceptatiecriteria bijwerken (zie "SR-112 bijwerken" in het SR-112-plan).
2. **Bestandsformaten** (Q-014 in `docs/projectdossier/open-vragen.md`): .ods en .xlsm gebouwd (Mark, 12/10). CSV pas na antwoord van Contrapunt, met herkenning van scheidingsteken (`;` of `,`) en tekenset (Windows-1252 of UTF-8).
3. **Mijlpaal 2** (apart plan maken met `superpowers:brainstorming` → spec → `writing-plans`): `DriveMailingStore`, Google Identity Services, login per Workspace-domein en `tenant:add`, overzetten van IndexedDB naar Drive. Mark moet in Google Cloud de Drive API en de toestemming `drive` zetten en een gedeelde drive maken in `sonicrocket.be`.
4. **Uitgestelde kleine punten** (✅ opgelost 12/10, zie "Opruimronde" onderaan) uit de review: codevoorstel kan blijven hangen op een code van een onleesbare mailing; in dev wordt bij openen één keer extra bewaard (StrictMode); verkeerde tekst bij een lijst met enkel onleesbare mailings; geen try/catch bij archiveren en ongedaan maken; volle opslag toont de melding over het privévenster; correcties van minder dan 2 s gaan verloren bij herladen; wachtwoordveld blijft verplicht na de eerste bewaring tot herladen; mogelijke doorverwijslus zonder tenant; instellingen twee keer opgehaald per pagina (`cache()`); toegankelijkheid (rol van plaatshouders in menu's, pijltjestoetsen in het menu van een mailing, focus in het paneel); `ENCRYPTION_KEY` niet via `env.ts` en geen `server-only` in `settings.ts`; na een mislukt tweede bestand blijft "Verder" actief voor het vorige; geen `error.tsx` onder `(app)`.
5. ✅ `npm run check:hardcoded` slaagt weer (commentaar in `src/lib/oauth/resource-url.ts` herschreven).
6. De submodule `docs/internal/e-masspost` heeft lokale wijzigingen die niet bij dit werk horen; niet mee committen.

## Reviewronde 1 (Mark, 12/10), verwerkt

- Lijst: de hele rij opent de mailing; met Tab krijgt de rij de focus (via de titellink), daarna het menu "…"; ↑ ↓ gaan naar de vorige of volgende rij. Weergaveknoppen omgewisseld (twee regels, dan één).
- Tooltips: één definitie in `app.module.css` (boven, rechts uitgelijnd, met omloop; in de zijbalk rechts). Voordien golden in de flow twee regels tegelijk en opende elke tooltip rechts, buiten beeld.
- Stapkoppen: 40 px tussen uitleg en knop (12 px op een smal scherm).
- Formaatvalidatie: "Voorstel overnemen" staat rechts, op de plaats van ongedaan maken. Op een smal scherm overlappen ongedaan maken en uitsluiten niet meer.
- Stap 4: een uitgeschakelde "Verder naar indienen" (hovertip "Komt later") in plaats van "Terug naar de formaatfouten".
- Eén breedte (1120 px) voor alle schermen in de rechterkolom.
- Stappenbalk: alle labels 13 px (de knoppen kregen 14 px via de reset `font: inherit` in de shell, waardoor de tekst versprong). Let op: die reset weegt zwaarder dan één klasse; een `:where()`-versie zou ook alle knoppen in de flow naar 12 px zetten, dus bewust niet aangepast.
- Weergaveknoppen: de gekozen weergave is de lichte knop (`--surface-2`), de andere grijs zoals de kop.
- .xlsm en .ods (library `address-file.ts`).
- `suppressHydrationWarning` op `<html>` (attributen van browserextensies, bv. Scribe).
- AI-voorstel bij Koppelen: ticket [SR-124](https://linear.app/sonicrocket/issue/SR-124).
- Stap 4 (Adrescontrole): het ontwerp bestaat al, `docs/ontwerp/webapp/adrescontrole.html` (Mark, 12/10). Basis voor SR-80.

## Opruimronde (12/10), verwerkt

Alle punten van "Uitgestelde kleine punten" hierboven. Bewust beperkt:
- `ENCRYPTION_KEY` staat in `env.ts` (optioneel), maar `src/lib/tenant/get-credentials.ts` en `resolve.ts` (MCP, gepauzeerd) lezen nog `process.env`: hun tests zetten de sleutel pas tijdens het draaien.
- De reset `font: inherit` op knoppen in de shell weegt zwaarder dan één klasse. Een `:where()`-versie zou de knoppen in de flow 12 px maken; niet aangepast zonder akkoord van Mark.
- `server-only` is een nieuwe dependency (`src/lib/tenant/settings.ts`).
