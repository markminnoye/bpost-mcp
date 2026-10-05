# Website

De webapp is een Next.js-app (App Router) in `src/app/`. Ze is in alfa; de flows voor het indienen van mailinglijsten en een projectoverzicht bestaan nog niet. Het ontwerp ervan staat onder [Geplande flow voor mailings](#geplande-flow-voor-mailings-ontwerp).

## Pagina's

| Pad | Bestand | Wat |
|---|---|---|
| `/` | `src/app/page.tsx` | Startpagina |
| `/dashboard` | `src/app/dashboard/page.tsx` | Accountinstellingen: bpost-gegevens, barcode-instellingen, app-tokens. Vereist aanmelding |
| `/install` | `src/app/install/page.tsx` | Installatie-instructies voor de AI-assistent |
| `/reference` | `src/app/reference/page.tsx` | Statische transparantiepagina met tool- en instructieteksten (`src/generated/tool-registry.json`) |
| `/masspost/poc` | `src/app/(tools)/masspost/poc/page.tsx` | Proefversie (POC) van stap 1 tot 3 van de flow: Excel inlezen, kolommen koppelen, formaatvalidatie. Alles draait in de browser, zonder login, zonder opslag en zonder aanvraag met adressen. `noindex`. Zie [POC formaatvalidatie](#poc-formaatvalidatie) |

## POC formaatvalidatie

Een proef van de eerste drie stappen, gebouwd op de schets `docs/ontwerp/webapp/formaatvalidatie.html` (besluiten 22 tot 42 in `.agent/plans/2026-10-02-masspost-web-flow-design.md`). Het architectuurmodel ligt daarmee niet vast: de formaatvalidatie draait in elk model in de browser.

- **Inlezen:** `parseExcelAddresses` (SheetJS, ADR 0005) op de main thread, geladen met een dynamische `import()`. Leest .xlsx en .xls. Normale grens 25.000 adressen; tot 150.000 met een waarschuwing, om te meten (besluit 43).
- **Regels:** `format-check.ts` (`checkFieldValue`, `proposeFieldValue`, `findFormatIssues`, `missingTargets`). Dezelfde functies controleren live tijdens het aanpassen. De klantenpagina met de regels staat in de groep Documentatie (Webapp, Formaatvalidatie); een test houdt ze gelijk met `CHARACTER_REPLACEMENTS` en `ABBREVIATIONS`.
- **Clientcode** importeert de modules rechtstreeks (`excel`, `mapping`, `suggest-mapping`, `format-check`), nooit `src/core/masspost/index.ts`: die trekt FTP en Node-code mee.
- **Stijl:** een CSS-module (`poc.module.css`) met de tokens van de schets, licht en donker. Geen Tailwind of shadcn.
- **Bekende indeling:** `suggestColumnMapping` meldt `preset: 'aft'` voor de Address File Tool. Een vaste export van Contrapunt bestaat niet (besluit 50). Zijn de adreskolommen gevuld, dan slaat de POC het koppelen over; zonder formaatfouten gaat hij meteen naar stap 4.
- **Pills** (besluit 46): `MetaPills.tsx`, een icoon met een getal en de uitleg als tooltip en als tekst voor schermlezers.
- **Koppelen:** de rol Land (Comp 17/18, enkel buiten België), een profiel per kolom bij een klik, een sjabloon-envelop met de volgorde per vak (`columnOrder`), en voorbeeldenveloppen per soort adres (`addressKinds`, eerste 20.000 rijen).
- **Stap 4:** "Opslaan voor bpost (AFT, .xls)" via `buildAftExport` (besluit 57), met de verbeteringen en zonder uitgesloten rijen. "Opslaan voor de drukker" via `buildPrinterExport` (besluiten 48 en 49): het oorspronkelijke eerste werkblad met de kolommen *Meesturen* en *Volgnummer bpost*. De `seq` is het rijnummer (`findFormatIssues` en `mapRows` met `rowNumbers`).
- **Meting:** het paneel "Meting (POC)" onderaan toont de tijd per stap en het geheugen (Chrome), en kopieert ze als JSON. De resultaten staan in [Schaal en limieten](schaal-en-limieten.md).
- **Link naar de regels:** `NEXT_PUBLIC_DOCS_URL` (de GitBook-site). Zonder die variabele verdwijnt de link.

**Losstaand bestand.** `npm run build:poc` bundelt dezelfde componenten met esbuild tot `dist/masspost-poc.html` (±0,6 MB, alles inline). Dat bestand werkt offline vanaf `file://`, handig om bij Contrapunt te testen zonder deploy.

**Testlijsten.** `npm run generate:large-xlsx -- --rows 35000 --out tmp/adressen-35000.xlsx` maakt een verzonnen lijst in de indeling van Contrapunt, met ±3 % bewuste formaatfouten. Eindigt `--out` op `.xls`, dan schrijft het Excel 97-2003 (maximaal 65.535 rijen).

## Aanmelden

Auth.js (NextAuth v5) met één provider, Google (`src/lib/auth.ts`).
- Het sessiebeheer gaat via de Drizzle-adapter naar Neon Postgres.
- Bij de eerste aanmelding (`createUser`) wordt een tenant aangemaakt en aan de gebruiker gekoppeld. Heeft een bestaande gebruiker er nog geen, dan gebeurt dat bij `signIn`.
- Routes: `/api/auth/*` (extern beheerd door Auth.js, niet in de OpenAPI-spec).
- Zonder sessie stuurt `/dashboard` door naar `/api/auth/signin?callbackUrl=/dashboard`.

## Lokaal draaien

```bash
npm ci
cp .env.example .env.local   # waarden invullen, zie Hosting en omgevingsvariabelen
npm run dev
```

Het dashboard bewaart het bpost-wachtwoord versleuteld (AES-256-GCM, `ENCRYPTION_KEY`).

## Geplande flow voor mailings (ontwerp)

Ontwerp van 2 oktober 2026, nog niet gebouwd. De library en de API komen eerst, deze schermen daarna. Het ontwerp gaat uit van het Centraal model: de adressen staan in onze database. Die keuze is nog open, zie [Architectuurmodellen](architectuurmodellen.md).

Een mailing doorloopt vijf stappen. Elke stap heeft een eigen icoon, dat de gebruiker ook in het overzicht ziet. De kleur van een vak toont wie aan zet is.

![Flow van een mailing in vijf stappen: opladen, koppelen, formaatvalidatie, adrescontrole en indienen, gevolgd door de afronding](afbeeldingen/masspost-flow.svg)

1. **Importeren** (vroeger "Opladen"): een .xlsx-bestand, normaal tot 25.000 adressen (op termijn meer, besluit 43). De server leest het in het geheugen in en zet alle kolommen in de database. Het bestand zelf wordt niet bewaard.
2. **Koppelen:** elke kolom krijgt een rol: adres, context (bewaren en tonen bij het corrigeren) of niet bewaren. De indeling van de Address File Tool (AFT) wordt herkend.
3. **Formaatvalidatie:** de rijen worden nagekeken op de regels van bpost: tekens, lengte van de velden, verplichte velden en gekoppelde kolommen. Per formaatfout komt een voorstel dat de gebruiker bevestigt of aanpast. Zonder formaatfouten gaat de mailing vanzelf verder. Op het scherm staat onder de titel: "Voldoet je lijst aan de regels van bpost? We kijken de tekens, de lengte van elk veld, de verplichte velden en de gekoppelde kolommen na."
4. **Adrescontrole:** een `MailingCheck` bij bpost. Onder 96 % is een nieuwe controle verplicht, tussen 96 en 98 % volgt een waarschuwing.
5. **Indienen:** een `MailingCreate`. Daarna ligt alles vast; wijzigen kan enkel door in te trekken en opnieuw in te dienen.

Na de deposit, die buiten de app in het bpost-portaal gebeurt, markeert een gebruiker de mailing als afgegeven. 30 dagen later worden de adressen gewist. Het logboek blijft bewaard.

![Toestanden van een mailing, van wordt ingelezen tot adressen gewist, met een zijtak voor intrekken](afbeeldingen/masspost-toestanden.svg)

Een toestand wisselt enkel na een bevestigd feit, zoals een geslaagde upload of een antwoord van bpost. Mislukt iets aan onze kant, dan blijft de toestand staan en verschijnt er een foutmelding. Weigert bpost de indiening (Status 998 of 999), dan gaat de mailing terug naar Gecontroleerd. Voor de gebruiker vallen de toestanden samen tot drie statussen: wachten, actie nodig en klaar.
