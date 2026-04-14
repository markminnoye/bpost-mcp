# MCP Client Compatibility Matrix

## Purpose

Track MCP client behaviour against our `initialize.serverInfo` payload and operational pitfalls (preview vs production).

## `initialize.serverInfo` (always full)

There are **no feature flags**: every deployment sends the full metadata block from code + `NEXT_PUBLIC_BASE_URL`.


| Field         | Source                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------- |
| `name`        | `MCP_SERVER_DISPLAY_NAME` (`src/lib/app-version.ts`)                                     |
| `version`     | `APP_VERSION` (from `package.json`)                                                      |
| `title`       | `MCP_SERVER_DISPLAY_TITLE`                                                               |
| `description` | `MCP_SERVER_DESCRIPTION`                                                                 |
| `websiteUrl`  | `env.NEXT_PUBLIC_BASE_URL`                                                               |
| `icons`       | `buildMcpServerIcons(NEXT_PUBLIC_BASE_URL)` — HTTPS SVG URL first, then `data:` fallback |


**MCP spec (2025-11-25):** each `Icon` uses `sizes` as a **string array** (e.g. `["any"]`, `["32x32"]`), not a single string — required for strict clients (e.g. Claude Desktop).

## Preview vs production (zelfde Git-commit)

Als **productie** met commit `X` werkt maar een **Preview** met dezelfde `X` niet, zit het verschil vrijwel altijd in **host + Vercel-env + IdP**, niet in de broncode.

1. **Gebruik consequent de preview-host** — MCP- en OAuth-flow testen tegen `https://bpost-….vercel.app` (of jouw preview-domein), niet tegen de productie-URL.
2. `**NEXT_PUBLIC_BASE_URL` (Preview)** — Laat leeg zodat `VERCEL_URL` per deployment klopt, **of** zet per preview-branch een waarde die exact overeenkomt met die deployment. Eén vaste URL voor alle previews kan andere preview-URLs breken.
3. **Google OAuth (Auth.js)** — In Google Cloud Console moet **Authorized redirect URI** elke preview-origin bevatten die je echt gebruikt: `https://<preview-host>/api/auth/callback/google`. Zonder die URI faalt inloggen op preview vaak meteen, terwijl productie wel werkt.
4. **Neon preview-branch vs schema** — Als `POST /oauth/register` op preview **500** geeft terwijl productie werkt: controleer of de Neon-branch voor die preview dezelfde migraties heeft als `main` (bv. tabel `oauth_clients`). Ontbreekt die: migraties draaien op die branch, of de branch **reset from parent** (`main`).
5. **OAuth-fout `redirect_uri not registered`** — Komt uit jullie `/oauth/authorize` validatie tegen het geregistreerde MCP-client-record (DB of client-metadata), niet uit Le Chat’s “integration create”.
6. **Nog steeds `integrations.create` + TRPC internal error in Le Chat** — Raakt je server niet; zie de sectie *Le Chat (Mistral)* hieronder.

## Le Chat (Mistral) — integration registration vs MCP payload

Some failures happen **before** your MCP server is contacted.

**Observed (2026-04-14):** browser console shows `integrations.create` failing with `TRPCClientError: Internal server error`. That mutation runs on **chat.mistral.ai** (Le Chat backend), not on the MCP URL. It means the integration record was never created — you cannot infer anything about `serverInfo`, OAuth, or tool contracts from that error alone.

**Suggested actions (operator):**

1. Retry after a delay; try another browser / incognito (rule out stale session).
2. Toggle inputs that might trigger backend validation (`visibility`, org vs personal, custom icon URL).
3. If it persists, open a ticket with **Mistral** and include the mutation name (`integrations.create`) and approximate time (they need server-side logs).

**UI vs payload:** Le Chat may not surface `title` / `description` / `websiteUrl` / `icons` in the connector UI even when `initialize` returns them.

## Validation Matrix


| Client         | Full `serverInfo` | Notes                                                       |
| -------------- | ----------------- | ----------------------------------------------------------- |
| Claude Desktop | ⏳ pending         | Re-verify after deploy (icons `sizes` must be `string[]`).  |
| Le Chat        | ⏳ in test         | OAuth + MCP OK; UI may hide metadata — see *Le Chat* above. |


## Validation Checklist

1. Connect/auth succeeds without generic authorization error.
2. `initialize` response includes `name`, `version`, `title`, `description`, `websiteUrl`, `icons`.
3. `tools/list` and one representative `tools/call` succeed.
4. Reconnect after token refresh still succeeds.
5. No client-side parsing errors in logs/UI.