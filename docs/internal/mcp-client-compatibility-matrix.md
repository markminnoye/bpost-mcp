# MCP Client Compatibility Matrix

## Purpose

Track which `initialize.serverInfo` shape is safe across supported MCP clients, and define production defaults.

## Production Default (current)

- `serverInfo.name`: enabled
- `serverInfo.version`: enabled
- `serverInfo.title`: disabled by default (`MCP_SERVERINFO_ENABLE_TITLE=false`)
- `serverInfo.description`: disabled by default (`MCP_SERVERINFO_ENABLE_DESCRIPTION=false`)
- `serverInfo.websiteUrl`: disabled by default (`MCP_SERVERINFO_ENABLE_WEBSITE_URL=false`)
- `serverInfo.icons`: disabled by default (`MCP_SERVERINFO_ENABLE_ICONS=false`)

## Rollout Flags

- `MCP_SERVERINFO_ENABLE_TITLE`
- `MCP_SERVERINFO_ENABLE_DESCRIPTION`
- `MCP_SERVERINFO_ENABLE_WEBSITE_URL`
- `MCP_SERVERINFO_ENABLE_ICONS`

Use preview deployments to enable one flag group at a time and validate clients before promoting to production defaults.

## Actuele preview-configuratie (`develop` → `preview.bpost.sonicrocket.io`)

Operatorstand **2026-04-14** / **2026-04-15** (na env-wijziging steeds **opnieuw deployen** zodat de build de flags meeneemt):


| Variable                            | Preview (`develop`) |
| ----------------------------------- | ------------------- |
| `MCP_SERVERINFO_ENABLE_DESCRIPTION` | `true`              |
| `MCP_SERVERINFO_ENABLE_TITLE`       | `true`              |
| `MCP_SERVERINFO_ENABLE_WEBSITE_URL` | `true`              |
| `MCP_SERVERINFO_ENABLE_ICONS`       | `true`              |


Verwacht in `initialize.serverInfo`: `name`, `version`, `title`, `description`, `websiteUrl` (= `NEXT_PUBLIC_BASE_URL`), **`icons`** (array: HTTPS `…/mcp-server-icon.svg` + `data:image/svg+xml;base64,…` — zie `buildMcpServerIcons` in `src/lib/app-version.ts`).

## Preview vs production (zelfde Git-commit)

Als **productie** met commit `X` werkt maar een **Preview** met dezelfde `X` niet, zit het verschil vrijwel altijd in **host + Vercel-env + IdP**, niet in de broncode.

1. **Gebruik consequent de preview-host** — MCP- en OAuth-flow testen tegen `https://bpost-….vercel.app` (of jouw preview-domein), niet tegen de productie-URL.
2. **`NEXT_PUBLIC_BASE_URL` (Preview)** — Laat leeg zodat `VERCEL_URL` per deployment klopt, **of** zet per preview-branch een waarde die exact overeenkomt met die deployment. Eén vaste URL voor alle previews kan andere preview-URLs breken.
3. **Google OAuth (Auth.js)** — In Google Cloud Console moet **Authorized redirect URI** elke preview-origin bevatten die je echt gebruikt: `https://<preview-host>/api/auth/callback/google`. Zonder die URI faalt inloggen op preview vaak meteen, terwijl productie wel werkt.
4. **Neon preview-branch vs schema** — Als `POST /oauth/register` op preview **500** geeft terwijl productie werkt: controleer of de Neon-branch voor die preview dezelfde migraties heeft als `main` (bv. tabel `oauth_clients`). Ontbreekt die: migraties draaien op die branch, of de branch **reset from parent** (`main`).
5. **OAuth-fout `redirect_uri not registered`** — Komt uit jullie `/oauth/authorize` validatie tegen het geregistreerde MCP-client-record (DB of client-metadata), niet uit Le Chat’s “integration create”.
6. **Nog steeds `integrations.create` + TRPC internal error in Le Chat** — Raakt je server niet; zie de sectie *Le Chat (Mistral)* hieronder.

## Rollout step 1 — `serverInfo.description` (strict single-flag test)

**Goal:** alleen `description` aanzetten, rest uit — ideaal om clientbreuk te isoleren.

Strikt (alleen stap 1):


| Variable                            | Value              |
| ----------------------------------- | ------------------ |
| `MCP_SERVERINFO_ENABLE_DESCRIPTION` | `true`             |
| `MCP_SERVERINFO_ENABLE_TITLE`       | `false` (or unset) |
| `MCP_SERVERINFO_ENABLE_WEBSITE_URL` | `false` (or unset) |
| `MCP_SERVERINFO_ENABLE_ICONS`       | `false` (or unset) |


**Opmerking:** op preview hebben we **titel + beschrijving samen** gezet omdat Le Chat de beschrijving in de UI nog niet toonde; zie **Actuele preview-configuratie** hierboven.

## Rollout step 2 — `serverInfo.websiteUrl`

**Goal:** `websiteUrl` toevoegen (`MCP_SERVERINFO_ENABLE_WEBSITE_URL=true`); waarde = `NEXT_PUBLIC_BASE_URL` van de deployment.

**Status (preview `develop`):** vlag **`true`**, nieuwe preview-build gedeployed (zie **Actuele preview-configuratie**).

Strikt (alleen `websiteUrl` bijkomen t.o.v. stap 1):


| Variable                            | Value  |
| ----------------------------------- | ------ |
| `MCP_SERVERINFO_ENABLE_WEBSITE_URL` | `true` |


Daarna opnieuw **deployen** en matrix + clients valideren.

### Expected `initialize.serverInfo` shape (stap 2)

- Bestaande velden blijven zoals na stap 1
- **Extra:** `websiteUrl` — komt overeen met `NEXT_PUBLIC_BASE_URL` in de deployment

Nog **geen** `icons` tenzij `MCP_SERVERINFO_ENABLE_ICONS=true`.

### After validation

Werk de matrix bij per client; noteer datum en host (bv. `preview.bpost.sonicrocket.io`).

## Rollout step 3 — `serverInfo.icons`

**Goal:** `icons` toevoegen (`MCP_SERVERINFO_ENABLE_ICONS=true`); entries uit `buildMcpServerIcons(NEXT_PUBLIC_BASE_URL)` (HTTPS-pad eerst voor strikte clients).

**Status (preview `develop`):** vlag **`true`**, deployment **Ready** (`dpl_9czrpnzijicDBNEcKvDp7R75p7B5`, alias `preview.bpost.sonicrocket.io`).

## Le Chat (Mistral) — integration registration vs MCP payload

Some failures happen **before** your MCP server is contacted.

**Observed (2026-04-14):** browser console shows `integrations.create` failing with `TRPCClientError: Internal server error`. That mutation runs on **chat.mistral.ai** (Le Chat backend), not on the MCP URL. It means the integration record was never created — you cannot infer anything about `serverInfo`, OAuth, or tool contracts from that error alone.

**Suggested actions (operator):**

1. Retry after a delay; try another browser / incognito (rule out stale session).
2. Toggle inputs that might trigger backend validation (`visibility`, org vs personal, custom icon URL).
3. If it persists, open a ticket with **Mistral** and include the mutation name (`integrations.create`) and approximate time (they need server-side logs).

## Validation Matrix


| Client         | name+version | +title    | +description | +websiteUrl | +icons    | Notes                                                                                                                                                      |
| -------------- | ------------ | --------- | ------------ | ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Desktop | ✅ baseline   | ⏳ pending | ⏳ pending    | ⏳ in test   | ⏳ in test | Preview: alle vier optionele `serverInfo`-flags aan (2026-04-15) — nog te bevestigen in Desktop                                                            |
| Le Chat        | ✅ baseline   | ⏳ in test | ⏳ in test    | ⏳ in test   | ⏳ in test | Zelfde MCP-payload; **UI toont titel/omschrijving/URL/icon vaak niet** — geen serverfout; zie *Le Chat*                                                    |


## Validation Checklist per step

1. Connect/auth succeeds without generic authorization error.
2. `initialize` response contains expected fields only.
3. `tools/list` and one representative `tools/call` succeed.
4. Reconnect after token refresh still succeeds.
5. No client-side parsing errors in logs/UI.

