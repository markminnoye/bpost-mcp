# Visie & Roadmap: bpost e-MassPost AI Agent

## 1. Context en Probleemstelling

Het verwerken van mass mailings via het bpost e-MassPost systeem (Mail ID, OptiAddress) is een complex proces. Gebruikers worstelen met strikte formatteringsregels, complexe XML/TXT-structuren, cryptische foutcodes (zoals `MID-4010`) en verouderde protocollen (FTP). **Onze visie:** We bouwen een AI-gedreven tool ("Agentic Workflow") die dit proces drastisch vereenvoudigt. De AI fungeert als een intelligente assistent die bestanden valideert, fouten in menselijke taal uitlegt, en—cruciaal—deze fouten proactief en geautomatiseerd oplost.

## 2. Kernconcepten: Wat is een "Agentic Workflow"?

In plaats van een simpele chatbot die alleen documentatie kan voorlezen (RAG), bouwen we een **Agent** . Een agent kan *handelen* (tools gebruiken) en *leren*.

Binnen dit project maken we gebruik van "Agentic Learning", opgedeeld in drie pijlers:

1. **Declaratieve Kennis (Het "Wat" en "Waarom")** - *Wat is het?* Feiten, regels en nuances die we in de praktijk ontdekken (bijv. "bpost accepteert 'Appt' maar niet 'App.'").
   - *Hoe werkt het?* De AI krijgt een tool om deze opgedane kennis weg te schrijven naar gestructureerde Markdown (`.md`) bestanden in onze repository (bijv. `learned_rules.md`). Deze kennis is direct beschikbaar voor alle toekomstige interacties.
2. **Procedurele Kennis (Het "Hoe")** - *Wat is het?* Executabele code (scripts, regex, Python/JS functies) om repetitieve taken op te lossen (bijv. een script dat leestekens uit straatnamen verwijdert).
   - *Hoe werkt het?* De AI genereert code-snippets om data op te schonen en slaat deze op in een bibliotheek (bijv. `auto_fixers.py`). Bij volgende bestanden kunnen deze scripts automatisch over de data gedraaid worden *voordat* deze naar bpost gaat.
3. **Feedback & Escalatie (De Auto-Bug Report)** - *Wat is het?* De agent monitort actief de kwaliteit van zijn eigen kennis en de beschikbaarheid van externe diensten.
   - *Hoe werkt het?* Ontdekt de agent een fout in de documentatie, een tegenspraak, of merkt hij dat een bpost API-endpoint niet reageert? Dan maakt de agent autonoom een bug report aan in GitHub voor onze developers.

## 3. Gefaseerde Aanpak (De Roadmap)

Om snel waarde te leveren en risico's te beperken, bouwen we de oplossing stapsgewijs op.

### Fase 1: De Adviserende Skill & Lokale Desktop Automatisatie (Huidige Status)

- **Doel:** De gebruiker inzicht geven in de e-MassPost diensten en lokaal helpen met validatie, zónder dat de AI zelfstandig data naar bpost verstuurt.
- **Interface:** De bestaande GitHub repo (geëxporteerd als zip-bestand) óf een **lokale, read-only MCP server** (Model Context Protocol) geïmporteerd in Claude Desktop.
- **Werking:** De agent fungeert als slimme assistent. Hij kan adressenlijsten lokaal nakijken op bpost-voorschriften. De eindgebruiker kan deze lokale MCP-skill op zijn eigen desktop combineren met andere tools (Gmail, Google Agenda, Excel, GDrive). *Voorbeeld:* De agent haalt een Excel uit een mail, formatteert de adressen volgens de bpost-regels in een nieuw tabblad, plaatst dit in GDrive ter menselijke validatie, en leest/maakt direct een planning in Google Agenda (bijv. een herinnering of agendapunt voor de daadwerkelijke fysieke afgifte bij bpost). De klant moet de uiteindelijke data nog **zelf** opladen via de e-MassPost webinterface.

### Fase 2: De Actieve Agent (API's, Hosted MCP, Credentials & Self-Learning)

- **Doel:** De agent de mogelijkheid geven om écht te *handelen* en te *leren* door het introduceren van een centrale backend.
- **Interface:** Een centraal gehoste API / Hosted MCP server, gekoppeld aan de chat-interface van de gebruiker.
- **Werking:** De agent kan nu écht HTTP-requests sturen naar de bpost-servers. Om dit veilig te doen, implementeren we een login-systeem of backend-app (Vault) waar de persoonlijke credentials van de klant veilig worden opgeslagen. Tevens krijgt de agent in deze fase de permissies ("Tools") om de Declaratieve en Procedurele kennisbank actief op te bouwen (self-learning), en om auto-bug reports te genereren in onze repository.

### Fase 3: Enterprise Automatisatie, Web Platform & Eigen Databank

- **Doel:** Volledige procesautomatisering, schaalbaarheid en het bouwen van een eigen defensieve datalaag.
- **Interface:** Integratie in orchestrators (n8n, Zapier, Make) én de ontwikkeling van een eigen dedicated webplatform voor onze klanten.
- **Werking:** 1. **Grotere Workflows:** Onze tool wordt een "Node" in n8n/Zapier zodat klanten het hele proces (bijv. van CRM tot het printen van gegenereerde barcodes) kunnen automatiseren.
  2. **Web Platform:** We overwegen de bouw van een eigen portaal waar klanten eenvoudig instellingen kunnen beheren en Excel-lijsten kunnen droppen.
  3. **Eigen Adressendatabank:** Op basis van historische foutmeldingen en correcties via de bpost service, bouwen we een eigen, steeds slimmer wordende adressendatabank op. Hiermee kunnen we fouten al afvangen en corrigeren nóg voordat we de bpost API raadplegen.

## 4. Diepe Duik: Architectuur voor Fase 2

Voor onze developers en analisten: hoe gaan we de backend voor Fase 2 technisch inrichten?

### 4.1 Architectuurkeuze voor de Actieve Agent (Voorkeur: API + Hosted MCP)

Om de AI te voorzien van acties ("Tools"), zoals het valideren van een adres via HTTP of het opslaan van een script, moeten we een brug bouwen tussen de chat-interface en onze code. Hoewel Fase 1 prima lokaal kan draaien, vereist Fase 2 een robuustere aanpak. **Onze Voorkeursarchitectuur: Een gecombineerde API + Hosted MCP structuur.** - *Hoe het werkt:* We bouwen een centrale REST API, verpakt als een Hosted MCP server. Onze klanten verbinden hun AI-client (zoals Claude) met onze centrale URL, in plaats van lokaal scripts te moeten draaien.
- *Waarom deze keuze?*
  1. **Eenvoudige Installatie voor de Klant:** Klanten hoeven lokaal geen Node.js, Python of complexe MCP-omgevingen te installeren. Een URL en een API-key invullen in hun chat-client is voldoende.
  2. **Gecentraliseerde Updates:** Wanneer bpost zijn protocol wijzigt, of wanneer we een nieuw auto-fix script toevoegen, updaten we onze centrale server. Alle klanten profiteren hier *instant* van zonder zelf updates te moeten downloaden.
  3. **Single Source of Truth:** We bouwen centraal één grote kennisbank (Declaratief en Procedureel) op, in plaats van gefragmenteerde kennis op de laptops van individuele gebruikers.

*Opmerking ter vergelijking:* Een puur lokale MCP-server (zoals in Fase 1) is fantastisch als R&D-laboratorium voor onze eigen developers, maar is onhoudbaar in productie naar eindklanten toe qua support en versionering.

### 4.2 Verwachte Functionaliteiten (High-Level Capabilities)

In plaats van nu al de exacte technische API-endpoints vast te leggen, definiëren we hier de *functionele behoeftes* (capabilities) die de backend in Fase 2 moet faciliteren. Het is aan onze architecten en developers om dit te vertalen naar specifieke services.

De interface tussen de AI en onze backend moet de volgende processen ondersteunen:

1. **Data Vertaling & Analyse:** De mogelijkheid om complexe bpost-bestanden (ruwe XML-responses of e-MassPost Excels) te vertalen naar een vereenvoudigd formaat (bijv. JSON) zodat de AI de foutmeldingen sneller kan interpreteren.
2. **Interactie met bpost:** Een veilige gateway om (gecorrigeerde) adresgegevens daadwerkelijk af te toetsen of door te sturen naar de bpost API, zonder dat de AI de onderliggende protocollen hoeft te beheren.
3. **Kennisbeheer (Lezen & Schrijven):** De agent moet nieuwe vuistregels (declaratieve kennis) kunnen opslaan, maar moet ook de reeds opgebouwde regels kunnen opvragen bij het verwerken van nieuwe adressen.
4. **Scriptbeheer (Maken, Opvragen & Uitvoeren):** De agent moet oplossingsgerichte code (procedurele kennis) kunnen wegschrijven. Cruciaal is dat er een mechanisme is om te zien welke scripts er al bestaan, en om de backend de opdracht te geven een specifiek script (bijv. "Clean_Street_Names") uit te voeren op een dataset.
5. **Kwaliteitsbewaking (Feedback Loop):** Een escalatiekanaal (zoals een integratie met GitHub Issues) waarmee de AI autonoom tegenstrijdigheden in de documentatie of bpost-serverstoringen kan rapporteren aan het menselijke ontwikkelteam.

### 4.3 Toekomstbestendig Ontwerp (Platform-Agnostisch voor Fase 3)

Om in Fase 3 succesvol over te stappen naar platformen zoals **n8n, Zapier of Make** , moeten we "vendor lock-in" vermijden.

- **Ontkoppeling:** Schrijf de functionaliteit als **pure, onafhankelijke functies** (microservices). Onze Hosted MCP-server of API mag *alleen maar een doorgeefluik* zijn. Hierdoor zijn onze backend-functies in de toekomst direct bruikbaar als custom App in Zapier, Make-modules of n8n Code Nodes.

### 4.4 Beveiliging & Credentials (Cruciaal Ontwerpprincipe voor Fase 2)

In Fase 2 gaat onze gehoste tool communiceren met de bpost servers namens de klant. Hier zijn klant-specifieke authenticatiegegevens (API-keys, login, PRS-nummer) mee gemoeid. **Het risico:** Een LLM mag *nooit* direct toegang hebben tot deze sleutels. **De Oplossing: "Credential Abstraction" (De Blinde Agent)** De backend-architectuur moet als een schild fungeren tussen de AI en de bpost-servers:

1. De AI krijgt **geen parameters** voor credentials in zijn tools.
2. Zodra de AI een tool aanroept (bijv. `validate_address`), vangt onze API dit verzoek op.
3. Onze backend herkent welke gebruiker het verzoek deed op basis van een veilige login sessie (bijv. een bearer token in de MCP configuratie).
4. De backend haalt zélf de juiste bpost API-key en het PRS nummer veilig uit een versleutelde database (Vault).
5. De backend bouwt het HTTP request naar bpost en stuurt enkel het functionele resultaat terug naar de AI.

### 4.5 Privacy & GDPR (AVG) Compliantie

Massamailings bevatten per definitie **persoonsgegevens** . **Het risico:** Het doorsturen van ruwe adreslijsten naar publieke cloud-LLM's kan een datalek vormen. **Architecturale Oplossingen:** 1. **Data Minimalisatie & Anonimisering (Backend pre-processing):** Onze backend verwijdert of maskeert persoonsgerichte kolommen (zoals `First Name`, `Last Name`, `Company Name`) *voordat* de adresregel naar de LLM wordt gestuurd via de MCP connectie.
2. **Enterprise API's met Zero-Retention Policies:** We gebruiken uitsluitend Enterprise API-endpoints (OpenAI API / Anthropic API) met "zero data retention", gedekt door een **Data Processing Agreement (DPA)** .
3. **Puur Procedureel Uitvoeren (Fase 3):** De AI schrijft Python-scripts in Fase 2. In Fase 3 draaien we deze scripts *lokaal of op eigen servers* over de klantdata heen, waardoor de bulk van de ruwe persoonsgegevens de LLM helemaal niet meer hoeft te passeren.

### Actieplan voor het Team

1. **Analisten:** Promoot de Fase 1 Skill / lokale MCP bij de gebruikers. Ontdek welke workflows ze nu lokaal proberen te bouwen. Gebruik synthetische data om de 5 meest voorkomende `MID-` errors te analyseren via AI.
2. **Developers (Architectuur & Security):** Werk de specificaties uit voor de gecombineerde **API + Hosted MCP** architectuur (Sectie 4.1). Ontwerp de login/Vault mechaniek (Sectie 4.4) voor het veilig opslaan van de bpost credentials per klant.
3. **Legal/Management:** Controleer DPA's bij de beoogde AI API leveranciers.
4. **Developers (Code):** Bouw de modulaire HTTP-wrapper rond de bpost connectie én implementeer de `report_system_bug` tool via de GitHub API, ter voorbereiding op de Hosted MCP.