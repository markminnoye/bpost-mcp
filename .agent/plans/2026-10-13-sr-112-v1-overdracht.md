# SR-112 v1: overdracht (2)

*Sonic Rocket · 13 oktober 2026 · status: v1 af en getest, 14 commits op `develop`, niet gepusht. Vervangt [2026-10-12-sr-112-v1-overdracht.md](2026-10-12-sr-112-v1-overdracht.md) (die blijft als logboek van de reviewrondes).*

Dit is de prompt voor de agent die overneemt. Kopieer alles onder de lijn.

---

Je neemt het werk over aan de webapp van **bpost-mcp** (Next.js 16 App Router, React 19, TypeScript, Zod 4, Vitest; repo `/Users/markminnoye/git/bpost-mcp`, branch `develop`). Lees eerst `AGENTS.md`: library eerst en dan de interface, Vlaamse klantteksten (`.agent/prompts/customer-facing-agent.md`), `CHANGELOG.md` bijwerken onder `[Unreleased]`, en de DoD (`npm run lint:fix`, `npx tsc --noEmit`, `npm test`; bij een wijziging in `src/core/masspost/` ook `npm run docs:build`, en `npm run docs:check` na de commit).

## Werkafspraken met Mark

- **Eén commit op het einde** van een batch; Mark zegt "je mag committen". **Pushen enkel als Mark het vraagt.**
- **Architectuur- en ontwerpbeslissingen neemt Mark.** Leg opties voor met één aanbeveling. Bij twijfel over wat hij bedoelt: vraag het, raad niet (bv. "1/3" bij het statusicoon bleek "gebruik het oude ontwerp").
- Kort en in het Vlaams antwoorden. "kk" = ok. Hij zegt "GDPR", niet "AVG".
- Een GitHub-issue sluit je niet: zet het op **In review**. Werk in Linear gebeurt onder SR-112 (de Linear-MCP werkt).
- Wijzigingen aan de gedeelde Neon-database voert Mark zelf uit; geef hem de SQL. Bewaar niets via Instellingen in de app: dat schrijft naar die gedeelde database.
- De submodule `docs/internal/e-masspost` heeft lokale wijzigingen die niet bij dit werk horen: nooit mee committen (`git add -A -- . ':!docs/internal/e-masspost'`).

## Lees in deze volgorde

1. `.agent/plans/2026-10-11-sr-112-webapp-shell-design.md`: het ontwerp van SR-112 (27 besluiten).
2. `.agent/plans/2026-10-12-sr-112-v1-design.md`: de spec van v1, met mijlpaal 2 en de "brievenbus" naar bpost.
3. `.agent/plans/2026-10-12-sr-112-v1-overdracht.md`: de reviewrondes van 12 en 13 oktober, in volgorde (wat Mark vroeg en wat er gebouwd is).
4. Ontwerpen in `docs/ontwerp/webapp/`: `app-shell.html`, `statusiconen.html` (bijgewerkt 13/10), `adrescontrole.html` (stap 4, nog te bouwen), `formaatvalidatie.html`.
5. ADR's `docs/adr/0007`–`0009`.

## Stand

**Commits sinds `origin/develop`** (oud naar nieuw): `16f0470` v1 · `01aa749` reviewronde 1 · `7299917` opruimronde · `9eaf69e` stap 1 in de flow · `3e65c07` testronde · `4f6c781` stap 1 begint met de adreslijst · `65b54e6` uitleg bij de velden · `d81a3a5` werkdag, Instellingen, tips · `68bc527` status voor de titel, wieltje · `c9f52b4` / `548765f` / `88b8c11` statusicoon · `69a9911` rustiger stappen · `5809934` Koppelen bewaart vanzelf. 583 tests groen.

**Wat de app nu doet** (alles in `src/components/`, library in `src/core/masspost/`):
- **Opslag:** `IndexedDbMailingStore` (één database per tenant). Wat nog niet bewaard is, staat ook meteen in `sessionStorage` (`restoreUnsavedChange` in `useMailingSaver.ts`), want een IndexedDB-schrijfactie tijdens herladen raakt niet af.
- **Bewaren:** elke stap bewaart vanzelf via `useMailingSaver` (2 s na een wijziging, meteen bij een stapwissel of als je weggaat). Wachtende velden hebben een volgnummer; een nieuwere wijziging tijdens een bewaring blijft staan.
- **Stap 1** (`ImportStep` voor een nieuwe mailing, `DetailsStep` binnen de flow voor een bestaande, gedeeld formulier `DetailsForm`): eerst enkel het sleepvak in het midden; na het inlezen de gegevens, met het bestand eronder. Hovertip per veld (`FieldLabel`, teksten in `field-tips.ts`), meldingen onder het veld (`FieldError`). Afgiftedatum: werkdag (`isBpostWorkingDay`: ma–vr, geen Belgische feestdag).
- **Koppelen:** bewaart vanzelf (status `mapped`, of `uploaded` als een verplicht vak leeg is). Wat ontbreekt, staat rood op de envelop. Een nieuwe formaatvalidatie houdt de correcties van vakken waarvan de kolommen niet veranderden (`keepCorrections`), en de uitsluitingen.
- **Kop van een mailing:** statusicoon (`StatusIcon`, de bewaarde status, niet de stap op het scherm), titel en code, rechts de knop "Verder naar …" (`NextButton` via `StepAction`, een portal). Daaronder de stappenbalk zonder iconen, rechts de pills. Geen menu "…" meer op die pagina (archiveren via het overzicht, gegevens via stap 1).
- **Instellingen:** uitleg per veld, sterretjes, meldingen onder het veld; acties geven `fields` en `values` terug.
- **Overzicht:** hele rij klikbaar, Tab per rij en ↑ ↓, tooltips in de stijl van de app.

## Ontwerpregels van Mark (12–13/10)

- **Statusicoon** = `docs/ontwerp/webapp/statusiconen.html` (02/10): grijs leeg (opgeladen), ¼ geel (gekoppeld), ½ geel (formaatvalidatie, ook als ze in orde is), ¾ in de kleur van de ARR (gecontroleerd), vol met vinkje of uitroepteken (ingediend, datum voorbij, afgerond). Aangevuld: grijze **stippelcirkel** = nieuwe mailing, nog niet bewaard; **kruisje** = ingetrokken. Nooit zwart. Toont altijd de bewaarde status, verspringt niet met de stap.
- **Stappenbalk:** geen iconen, geen lijn eronder, geen titel onder de balk. Het balkje onder een stap: geel = iets te doen, groen = in orde, accentkleur = huidige stap zonder status. Vaste breedte 720 px.
- **"Verder naar …"**: in elke stap, rechts op de lijn van de titel, met een pijltje rechts; uit tot de stap in orde is; tijdens het werk een wieltje en "Bezig…" (blijft, op vraag van Mark).
- **Meldingen** over wat ontbreekt: in het rood onder het veld (rode rand), zoals bij Formaatvalidatie; geen zin bovenaan.
- **Tooltips:** één definitie in `app-shell/app.module.css` (boven, rechts uitgelijnd; in de zijbalk rechts; `.tipStart`, `.tipBelow` als variant). Browsertips (`title`) enkel voor afgekapte tekst.
- **Eén paginabreedte** (1120 px) voor alle schermen.
- **Iconen:** pijl naar beneden bij opslaan van bestanden, `IconReplace` bij "Ander bestand kiezen".
- **Kalender:** blijft de kalender van de browser (geen eigen kalender).
- Witruimte 40 px boven, 48 px opzij; accentkleur `--accent` = kleur van de hoofdknop.

## Volgende stappen

1. **Wachten op Mark:** pushen naar `develop` (dan komt v1 op de preview-site). Daarna SR-112 in Linear op **In review**, met de acceptatiecriteria herschreven: "enkel client-side, geen database" wordt het Drive-model (v1 in de browser), en "genummerde stappen op een verticale lijn" wordt de horizontale stappenbalk; "geen impact op de AFT-flow (SR-80)" is getest op 13/10.
2. **Te bevestigen bij bpost of Contrapunt:** zijn zaterdagen werkdagen voor een afgifte? (De gids noemt enkel MPW-1043.) Pas `isBpostWorkingDay` aan als dat zo is.
3. **Ligt bij Mark:** de reset `font: inherit` op knoppen in de shell weegt zwaarder dan één klasse; rechtzetten met `:where()` maakt alle knoppen in de flow 12 px. Niet aangepast.
4. **SR-124** (Linear): het AI-voorstel bij Koppelen kiest slecht tussen "Tonen bij het verbeteren" en "Niet gebruiken".
5. **Stap 4, Adrescontrole (SR-80):** bouwen volgens `docs/ontwerp/webapp/adrescontrole.html` en de "brievenbus" uit de v1-spec. Eerst brainstormen met Mark.
6. **Mijlpaal 2:** `DriveMailingStore`, Google Identity Services, login per Workspace-domein, `tenant:add`, overzetten van IndexedDB naar Drive. Mark moet eerst de Drive API en de toestemming `drive` instellen in Google Cloud, en een gedeelde drive maken in `sonicrocket.be`.
7. **CSV (Q-014):** pas na het antwoord van Contrapunt. .xlsm en .ods werken al.

## Praktisch

- **Dev-server:** draait in de terminaltab "dev server" (`npm run dev`, poort 3000; de Google-login heeft poort 3000 nodig). Een server die je met `preview_start` start, stopt aan het einde van je beurt.
- **Testen in de browser van het paneel:** daar ben je al aangemeld. Testdata in IndexedDB van dat paneel: MM-2026-1, MM-2026-2 en SR-2026-1 zijn testmailings; **MM-2026-3 is van Mark, niet aanpassen**. Een bestand opladen kan via een kleine CORS-server op `127.0.0.1:8799` die `docs/samples/contrapunt/` serveert (script in je kladmap), en dan `DataTransfer` op de `input[type=file]`. Download geen bestanden zonder akkoord; vang `HTMLAnchorElement.prototype.click` op om exports na te kijken.
- **Valkuilen:**
  - StrictMode voert effecten twee keer uit: vergelijk met de laatst gemelde stand, geen "eerste keer"-vlag.
  - Componenttests: `// @vitest-environment jsdom`, mock `next/navigation` en `@/components/app-shell/actions` (next-auth). `toBeDisabled` bestaat niet (geen jest-dom).
  - Het project gebruikt geen Prettier; zet de inspringing zelf recht. Geen `eslint-disable react-hooks/...`: gebruik een ref.
  - `timeout` bestaat niet op macOS: `perl -e 'alarm 120; exec @ARGV' npx vitest run …`.
  - Testgegevens gebruiken een werkdag als afgiftedatum (`2026-10-23`).
