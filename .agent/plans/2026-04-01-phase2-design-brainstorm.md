# Phase 2 Design — bpost-mcp

**Datum:** 2026-04-01
**Status:** Brainstorm afgerond — open voor architect review
**Scope:** Fase 2 van de bpost-mcp roadmap (zie `docs/internal/vision.md` §3)

---

## 1. Context

Fase 1 heeft een werkende **structuur** opgeleverd: MCP route, BpostClient, XML layer, en envelope-validatie. De action sub-schemas zijn echter nog stubs (`.passthrough()`). Fase 1 moet eerst worden afgerond vóór Fase 2 start.

**Fase 1 nog af te werken:**
- Action sub-schemas uitwerken op basis van XSD files: `DepositCreate`, `DepositUpdate`, `DepositDelete`, `DepositValidate`, `MailingCreate`, `MailingCheck`, `MailingDelete`, `MailingReuse`
- Response schemas implementeren: `DepositResponse`, `MailingResponse`
- End-to-end smoke test met echte BPost credentials

---

## 2. Doelstelling Fase 2

De MCP server transformeert van een lokale dev-tool naar een **gehoste, multi-tenant service** waarop klanten hun eigen BPost account kunnen aansluiten.

**Sprint 1:** Credential layer + live BPost calls
**Sprint 2:** Self-learning (declaratieve kennisbank + procedurele fix-scripts)

---

## 3. Vastgelegde keuzes (uit brainstorm)

- **Architectuurmodel:** Multi-tenant vanaf dag 1 — demo = klant #0. Nieuwe klant toevoegen = één record aanmaken.
- **Platform:** Vercel-ecosysteem, minimale tiers.
- **Blind Agent principe:** De LLM mag nooit BPost credentials zien of ontvangen als tool-parameter. De credential-lookup gebeurt transparant in de backend, buiten het zicht van de agent. Dit is niet onderhandelbaar.
- **Fase 1 code:** `BpostClient`, schemas, XML layer blijven ongewijzigd in Fase 2.

---

## 4. Open vragen voor de architect

De volgende vragen zijn bewust open gelaten. Per vraag worden opties gesuggereerd als startpunt voor het gesprek.

### 4.1 Credential storage

Waar worden BPost credentials per klant veilig opgeslagen?

**Suggesties (Vercel-ecosysteem):**

| Optie | Voordelen | Nadelen |
|---|---|---|
| **Neon Postgres** (Vercel Marketplace) | Relationeel, uitbreidbaar, Vercel-native billing | Vereist ORM/query layer |
| **Upstash Redis** (Vercel Marketplace) | Snelle KV lookup, laag overhead | Minder geschikt voor toekomstige uitbreidingen |

**Aanvullende vragen voor de architect:**
- Welke encryptie-strategie voor passwords at rest?
- Aparte audit log voor credential gebruik?

### 4.2 Authenticatie

Hoe identificeert de server welke klant een aanroep doet?

Constraint: klanten configureren de MCP server in hun AI client (Claude Desktop, Langflow) — de auth-methode moet eenvoudig configureerbaar zijn.

**Suggesties:**

| Optie | Geschikt voor MCP config | Complexiteit |
|---|---|---|
| **API key** (bearer token in header of URL) | ✅ Eenvoudig | Laag |
| **JWT** | ✅ Mogelijk | Gemiddeld |
| **Clerk** (Vercel Marketplace) | ❌ Te zwaar voor machine-to-machine | Hoog |

### 4.3 Self-learning storage

Waar worden kennis en fix-scripts opgeslagen?

Constraint: per-klant isolatie én gedeelde globale basiskennis moeten mogelijk zijn.

**Suggesties:**
- Zelfde database als credentials (één opslag)?
- Aparte opslag (bijv. Vercel Blob voor scripts, Postgres voor regels)?
- Git-gebaseerd (markdown naar repo, zoals het submodule-patroon uit Fase 1)?

### 4.4 Vercel deployment

- Eén Vercel project of aparte deployments per omgeving (demo / productie)?
- Welke env vars zijn Marketplace-provisioned vs manueel?
- Vercel CLI al geïnstalleerd? (`npm i -g vercel` vereist)

---

## 5. Referenties

- `docs/internal/vision.md` — volledige roadmap en fase-definities (§3 en §4 meest relevant)
- `docs/internal/phase1-architecture.md` — wat er gebouwd is in Fase 1
- `docs/internal/project-design.md` — architectuurbeslissingen log
- `.agent/plans/2026-03-31-phase1-implementation.md` — Fase 1 implementatieplan
