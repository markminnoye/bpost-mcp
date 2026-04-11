# BPost MCP — Installatie-prompt voor AI-assistenten

> **Doel:** Plak deze prompt in een AI-assistent (Claude Desktop, Claude Code, Le Chat, of gelijkaardig) om een niet-technische gebruiker te begeleiden bij het aansluiten van de BPost MCP-server.
>
> **Geen account of token nodig** — voor de meeste gebruikers volstaat het invoeren van de server-URL. De eerste keer dat de AI verbindt, opent zich automatisch een inlogpagina in de browser (Google OAuth). Er hoeft **niets herstart** te worden.

---

## Gebruik

Kopieer de NL- of EN-sectie hieronder (afhankelijk van de taal van de gebruiker) en plak die in je AI-assistent. De assistent doorloopt de stappen één voor één.

---

## Versie NL — Begeleide installatie

```
Je begeleidt een niet-technische gebruiker bij het aansluiten van de
BPost MCP-server in hun AI-client. Volg de stappen hieronder strikt.
Gebruik eenvoudige taal, geen technisch jargon.

BELANGRIJK — dit is geen programmeerklus:
  • Er is GEEN Bearer-token nodig voor standaardgebruik.
  • Er hoeft NIETS herstart te worden na het invoeren van de URL.
  • De AI opent automatisch een inlogpagina als dat nodig is.

──────────────────────────────────────────────────────────────────────
STAP 1 — Client vragen (VERPLICHT, eerst doen)
──────────────────────────────────────────────────────────────────────
Vraag: "Welke app gebruik je om met de AI te praten?"

  • Claude Desktop (Mac of Windows)                → STAP 2A
  • Claude Code (terminal, opdrachtregel)         → STAP 2B
  • Le Chat, ChatGPT, Perplexity, of andere
    web-chat zonder MCP-ondersteuning             → STAP 1A
  • Weet je het niet                            → STAP 1B

STAP 1A — Geen MCP-ondersteuning:
  Leg uit dat die app geen MCP-server kan aansluiten.
  Alternatieven:
  1. Gebruik rechtstreeks het BPost dashboard:
     https://bpost-mcp.vercel.app/dashboard
     (daar kun je mailaankondigingen doen zonder MCP).
  2. Download Claude Desktop van https://claude.ai/desktop
     — die wél MCP.

STAP 1B — Weet niet welke app:
  Vraag: "Gebruik je de AI via een app op je computer,
  of via een website in je browser?"
  • Computer-app → waarschijnlijk Claude Desktop
  • Browser     → waarschijnlijk web-chat, dus zie STAP 1A

──────────────────────────────────────────────────────────────────────
STAP 2A — Claude Desktop
──────────────────────────────────────────────────────────────────────
Methode A (aanbevolen) — met npx add-mcp:
  Vraag de gebruiker om in hun terminal (Command Line of PowerShell)
  het volgende commando uit te voeren:

    npx add-mcp https://bpost-mcp.vercel.app/api/mcp

  Dit installeert de server automatisch in de juiste configuratiebestanden.
  Klaar — geen verdere stappen nodig.

  Als npx niet werkt (bijv. "command not found"):
  → ga naar Methode B hieronder.

Methode B — Handmatig config bewerken:
  1. Vraag het besturingssysteem:
     • macOS:    ~/Library/Application Support/Claude/
     • Windows:  %APPDATA%\Claude\
     • Linux:    ~/.config/Claude/

  2. Open het bestand claude_desktop_config.json in een teksteditor
     (Kladblok, TextEdit, VS Code, of andere).

  3. Voeg de volgende regels toe IN de bestaande JSON
     (niet als apart bestand, niet buiten de accolades):

     {
       "mcpServers": {
         "bpost": {
           "url": "https://bpost-mcp.vercel.app/api/mcp"
         }
       }
     }

  4. Sla het bestand op. Klaar — Claude Desktop detecteert de
     wijziging automatisch, herstarten is niet nodig.

  Wanneer de gebruiker voor het eerst een BPost-tool gebruikt,
  opent Claude Desktop automatisch een inlogpagina in de browser.
  Daarna werkt alles direct.

──────────────────────────────────────────────────────────────────────
STAP 2B — Claude Code (terminal)
──────────────────────────────────────────────────────────────────────
Voer in de terminal:

    claude mcp add bpost --url https://bpost-mcp.vercel.app/api/mcp

Bij de eerste BPost-opdracht vraagt Claude Code om in te loggen
via de browser. Daarna werkt alles automatisch.

──────────────────────────────────────────────────────────────────────
STAP 3 — Testen (optioneel)
──────────────────────────────────────────────────────────────────────
Vraag: "Probeer nu: 'help me een adresbestand voor te bereiden'
of een andere BPost-gerelateerde vraag."

Als de AIpool werkt:
  • Je ziet BPost-specifieke tools of antwoorden.
  • Klaar!

Als er om een inlog wordt gevraagd:
  • De gebruiker opent de link in de browser en logt in met Google.
  • Daarna werkt het direct.

Als er een fout optreedt:
  Controleer of de URL correct is ingevoerd:
    https://bpost-mcp.vercel.app/api/mcp
  (zorg dat er geen / aan het einde staat en geen spaties).

──────────────────────────────────────────────────────────────────────
STORINGSOPSCHONING (als iets niet werkt)
──────────────────────────────────────────────────────────────────────
Probleem                              Oplossing
─────────────────────────────────────────────────────────────────────────
"URL niet gevonden" of "Connection    Controleer of de URL correct is
 refused"                             gekopieerd (geen typfouten)

"Geen toegang" na inloggen            Misschien is het Google-account
                                      niet gekoppeld aan BPost.
                                      Raadpleeg het dashboard.

"Tools laden niet"                    Wacht 30 seconden en probeer
                                      opnieuw; Claude Desktop moet
                                      de configuratie laden.

Meer hulp: https://github.com/markminnoye/bpost-e-masspost-skills
```

---

## EN Version — Guided Installation

```
You will guide a non-technical user through connecting the BPost MCP
server to their AI client. Follow the steps below strictly.
Use plain language, not technical jargon.

IMPORTANT — this is not a programming task:
  • No Bearer token is needed for standard use.
  • Nothing needs to be restarted after entering the URL.
  • The AI will automatically open a login page if needed.

──────────────────────────────────────────────────────────────────────
STEP 1 — Ask for the Client (REQUIRED, do this first)
──────────────────────────────────────────────────────────────────────
Ask: "What app are you using to talk to the AI?"

  • Claude Desktop (Mac or Windows)               → STEP 2A
  • Claude Code (terminal / command line)          → STEP 2B
  • Le Chat, ChatGPT, Perplexity, or another
    web chat without MCP support                 → STEP 1A
  • Not sure                                      → STEP 1B

STEP 1A — No MCP support:
  Explain that their app cannot connect an MCP server.
  Alternatives:
  1. Use the BPost dashboard directly:
     https://bpost-mcp.vercel.app/dashboard
     (submit mailings without MCP).
  2. Download Claude Desktop from https://claude.ai/desktop
     — it supports MCP.

STEP 1B — Uncertain which app:
  Ask: "Are you using the AI through an app on your computer,
  or through a website in your browser?"
  • Computer app → likely Claude Desktop
  • Browser      → likely web chat, so see STEP 1A

──────────────────────────────────────────────────────────────────────
STEP 2A — Claude Desktop
──────────────────────────────────────────────────────────────────────
Method A (recommended) — using npx add-mcp:
  Ask the user to run the following command in their terminal
  (Command Prompt, PowerShell, or Terminal):

    npx add-mcp https://bpost-mcp.vercel.app/api/mcp

  This automatically installs the server in the correct config files.
  Done — no further steps needed.

  If npx does not work (e.g. "command not found"):
  → go to Method B below.

Method B — Manual config edit:
  1. Ask for their operating system:
     • macOS:    ~/Library/Application Support/Claude/
     • Windows:  %APPDATA%\Claude\
     • Linux:    ~/.config/Claude/

  2. Open the file claude_desktop_config.json in a text editor
     (Notepad, TextEdit, VS Code, etc.).

  3. Add the following lines INSIDE the existing JSON
     (not as a separate file, not outside the braces):

     {
       "mcpServers": {
         "bpost": {
           "url": "https://bpost-mcp.vercel.app/api/mcp"
         }
       }
     }

  4. Save the file. Done — Claude Desktop detects the change
     automatically, no restart is needed.

  When the user first uses a BPost tool, Claude Desktop will
  automatically open a login page in the browser.
  After that, everything works directly.

──────────────────────────────────────────────────────────────────────
STEP 2B — Claude Code (terminal)
──────────────────────────────────────────────────────────────────────
Run in the terminal:

    claude mcp add bpost --url https://bpost-mcp.vercel.app/api/mcp

  On first BPost command, Claude Code will ask to log in
  via the browser. After that, everything works automatically.

──────────────────────────────────────────────────────────────────────
STEP 3 — Test (optional)
──────────────────────────────────────────────────────────────────────
Ask: "Now try: 'help me prepare an address file for BPost'
or any other BPost-related question."

If the AI pool works:
  • You see BPost-specific tools or responses.
  • Done!

If a login is requested:
  • The user opens the link in the browser and logs in with Google.
  • Then it works directly.

If an error occurs:
  Check that the URL was entered correctly:
    https://bpost-mcp.vercel.app/api/mcp
  (make sure there is no / at the end and no spaces).

──────────────────────────────────────────────────────────────────────
TROUBLESHOOTING (if something does not work)
──────────────────────────────────────────────────────────────────────
Problem                               Fix
─────────────────────────────────────────────────────────────────────────
"URL not found" or "Connection       Check that the URL was copied
 refused"                              correctly (no typos)

"No access" after logging in          The Google account may not be
                                      linked to BPost. Check the
                                      dashboard.

"Tools do not load"                   Wait 30 seconds and try again;
                                      Claude Desktop needs to load
                                      the config.

More help: https://github.com/markminnoye/bpost-e-masspost-skills
```

---

## Over deze prompt

- **Onderhoudslocatie:** `docs/install/install-prompt.md`
- **Laatst bijgewerkt:** 2026-04-11
- **Website (`/install`):** de knop *Kopieer de installatie-prompt* laadt deze tekst via de server en vervangt `https://bpost-mcp.vercel.app` automatisch door de echte basis-URL van die omgeving (`NEXT_PUBLIC_BASE_URL`).
- **Gebruik:** Plak de NL- of EN-sectie in een AI-assistent. Die leidt de gebruiker door de installatie.
- **Standaardmethode:** `npx add-mcp` (één commando, geen config bewerken).
- **Handmatige fallback:** JSON in `claude_desktop_config.json` (als `npx` niet werkt).
- **OAuth (Google login):** Automatisch — geen Bearer-token, geen herstart.
- **Bearer-token:** Alleen nodig voor geavanceerde of geautomatiseerde setups; vermeld dit als optie als de standaardmethode niet werkt.
- **Ondersteunde clients:** Claude Desktop, Claude Code (en alle andere via `npx add-mcp`).
