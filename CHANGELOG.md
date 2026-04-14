# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Hoe we dit schrijven** — Elke release opent met een **Samenvatting** in het
> Nederlands: wat is er nieuw, wat is opgelost, wat is aangepast — geschreven
> voor operators en stakeholders, niet voor compiler-output. GitHub-issues
> (`#n`) worden gelinkt waar relevant. Daaronder volgen de Engelse
> *Added / Changed / Fixed* secties voor contributors en audit.

---

## [Unreleased]

### Samenvatting

**Nieuw**

- Issue [#15](https://github.com/markminnoye/bpost-mcp/issues/15) vervolgstap in MCP-transparantie: resources en prompts zijn nu expliciet registreerbaar en zichtbaar via metadata-extractie en MCP list endpoints.

**Aanpassingen**

- Metadata-extractie ondersteunt nu ook `argsSchema` en uitgebreidere argument-afleiding, zodat prompt-parameters consistenter in de transparantie-output terechtkomen.
- Tool-contracten zijn verder gehard met output schema's en annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) op kritieke batch-tools.
- **Issue [#25](https://github.com/markminnoye/bpost-mcp/issues/25) Standards Upgrade:** sprint 1 en sprint 2 lopen nog; release blijft in uitvoering met focus op compatibiliteit en gefaseerde metadata-hardening.
- Sprint 3 metadata-rollout werkt nu in fases via feature flags: `title`, `description`, `websiteUrl` en `icons` kunnen per omgeving veilig aan/uit zonder de default minimale `serverInfo` te breken.

**Oplossingen**

- Extra regressietests valideren nu `structuredContent`-pariteit, resources/prompts listing en annotations-extractie om regressies in MCP contract discoverability te voorkomen.
- `check_batch` annotations zijn gecorrigeerd (`readOnlyHint: false`, `idempotentHint: false`) zodat tool-semantiek overeenkomt met de effectieve state-mutaties.

### Changed

- Registered MCP resources (`mapping_glossary`, `mode_priority_matrix`, `common_error_guidance`) and prompts (`batch_onboarding_flow`, `batch_error_triage_fix_loop`, `submit_preflight_confirmation`) in the main MCP route.
- Improved metadata extraction for prompt arguments by supporting both `arguments` and `argsSchema` and deriving parameter metadata from richer initializer shapes.
- Added explicit output schemas for key tools to align runtime responses with machine-readable contracts.
- Introduced feature-flagged MCP `serverInfo` enrichment (`title`, `description`, `websiteUrl`, `icons`) with a safe-by-default minimal payload.

### Fixed

- Ensured `get_service_info` tool responses include `structuredContent` parity with textual JSON payload.
- Added stronger test coverage to prevent regressions in tools/resources/prompts discovery and annotation propagation.
- Added regression coverage for server info composition so phased metadata rollout remains deterministic.

---

## [0.2.3] - 2026-04-14

### Samenvatting

**Nieuw**

- Issue [#15](https://github.com/markminnoye/bpost-mcp/issues/15): nieuwe publieke transparantiepagina op `/reference` die build-time automatisch toont welke MCP-kennis de AI ontvangt (server-info, system instructions, tools, parameters, en later ook resources/prompts).
- Dashboard bevat nu een directe link naar de transparantiepagina, zodat stakeholders die sneller kunnen terugvinden.

**Oplossingen**

- Issue [#30](https://github.com/markminnoye/bpost-mcp/issues/30): `apply_mapping_rules` blokkeert niet langer batches zonder gemapte `priority`-kolom — ontbrekende waarden krijgen nu automatisch `NP` tijdens mapping.
- `priority`-normalisatie bij mapping en row-fixes maakt CSV-invoer robuuster: spaties en kleine letters worden automatisch gecorrigeerd (`" np "` -> `NP`, `"p"` -> `P`), terwijl echt ongeldige waarden expliciet fout blijven.

**Aanpassingen**

- `check_batch` en `submit_ready_batch` behouden hun `priority` fallback als defensieve safety net voor legacy of inconsistente batch-state, ook al gebeurt defaulting nu al in de mappingstap.

### Changed

- `apply_mapping_rules` description now states that `priority` mapping is optional and defaults to `NP` when omitted.
- Priority normalization/defaulting is now applied before validation in both `apply_mapping_rules` and `apply_row_fix`.
- Added build-time MCP metadata extraction (`scripts/extract-tool-metadata.ts`) and `prebuild` integration so `/reference` always reflects latest tool registrations.
- Added static `/reference` App Router page with readable + JSON schema preview for extracted tool metadata.
- Added shared `ToolRegistry` typing for extractor and UI rendering.

### Fixed

- Fixed false validation blockers where mapped rows without `priority` failed early despite downstream batch flows already defaulting to non-prior (`NP`) (#30).
- Added regression coverage for missing, normalized, and invalid `priority` values in mapping and row-fix flows.
- Fixed parameter type inference on transparency output for chained/multiline Zod expressions (e.g. `z.string().regex(...).describe(...)` now resolves to `string` instead of `unknown`).
- Reduced extractor test fragility by deriving expected tool count from `registerTool(...)` calls instead of hardcoding a fixed number.
- Improved toggle accessibility semantics on `/reference` by using a pressed-state button group.

---

## [0.2.2] - 2026-04-14

### Samenvatting

**Nieuw**

- Issue [#29](https://github.com/markminnoye/bpost-mcp/issues/29) documenteert de MCP-client compatibiliteitsaanpak voor issue [#25](https://github.com/markminnoye/bpost-mcp/issues/25), inclusief rollout-plan per metadata-veld.

**Oplossingen**

- MCP connectie werkt opnieuw stabiel in Claude Desktop én Le Chat met de recente repo-updates door terug te keren naar een minimale `serverInfo` payload (`name`, `version`) in `initialize`.
- OAuth token-uitwisseling accepteert nu ook host-varianten op het token-endpoint (bijvoorbeeld canonical host vs. deployment-host) via normalisatie met fallback naar `NEXT_PUBLIC_BASE_URL`.

**Aanpassingen**

- `serverInfo`-uitbreidingen (`description`, `title`, `websiteUrl`, `icons`) zijn tijdelijk uit productie gehouden om clientcompatibiliteit te garanderen; herintroductie volgt gefaseerd in een aparte sprint.
- Extra regressietests toegevoegd voor resource-matching en MCP server-info helpers.

### Added

- Helper `oauthResourceMatchesAuthCodeAtTokenEndpoint()` voor robuuste OAuth resource matching bij hostverschillen tussen authorize en token stap.
- Documented follow-up issue for metadata rollout and client compatibility matrix: [#29](https://github.com/markminnoye/bpost-mcp/issues/29).

### Changed

- `src/app/api/mcp/route.ts` serves a minimal `serverInfo` shape (`name`, `version`) for broad client compatibility.
- `src/lib/oauth/resource-url.ts` now supports token-endpoint matching across request host and configured base URL.

### Fixed

- Resolved MCP client authorization/connect failures caused by optional `serverInfo` metadata fields in certain clients.
- Prevented false `invalid_grant` resource mismatch cases when OAuth authorize and token requests use equivalent but different app hosts.

---

## [0.2.1] - 2026-04-14

### Samenvatting

**Nieuw**

- Issues aangemaakt via `report_issue` krijgen automatisch het label `MCP` op GitHub en bevatten de tenant-ID en naam van de meldende organisatie in de body — zo zijn agentmeldingen onmiddellijk herkenbaar en te filteren.
- Engelse veldnamen (`lastName`, `street`, `postalCode`, …) werken nu als mapping-targets — ze worden automatisch vertaald naar de interne bpost-veldnamen (#21).
- Bij het verzenden van een batch kan je nu een barcode-strategie (`bpost-generates`, `customer-provides`, `mcp-generates`) en optioneel een barcodelength meegeven, in plaats van de cryptische `genMID` parameter (#20, #21).

**Oplossingen**

- De barcode-strategie die je meegaf bij `submit_ready_batch` werd genegeerd als het dashboard op `customer-provides` stond — dat is nu verholpen (#20).

**Aanpassingen**

- Foutmeldingen bij barcode-validatie maken nu duidelijk of de strategie via de tool-aanroep of via het dashboard is ingesteld.
- `upload_batch_file` tool beschrijft nu expliciet dat CSV als UTF-8 bytes in base64 moet worden aangeleverd (Excel-gebruikers: kies "CSV UTF-8").
- `ingestCsv` verwijdert nu de UTF-8 BOM en normaliseert CRLF naar LF, met een uitgebreidere foutmelding bij parse-problemen (rijnummer, PapaParse-foutcode, en checklist).
- `priority`-parameter in `apply_mapping_rules` en `submit_ready_batch` beschrijft nu D+1/D+2 betekenis en waarschuwt voor verwarring met mode P (Production).
- `server-instructions.ts` en `submit_ready_batch`-schema maken nu expliciet onderscheid tussen **item priority** P/NP en **communicatiemodus** T/C/P.

### Added

- `report_issue` MCP tool now tags every GitHub issue with the `MCP` label and appends tenant identity (ID + name) to the issue body, making agent-reported issues filterable and attributable.
- `getTenantName` helper exported from `src/lib/tenant/get-credentials.ts` — queries the `tenants` table to resolve a display name from a tenant ID.
- Mapping accepts English alias targets (`lastName`, `street`, `postalCode`, `mailIdBarcode`, …) — resolved to internal bpost field names via a safe lookup that prevents prototype-key hijacking (#21).
- `submit_ready_batch` accepts `barcodeStrategy` and optional `barcodeLength` (`7` | `9` | `11`) as explicit parameters, replacing the opaque `genMID` argument. An explicit strategy overrides tenant dashboard preferences for that submission (#20, #21).

### Changed

- `submit_ready_batch` Zod schema rejects `barcodeLength` unless `barcodeStrategy` is `bpost-generates`, preventing silent ignores when the agent omits the strategy.
- Barcode validation errors now distinguish between a strategy set on the tool call vs. inherited from dashboard settings, so agents are not pointed only at the dashboard when the caller overrode the strategy.
- `upload_batch_file` tool description now states that CSV must be provided as UTF-8 bytes in base64 (Excel users: choose "CSV UTF-8").
- `priority` parameter in `apply_mapping_rules` and `submit_ready_batch` now documents the D+1/D+2 meaning and warns about confusion with mode P (Production).
- `server-instructions.ts` and `submit_ready_batch` schema now explicitly separate **item priority** P/NP from **communication mode** T/C/P.

### Fixed

- `report_issue` handler now wraps the `getTenantName` DB call in a try/catch; a database failure no longer causes an unhandled exception — the issue is still created, just without tenant name.
- `ingestCsv` now strips the UTF-8 BOM before parsing, normalises CRLF to LF, and returns a richer error message on parse failure (row number, PapaParse error code, and a checklist).
- Row offset in parse error messages corrected: CSV line numbers now correctly include the header row (was off-by-one).
- `submit_ready_batch` ignored explicit barcode intent when dashboard was `customer-provides` — passing `barcodeStrategy` on the tool call now drives effective strategy and `genMID` resolution for that request (#20).

---

## [0.2.0] - 2026-04-13

### Samenvatting

**Nieuw**

- Barcode-strategie instelbaar per tenant: bpost genereert, klant levert zelf, of MCP genereert automatisch (#16).
- Batch controleren vóór verzending: adresvalidatie via bpost OptiAddress (MailingCheck), met per-rij feedback (OK / WARNING / ERROR).
- Batch effectief verzenden naar bpost — de volledige XML-envelop wordt opgebouwd en verstuurd, inclusief audit-metadata.
- Dashboard-sectie "Barcode-instellingen" voor strategie- en lengtevoorkeuren.
- Alpha-servicebanner op alle klantpagina's.
- Installatie-gids: stap-voor-stap aansluiten van Claude Desktop, Claude Code en Claude.ai.
- Kopieerbare codeblokken met klembord-knop op de installatiepagina.

**Oplossingen**

- Race condition bij gelijktijdig opslaan van barcode-voorkeuren verholpen (#16).
- Ongeldige barcode-nummers (niet-numeriek of verkeerde lengte) worden nu direct geweigerd.
- OAuth-aanmelding werkt nu correct op custom domeinen (bpost.sonicrocket.io e.a.) — niet meer gebonden aan het standaard Vercel-adres.
- Ontbrekende JWT-secret geeft nu een duidelijke fout bij het opstarten in plaats van een cryptische 500-error bij het eerste token-verzoek.
- Issue-rapportering werkt ook zonder `GITHUB_TOKEN` — gebruikers krijgen een vooringevulde GitHub-link.

**Aanpassingen**

- Batch-pipeline tools tonen nu stapnummers (1–6) met volgorde en vereisten.
- Home, installatie en dashboard hebben een vernieuwd UI met gedeelde designtokens.
- Flemish tone in server-instructies verfijnd: geen MCP-jargon naar gebruikers.

### Added

- Barcode strategy configuration: tenants can choose `bpost-generates`, `customer-provides`, or `mcp-generates` (#16).
- `barcodeCustomerId` field on BPost credentials for Mail ID program participation.
- MCP barcode generation: auto-generates 18-digit MID numbers (FCC 12 + week-based uniqueness).
- Dashboard "Barcode-instellingen" section for strategy and length preferences.
- `tenant_preferences` and `barcode_sequences` database tables.
- `check_batch` MCP tool: sends all batch rows to BPost OptiAddress for address-level pre-validation. Non-destructive — batch stays MAPPED and can be checked multiple times.
- `get_batch_errors` now shows both Zod validation errors and BPost OptiAddress errors/warnings per row.
- `submit_ready_batch` constructs the full `MailingRequest` XML envelope from mapped rows, sends to BPost, and stores submission metadata (mailingRef, row counts, BPost status, audit fields).
- `submit_ready_batch` input schema expanded to include `expectedDeliveryDate`, `format`, `mailingRef`, `priority`, `mode`, `customerFileRef`, `genMID`, `genPSC`. Auto-generates `mailingRef` when omitted.
- `AlphaServiceBanner` component for pre-release notices on home, install, and dashboard.
- `CopyCodeBlock` component with clipboard copy and accessible status for config snippets.
- Shared customer UI design tokens (`bp-btn`, `bp-card`, `bp-shell`, etc.) for home, install, and dashboard.
- Install guide for connecting Claude Desktop, Claude Code, and Claude.ai via OAuth or Bearer token.
- Test fixtures: sample CSV, mapping JSON, and BPost mock XML responses.
- Tests for `submit-batch`, `check-batch`, `app-version`, and `server-instructions`.

### Changed

- Server instructions include batch pipeline flow (steps 1–6), pre-submission checklist, communication modes (T/C/P), direct tools vs batch pipeline, and deposit/mailing linking guidance.
- All batch pipeline tool descriptions now show step numbers, prerequisites, next steps, and ordering constraints.
- `submit_ready_batch` replaced stub with real BPost XML dispatch. Batch stays MAPPED on BPost errors for retry.
- Home page shows `AlphaServiceBanner` and version number.
- Install page uses wider layout with method-choice cards and `CopyCodeBlock` for snippets.
- Dashboard uses card-based layout; BPost password optional on update when credentials already exist.
- `TokenRow` uses `nl-BE` date/time formatting and inline SVG trash control.
- Server instructions refined for Flemish tone; test-mode preference; no MCP jargon in user-facing messages.

### Fixed

- Barcode strategy `savePreferences` TOCTOU race: replaced select-then-upsert pattern with atomic `INSERT … ON CONFLICT DO UPDATE` (#16).
- Barcode strategy DB cast safety: corrupt preference values fall back to defaults with a logged error instead of silently casting.
- `customer-provides` midNum format: validates MID numbers against `/^[0-9]{14,18}$/` instead of a presence-only check.
- Barcode sequence overflow message now includes the ISO week number and states the limit is non-recoverable for that week.
- `report_issue` fallback: returns a prefilled GitHub "new issue" URL when `GITHUB_TOKEN` is unset or the API errors.
- OAuth on custom domains: metadata endpoints, authorize redirects, token `resource` matching, and JWT `iss`/`aud` now derive the public host from the request instead of only `NEXT_PUBLIC_BASE_URL`.
- OAuth resource URL alignment: token exchange accepts both origin and `/api/mcp` forms and allows omitting `resource` when bound to the canonical MCP resource.
- Missing `OAUTH_JWT_SECRET` now fails at startup with a clear validation error instead of a 500 on first token issuance.
- OAuth metadata on custom domains: both `bpost.sonicrocket.io` and `preview.bpost.sonicrocket.io` return correct issuer.

---

## [2.2.0] - 2026-04-11

### Samenvatting

**Nieuw**

- Adresvelden mappen via `Comps.1`, `Comps.3` enz. — geen handmatige rij-correcties meer nodig voor het meestvoorkomende geval ([#10](https://github.com/markminnoye/bpost-mcp/issues/10)).
- Rijnummers (`seq`) worden automatisch toegekend tijdens mapping.
- Versie-info opvraagbaar via het `get_service_info`-commando.

**Oplossingen**

- OAuth werkt nu correct op custom domeinen (zie 0.2.0 voor details).
- Issue-rapportering werkt zonder `GITHUB_TOKEN`.

**Aanpassingen**

- `NEXT_PUBLIC_BASE_URL` valt nu terug op `VERCEL_URL` (Vercel) of `localhost:3000` (lokaal) als het niet is ingesteld.

### Added

- Comps dot-notation in `apply_mapping_rules`: aggregate multiple CSV columns into the nested BPost `Comps` object using `Comps.<code>` syntax (e.g. `"Familienaam": "Comps.1"`). Eliminates manual `apply_row_fix` for address data ([#10](https://github.com/markminnoye/bpost-mcp/issues/10)).
- Automatic `seq` generation: auto-assigned from the 1-based row index during mapping when not explicitly mapped.
- Actionable Comps error hints: invalid mapping targets now explain the `Comps.<code>` syntax with a Belgian address example and list valid comp codes.
- `get_service_info` MCP tool: returns service name and version from `package.json`; server `serverInfo` reads version dynamically.
- OAuth resource URL helpers for canonical MCP URL and `resource` normalization.
- JWT signing accepts `issuerBaseUrl` and `expiresInOverride`; verification accepts multiple allowed issuer bases for custom-domain transitions.
- Tests for resource URL helpers, token interop, and JWT multi-issuer scenarios.

### Fixed

- `report_issue` returns a prefilled GitHub "new issue" URL when `GITHUB_TOKEN` is unset or the API errors.
- OAuth on custom domains: metadata, redirects, token matching, and JWT claims now derive the public host from the request (see 0.2.0 for full details).
- OAuth resource URL alignment: token exchange accepts equivalent origin and `/api/mcp` forms.
- Missing `OAUTH_JWT_SECRET` now fails at startup instead of on first token issuance.

### Changed

- `NEXT_PUBLIC_BASE_URL` falls back to `VERCEL_URL` on Vercel, then `http://localhost:3000` locally, when unset.

---

## [2.1.1] - 2026-04-10

### Samenvatting

**Aanpassingen**

- Redis-opslag overgeschakeld van Upstash REST naar een standaard TCP-client — compatibel met Vercel Marketplace Redis.
- Next.js beveiligingsupdate (16.2.1 naar 16.2.3).

### Changed

- Batch KV storage switched from `@upstash/redis` (REST) to the official `redis` TCP client using `REDIS_URL`, matching Vercel Marketplace Redis.

### Removed

- `@upstash/redis` dependency (superseded by `redis`).

### Dependencies

- Next.js 16.2.1 → 16.2.3 (addresses Server Components DoS advisory per `npm audit`).

### Documentation

- README and `.env.example` updated: `REDIS_URL` replaces `KV_REST_`* / Vercel KV REST vars.

---

## [2.1.0] - 2026-04-10

### Samenvatting

**Nieuw**

- Installatiepagina (`/install`): stap-voor-stap gids voor Claude Desktop en Claude Code — OAuth en Bearer Token, met kopieerbare snippets.
- Tokens verwijderen vanuit het dashboard (trash-icoon met bevestigingsdialoog).
- Drie zelflerend-tools: protocol-regels opslaan, fix-scripts bewaren, en problemen escaleren naar een mens.
- Alle environment variables worden nu bij het opstarten gevalideerd — ontbrekende waarden geven een duidelijke foutmelding.
- ESLint-configuratie toegevoegd.

**Oplossingen**

- Dashboard-redirect na Google-login werkt nu correct.
- CLI-snippets voor Claude Code gecorrigeerd (`--transport http`).
- Alle `any`-types in de codebase vervangen door correcte types.

### Added

- `/install` page: public-facing installation guide for Claude Desktop and Claude Code. Covers OAuth 2.0 and Bearer Token methods with copy-ready config snippets. Includes jump-nav and comparison cards.
- "How to connect" entry points added to homepage and dashboard.
- Token revocation UI: trash icon on each dashboard token row opens a confirmation modal for hard-deleting the token. `lastUsedAt` indicator replaces static ACTIVE/REVOKED badge.
- `revokeToken` server action: validates UUID, verifies ownership, hard-deletes the token, returns typed `ActionResult`.
- Self-Learning & Feedback MCP tools: `add_protocol_rule`, `add_fix_script`, `escalate_to_human`.
- Env var centralisation via Zod validation at startup; replaces scattered `process.env` accesses.
- `check:hardcoded` script: fails the build if hardcoded `vercel.app` URLs are found in `src/`.
- `check:all` script: runs lint + type-check + tests + hardcoded-URL check.
- ESLint 10 + `eslint-config-next` configured.

### Fixed

- Dashboard sign-in redirect: users now correctly return to `/dashboard` after Google OAuth.
- Claude Code CLI snippets corrected to include `--transport http`.
- Install page fallback URL updated to `bpost.sonicrocket.io`.
- External link security: added `rel="noopener noreferrer"` to "Skills Documentation" link.
- Replaced all 8 `any` casts with proper types across upload route, dashboard, auth, and KV client.
- Removed unused variables and catch bindings across token row, bpost client, next-auth types, and MCP route.

---

## [2.0.1] - 2026-04-08

### Samenvatting

**Oplossingen**

- Batch-pipeline robuuster: ongeldige data wordt niet meer opgeslagen bij een mislukte rij-correctie.
- Redis-schrijffouten geven nu een gestructureerde foutmelding in plaats van een onafgevangen uitzondering.
- `get_raw_headers` toont nu ook het aantal fouten, zodat de agent een extra stap bespaart.
- Een batch die al gemapt is kan opnieuw gemapt worden (alleen SUBMITTED is definitief).

### Fixed

- `apply_row_fix` no longer persists unvalidated `correctedData` to KV on re-validation failure (data pollution fix).
- `apply_mapping_rules`, `apply_row_fix`, `submit_ready_batch` now return structured `isError` responses on Redis write failure instead of propagating unhandled exceptions.
- `get_raw_headers` returns `errorCount` alongside `totalRows` when batch status is MAPPED or SUBMITTED, saving agents a round-trip.
- `apply_mapping_rules` now allows re-mapping a MAPPED batch; only SUBMITTED batches cannot be re-mapped.
- Upload route catch clause uses `unknown` instead of `any` with type-safe message extraction.

### Added

- `requireTenantId` shared helper: eliminates 8x duplicated tenantId extraction across MCP tool handlers.

---

## [2.0.0] - 2026-04-07

### Samenvatting

**Nieuw**

- OAuth 2.0 voor MCP: aanmelden via Google in de browser — geen handmatig token meer kopiëren.
- Volledige OAuth-server: autorisatie, token-uitwisseling, refresh-tokens, dynamische client-registratie.
- JWT access tokens (1 uur) en refresh tokens (90 dagen) met rotatie.
- PKCE-beveiliging verplicht voor alle autorisatie-flows.
- Dashboard toont MCP-verbindingsgegevens voor Claude Desktop.
- Favicons en PWA-iconen toegevoegd.

**Beveiliging**

- Autorisatiecodes worden gehasht (SHA-256) en zijn eenmalig bruikbaar.
- Refresh-tokens worden geroteerd — het oude token wordt ingetrokken bij vernieuwing.
- Alle secrets worden gehasht vóór opslag; BPost-wachtwoorden blijven AES-256-GCM versleuteld.

### Added

- OAuth 2.0 MCP integration: Claude.ai/Desktop authenticates via standard browser-based Google login.
- OAuth Authorization Server: `/oauth/authorize` (PKCE S256), `/oauth/token` (authorization_code + refresh_token grants), `/oauth/register` (RFC 7591 Dynamic Client Registration), `/.well-known/oauth-protected-resource` (RFC 9728), `/.well-known/oauth-authorization-server` (RFC 8414).
- JWT support: HS256 access tokens (1h) via `jose`; refresh tokens (90d, stateful in DB).
- PKCE S256 enforcement mandatory for all authorization code flows.
- Client ID Metadata Documents as preferred client resolution per MCP spec.
- Unified token verification: OAuth JWT and legacy `bpost`_* M2M tokens both accepted at MCP boundary.
- 3 new DB tables: `oauth_clients`, `oauth_authorization_codes`, `oauth_refresh_tokens`.
- Dashboard "Claude / MCP Clients" section showing MCP URL for Claude Desktop.
- Favicons & PWA: PNG icons, `apple-touch-icon.png`, `site.webmanifest`.

### Changed

- MCP route migrated from raw `@modelcontextprotocol/sdk` to `mcp-handler` + `withMcpAuth` with `requiredScopes: ['mcp:tools']`.
- `@modelcontextprotocol/sdk` moved to `devDependencies` (type-only import).
- Page title updated to "BPost MCP".

### Security

- Authorization codes SHA-256 hashed and single-use (`used_at` prevents replay).
- Refresh token rotation — old token revoked before new token issued.
- PKCE mandatory — no authorization code without `code_challenge`.
- All secrets hashed before DB storage; BPost credentials remain AES-256-GCM encrypted.

---

## [1.3.0] - 2026-04-05

### Samenvatting

**Nieuw**

- Multi-tenant dashboard voor BPost-instellingen en API-tokens.
- BPost-wachtwoorden versleuteld opgeslagen (AES-256-GCM).
- Inloggen via Google OAuth.
- API-tokens aanmaken en intrekken voor machine-to-machine clients (Langflow, n8n).
- Audit-logging voor alle wijzigingen en MCP-aanroepen.
- Bulk-batch-ondersteuning via Vercel KV.

### Added

- Multi-tenant Dashboard (`/dashboard`): manage BPost credentials and API tokens per tenant.
- Credential encryption: AES-256-GCM for BPost passwords at rest.
- Auth.js v5 integration: Google OAuth login for dashboard access.
- API token management: generate/revoke `bpost_`* bearer tokens for M2M clients (Langflow, n8n).
- Audit logging: credential changes and MCP calls logged to `audit_log` table.
- KV batch pipeline: bulk batch announcement support with Vercel KV.

### Fixed

- `signOut` wrapped in server action to resolve 500 error.
- Credential field validation added to dashboard form.

---

## [1.2.0] - 2026-04-03

### Samenvatting

**Aanpassingen**

- Phase 1 afgerond: alle BPost actie-schema's (Deposit en Mailing CRUD, Check, Reuse) volledig geïmplementeerd op basis van de XSD-bronnen.

### Changed

- Phase 1 complete: all action sub-schemas (`DepositCreate`, `DepositUpdate`, `DepositDelete`, `DepositValidate`, `MailingCreate`, `MailingCheck`, `MailingDelete`, `MailingReuse`) fully implemented from XSD sources. Response schemas added.

---

## [1.1.0] - 2026-03-29

### Samenvatting

**Aanpassingen**

- Documentatiebibliotheek gestandaardiseerd met een volledige XSD-audit (BUG-001).
- Alle technische referenties hernoemd naar "e-MassPost" voor consistentie.
- Engelse lokalisatie van de protocoldocumentatie.

### Changed

- Submodule upgrade (v1.1.0): standardized the documentation library with a full XSD-compliant audit (BUG-001).
- Naming unification: renamed all technical references to **e-MassPost** for consistency.

### Added

- Build automation: integrated automated version management for skill bundles.
- English localization: fully localized the protocol documentation and build instructions.
- Formal audit record: added systematic audit log and agent feedback loops to `AGENTS.md`.

---

## [1.0.0] - 2026-03-27

### Samenvatting

Eerste release: projectstructuur met Vercel, TypeScript en Zod. BPost e-MassPost Skills Library als git-submodule geïntegreerd. Protocoldocumentatie gemigreerd en voorzien van Mermaid-diagrammen.

### Added

- Initial project structure with Vercel/TypeScript/Zod.
- Integrated `e-masspost-skills` library as a git submodule.
- Migrated legacy BPost documentation to the Skills Library format.
- Added Mermaid diagrams for technical protocol flows.