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

## Preview vs production (zelfde Git-commit)

Als **productie** met commit `X` werkt maar een **Preview** met dezelfde `X` niet, zit het verschil vrijwel altijd in **host + Vercel-env + IdP**, niet in de broncode.

1. **Gebruik consequent de preview-host** — MCP- en OAuth-flow testen tegen `https://bpost-….vercel.app` (of jouw preview-domein), niet tegen de productie-URL.
2. **`NEXT_PUBLIC_BASE_URL` (Preview)** — Laat leeg zodat `VERCEL_URL` per deployment klopt, **of** zet per preview-branch een waarde die exact overeenkomt met die deployment. Eén vaste URL voor alle previews kan andere preview-URLs breken.
3. **Google OAuth (Auth.js)** — In Google Cloud Console moet **Authorized redirect URI** elke preview-origin bevatten die je echt gebruikt: `https://<preview-host>/api/auth/callback/google`. Zonder die URI faalt inloggen op preview vaak meteen, terwijl productie wel werkt.
4. **Neon preview-branch vs schema** — Als `POST /oauth/register` op preview **500** geeft terwijl productie werkt: controleer of de Neon-branch voor die preview dezelfde migraties heeft als `main` (bv. tabel `oauth_clients`). Ontbreekt die: migraties draaien op die branch, of de branch **reset from parent** (`main`).
5. **OAuth-fout `redirect_uri not registered`** — Komt uit jullie `/oauth/authorize` validatie tegen het geregistreerde MCP-client-record (DB of client-metadata), niet uit Le Chat’s “integration create”.
6. **Nog steeds `integrations.create` + TRPC internal error in Le Chat** — Raakt je server niet; zie de sectie *Le Chat (Mistral)* hieronder.

## Rollout step 1 — `serverInfo.description` only (current focus)

**Goal:** prove that adding only `description` does not break Claude Desktop or Le Chat, before enabling `title`, `websiteUrl`, or `icons`.

### Preview environment variables

On a **preview** deployment, set exactly:


| Variable                            | Value              |
| ----------------------------------- | ------------------ |
| `MCP_SERVERINFO_ENABLE_DESCRIPTION` | `true`             |
| `MCP_SERVERINFO_ENABLE_TITLE`       | `false` (or unset) |
| `MCP_SERVERINFO_ENABLE_WEBSITE_URL` | `false` (or unset) |
| `MCP_SERVERINFO_ENABLE_ICONS`       | `false` (or unset) |


### Expected `initialize.serverInfo` shape

- `name` (string)
- `version` (string)
- `description` (string) — must match `MCP_SERVER_DESCRIPTION` in code

Must **not** be present unless a flag is on:

- `title`
- `websiteUrl`
- `icons`

### After validation

Update the matrix row for each client: set **+description** to ✅ or ❌ and add a short note (date, preview URL, symptom if fail).

## Le Chat (Mistral) — integration registration vs MCP payload

Some failures happen **before** your MCP server is contacted.

**Observed (2026-04-14):** browser console shows `integrations.create` failing with `TRPCClientError: Internal server error`. That mutation runs on **chat.mistral.ai** (Le Chat backend), not on the MCP URL. It means the integration record was never created — you cannot infer anything about `serverInfo`, OAuth, or tool contracts from that error alone.

**Suggested actions (operator):**

1. Retry after a delay; try another browser / incognito (rule out stale session).
2. Toggle inputs that might trigger backend validation (`visibility`, org vs personal, custom icon URL).
3. If it persists, open a ticket with **Mistral** and include the mutation name (`integrations.create`) and approximate time (they need server-side logs).

## Validation Matrix


| Client         | name+version | +title    | +description | +websiteUrl | +icons    | Notes                                                                                                        |
| -------------- | ------------ | --------- | ------------ | ----------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| Claude Desktop | ✅ baseline   | ⏳ pending | ⏳ in test    | ⏳ pending   | ⏳ pending | Validate connect + tool call + reconnect                                                                     |
| Le Chat        | ✅ baseline   | ⏳ pending | ⏳ in test    | ⏳ pending   | ⏳ pending | Preview OAuth OK na Neon `preview/develop` reset; platformfouten `integrations.create` mogelijk; zie secties |


## Validation Checklist per step

1. Connect/auth succeeds without generic authorization error.
2. `initialize` response contains expected fields only.
3. `tools/list` and one representative `tools/call` succeed.
4. Reconnect after token refresh still succeeds.
5. No client-side parsing errors in logs/UI.