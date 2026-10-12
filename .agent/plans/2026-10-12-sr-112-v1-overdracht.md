# SR-112 v1: overdracht aan de volgende agent

*Sonic Rocket · 12 oktober 2026 · status: v1 gebouwd en gecommit op `develop` (niet gepusht), wacht op review van Mark*

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
- **Database**: `tenant_preferences` kreeg 5 kolommen (`drizzle/0005_tenant_preferences_defaults.sql`, door Mark uitgevoerd op Neon).
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
2. **Bestandsformaten** (Q-014 in `docs/projectdossier/open-vragen.md`): voorstel aan Mark was .ods en .xlsm meteen (SheetJS leest ze al), CSV pas na antwoord van Contrapunt, met herkenning van scheidingsteken (`;` of `,`) en tekenset (Windows-1252 of UTF-8). Nog niet beslist.
3. **Mijlpaal 2** (apart plan maken met `superpowers:brainstorming` → spec → `writing-plans`): `DriveMailingStore`, Google Identity Services, login per Workspace-domein en `tenant:add`, overzetten van IndexedDB naar Drive. Mark moet in Google Cloud de Drive API en de toestemming `drive` zetten en een gedeelde drive maken in `sonicrocket.be`.
4. **Uitgestelde kleine punten** uit de review: codevoorstel kan blijven hangen op een code van een onleesbare mailing; in dev wordt bij openen één keer extra bewaard (StrictMode); verkeerde tekst bij een lijst met enkel onleesbare mailings; geen try/catch bij archiveren en ongedaan maken; volle opslag toont de melding over het privévenster; correcties van minder dan 2 s gaan verloren bij herladen; wachtwoordveld blijft verplicht na de eerste bewaring tot herladen; mogelijke doorverwijslus zonder tenant; instellingen twee keer opgehaald per pagina (`cache()`); toegankelijkheid (rol van plaatshouders in menu's, pijltjestoetsen in het menu van een mailing, focus in het paneel); `ENCRYPTION_KEY` niet via `env.ts` en geen `server-only` in `settings.ts`; na een mislukt tweede bestand blijft "Verder" actief voor het vorige; geen `error.tsx` onder `(app)`.
5. `npm run check:hardcoded` faalt op een commentaarregel die al bestond in `src/lib/oauth/resource-url.ts`.
6. De submodule `docs/internal/e-masspost` heeft lokale wijzigingen die niet bij dit werk horen; niet mee committen.
