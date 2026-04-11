# Customer-facing copy & UX (AI agent instructions)

**Scope:** Gebruik deze instructies **alleen** wanneer je werkt aan **klantgerichte** oppervlakken: UI-teksten, foutmeldingen voor eindgebruikers, onboarding, e-mails, help-teksten, lege staten, knoppen, tooltips, en elke string die een **niet-technische** gebruiker ziet.

**Niet** van toepassing op: MCP-toolbeschrijvingen, API-docs, developer-README, logs, typefouten in codecomments tenzij expliciet user-facing.

---

## Doelgroep

- Gewone gebruiker: **geen** IT-achtergrond verwacht.
- De gebruiker denkt in **taken en uitkomsten** (mailing klaarzetten, adressen laten controleren), niet in stappen van een systeem.

## Taal

- Schrijf in **Belgisch-Nederlands (Vlaams)**: gangbare woordkeuze en toon in Vlaanderen.
- Vermijd typisch **Nederlands-Nederlands** idioom, uitdrukkingen en woorden die in Vlaanderen ongewoon of onnatuurlijk zijn.
- Spelling: **AN / Groene Boekje**; **woordkeuze en idioom** blijven Vlaams-Belgisch.

## Wat je **niet** in gebruikersteksten zet

Geen interne of ontwikkelaarstaal, tenzij de gebruiker er expliciet om vraagt:

- Namen van tools, protocollen of frameworks (MCP, Zod, Redis, batch-ID, UNMAPPED/MAPPED, enz.)
- “Uploadinstructies”, “headers”, “mapping”, “validatie” als vakjargon zonder uitleg in mensentaal
- Terminal/commandoregel als **enige** optie zonder eenvoudige uitleg of alternatief waar de UI dat toelaat

Vertaal naar begrijpelijk Nederlands, bv. “controleren op de regels van bpost”, “je adreslijst”, “er ontbreekt nog iets bij dit adres”.

## Toon en structuur

- Kort, concreet, geruststellend waar passend.
- Eerst **wat het betekent voor de gebruiker**, dan eventueel **wat hij nu kan doen** (één duidelijke vervolgstap).
- Geen opsomming van interne pijplijnstappen in antwoorden aan de eindgebruiker.

## Technische juistheid (twee lagen)

- **User-facing strings:** menselijk, Vlaams, taakgericht.
- **Code / API / MCP:** blijft technisch correct; koppel geen verkeerde domeintermen aan de gebruiker.

## Afstemming met de visie

Zie `@docs/internal/vision.md`: intelligente assistent, fouten in **mensentaal**, proactief oplossen waar mogelijk — zonder de gebruiker het platform te laten “leren kennen”.

---

*Bestand bedoeld om te **@‑verwijzen** in de agentcontext wanneer je aan customer-facing code werkt; niet automatisch laden bij elke taak.*
