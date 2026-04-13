# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- *(nothing yet — all items below are part of 0.2.0)*

---

## [0.2.0] - 2026-04-13

### Added

- Barcode strategy configuration: tenants can choose `bpost-generates`, `customer-provides`, or `mcp-generates` (#16)
- `barcodeCustomerId` field on BPost credentials for Mail ID program participation
- MCP barcode generation: auto-generates 18-digit MID numbers (FCC 12 + week-based uniqueness)
- Dashboard "Barcode-instellingen" section for strategy and length preferences
- `tenant_preferences` and `barcode_sequences` database tables
- `**check_batch` MCP tool** (`src/lib/batch/check-batch.ts`): New service function for BPost OptiAddress (MailingCheck) pre-validation. Sends all batch rows to BPost for address-level validation before submission. Mirrors `submit-batch.ts` pattern. Can be called multiple times (non-destructive, batch stays MAPPED).
- `**BpostValidationItem*`* (`src/lib/kv/client.ts`): New type stored on `BatchRow.bpostValidation` — tracks checkedAt timestamp, status (OK/ERROR/WARNING), BPost status code/message, and address correction suggestions.
- `**get_batch_errors` expanded**: Now shows both Zod validation errors AND BPost OptiAddress errors/warnings. Agents can see per-row BPost feedback alongside field validation failures.
- `**src/lib/batch/submit-batch.ts`**: Service function that constructs the full `MailingRequest` XML envelope from batch rows + mailing-level params + tenant credentials, sends to BPost, and returns a structured result.
- `**SubmissionRecord**` (`src/lib/kv/client.ts`): New type tracking submission params, row counts, BPost response status, user/client audit fields. Stored as `submission?` on `BatchState` in Redis.
- `**submit_ready_batch` input schema** (`src/app/api/mcp/route.ts`): Expanded from `{ batchId }` to include `expectedDeliveryDate`, `format`, `mailingRef`, `priority` (default NP), `mode` (default T), `customerFileRef`, `genMID` (default 7), `genPSC` (default N). Auto-generates `mailingRef` as `B-YYYYMMDD-HHmm` when omitted.
- `**AlphaServiceBanner`** (`src/components/customer/AlphaServiceBanner.tsx`): Reusable alpha-warning banner for pre-release notices; used on home, install, and dashboard.
- `**CopyCodeBlock**` (`src/components/customer/CopyCodeBlock.tsx`): Client component with clipboard copy and accessible status for JSON/CLI snippets.
- **Shared customer UI surface** (`src/app/globals.css`): Design tokens and utility classes (`bp-btn`, `bp-card`, `bp-shell`, `bp-install-card`, `bp-code-block`, `bp-icon-btn`, form patterns, dialog styles) for home, install, and dashboard; root `body` uses `bp-customer-body` with Geist font variables.
- **Install guide** (`docs/install/install-prompt.md`): Non-technical step-by-step guide for connecting Claude Desktop, Claude Code, and Claude.ai via OAuth or Bearer token.
- **Tests fixtures** (`tests/fixtures/`): Sample CSV, mapping JSON, and BPost mock XML responses for batch pipeline testing.
- **Tests**: `submit-batch.test.ts` — XML construction, priority fallback, numeric conversion, BPost error handling; `check-batch.test.ts` — MailingCheck parsing, OK/WARNING/ERROR counting, retryable error handling; `app-version.test.ts` and `server-instructions.test.ts` validate version export and Flemish tone respectively.

### Changed

- **Server instructions** (`src/lib/mcp/server-instructions.ts`): Added agent orchestration guidance — batch pipeline flow (steps 1–6), pre-submission checklist, communication modes (T/C/P), direct tools vs batch pipeline, deposit/mailing master/slave linking, and upcoming `check_batch` note.
- **Tool descriptions** (`src/app/api/mcp/route.ts`): All batch pipeline tools now show step numbers (1–6), prerequisites, next steps, and ordering constraints. Direct tools (`bpost_announce_mailing`, `bpost_announce_deposit`) clarified as non-pipeline with deposit/mailing linking guidance.
- `**submit_ready_batch`** (`src/app/api/mcp/route.ts`): Replaced stub with real BPost XML dispatch. Builds a `MailingCreate` request from mapped batch rows, sends via `BpostClient`, and stores submission metadata (mailingRef, row counts, BPost status, user/client ID) in `BatchState`. Batch stays `MAPPED` on BPost errors for retry.
- **Home** (`src/app/page.tsx`): Call-to-action links use shared `bp-btn` classes; shows `AlphaServiceBanner` and `APP_VERSION`.
- **Install** (`src/app/install/page.tsx`): Wider `bp-shell` layout; method-choice cards via `bp-install-card`; install snippets wrapped with `CopyCodeBlock`; primary/secondary actions aligned with `bp-btn`; `CopyInstallPromptButton` uses `bp-btn bp-btn--primary`.
- **Dashboard** (`src/app/dashboard/page.tsx`): Card-based "accountinstellingen" layout; BPost password optional on update when credentials already exist (server action preserves prior ciphertext when the field is left blank); MCP connection / install copy removed from this page; "Terug naar start" uses `next/link`.
- `**TokenRow`** (`src/app/dashboard/TokenRow.tsx`): `nl-BE` date/time formatting; trash control as inline SVG + `bp-icon-btn`; confirmation dialog uses shared button classes.
- `**server-instructions**` (`src/lib/mcp/server-instructions.ts`): Refined Flemish tone guidance; test-mode preference; no MCP jargon in user-facing messages.

### Fixed

- **Barcode strategy — `savePreferences` TOCTOU race**: Replaced select-then-insert/update pattern with a single atomic `INSERT … ON CONFLICT DO UPDATE`, eliminating the race condition under concurrent requests.
- **Barcode strategy — `get-preferences.ts` unsafe DB cast**: Added `TenantPreferencesSchema` with `z.enum` validation and `safeParse`; corrupt DB values now fall back to DEFAULTS with a logged error instead of silently casting.
- **Barcode strategy — `customer-provides` midNum format**: Validates supplied MID numbers against `/^[0-9]{14,18}$/` instead of a presence-only check, rejecting non-numeric or out-of-range values immediately.
- **Barcode strategy — sequence overflow message**: Overflow error for `mcp-generates` now includes the current ISO week number and explicitly states the limit is non-recoverable for the remainder of that week.
- `**report_issue` fallback without `GITHUB_TOKEN`**: When `GITHUB_TOKEN` is unset on the server, the tool returns a prefilled GitHub "new issue" URL so users can still report issues in the browser; the same fallback link is also included on GitHub API errors.
- **Claude Desktop / MCP OAuth on custom domains**: OAuth metadata (`.well-known/oauth-authorization-server`, `.well-known/oauth-protected-resource`), authorize redirects, token `resource` matching, and JWT `iss`/`aud` now derive the public host from `getPublicOrigin(request)` instead of only `NEXT_PUBLIC_BASE_URL`, so the same deployment works when users hit a custom domain while env still points at the default deployment hostname.
- **OAuth resource URL alignment**: Protected resource metadata and stored auth codes use a canonical MCP URL (`{origin}/api/mcp`); token exchange accepts equivalent origin vs `/api/mcp` forms and allows omitting `resource` on the token request when the code was bound to the canonical MCP resource (client interop).
- **Opaque 500 on `/oauth/token` when JWT secret missing**: `OAUTH_JWT_SECRET` is required in `env.ts` (Zod) so misconfigured deployments fail at startup with a clear validation error instead of at first token issuance.
- **OAuth metadata on custom domains**: Both `bpost.sonicrocket.io` and `preview.bpost.sonicrocket.io` now return correct issuer in `.well-known/oauth-authorization-server` — custom domain, not `*.vercel.app`.

### Changed

- **Server instructions** (`src/lib/mcp/server-instructions.ts`): Added agent orchestration guidance — batch pipeline flow (steps 1–6), pre-submission checklist, communication modes (T/C/P), direct tools vs batch pipeline, deposit/mailing master/slave linking, and upcoming `check_batch` note.
- **Tool descriptions** (`src/app/api/mcp/route.ts`): All batch pipeline tools now show step numbers (1–6), prerequisites, next steps, and ordering constraints. Direct tools (`bpost_announce_mailing`, `bpost_announce_deposit`) clarified as non-pipeline with deposit/mailing linking guidance.
- `**submit_ready_batch`** (`src/app/api/mcp/route.ts`): Replaced stub with real BPost XML dispatch. Builds a `MailingCreate` request from mapped batch rows, sends via `BpostClient`, and stores submission metadata (mailingRef, row counts, BPost status, user/client ID) in `BatchState`. Batch stays `MAPPED` on BPost errors for retry.
- **Home** (`src/app/page.tsx`): Call-to-action links use shared `bp-btn` classes; shows `AlphaServiceBanner` and `APP_VERSION`.
- **Install** (`src/app/install/page.tsx`): Wider `bp-shell` layout; method-choice cards via `bp-install-card`; install snippets wrapped with `CopyCodeBlock`; primary/secondary actions aligned with `bp-btn`; `CopyInstallPromptButton` uses `bp-btn bp-btn--primary`.
- **Dashboard** (`src/app/dashboard/page.tsx`): Card-based "accountinstellingen" layout; BPost password optional on update when credentials already exist (server action preserves prior ciphertext when the field is left blank); MCP connection / install copy removed from this page; "Terug naar start" uses `next/link`.
- `**TokenRow`** (`src/app/dashboard/TokenRow.tsx`): `nl-BE` date/time formatting; trash control as inline SVG + `bp-icon-btn`; confirmation dialog uses shared button classes.
- `**server-instructions**` (`src/lib/mcp/server-instructions.ts`): Refined Flemish tone guidance; test-mode preference; no MCP jargon in user-facing messages.

### Fixed

- **Barcode strategy — `savePreferences` TOCTOU race**: Replaced select-then-insert/update pattern with a single atomic `INSERT … ON CONFLICT DO UPDATE`, eliminating the race condition under concurrent requests.
- **Barcode strategy — `get-preferences.ts` unsafe DB cast**: Added `TenantPreferencesSchema` with `z.enum` validation and `safeParse`; corrupt DB values now fall back to DEFAULTS with a logged error instead of silently casting.
- **Barcode strategy — `customer-provides` midNum format**: Validates supplied MID numbers against `/^[0-9]{14,18}$/` instead of a presence-only check, rejecting non-numeric or out-of-range values immediately.
- **Barcode strategy — sequence overflow message**: Overflow error for `mcp-generates` now includes the current ISO week number and explicitly states the limit is non-recoverable for the remainder of that week.
- `**report_issue` fallback without `GITHUB_TOKEN`**: When `GITHUB_TOKEN` is unset on the server, the tool returns a prefilled GitHub "new issue" URL so users can still report issues in the browser; the same fallback link is also included on GitHub API errors.
- **Claude Desktop / MCP OAuth on custom domains**: OAuth metadata (`.well-known/oauth-authorization-server`, `.well-known/oauth-protected-resource`), authorize redirects, token `resource` matching, and JWT `iss`/`aud` now derive the public host from `getPublicOrigin(request)` instead of only `NEXT_PUBLIC_BASE_URL`, so the same deployment works when users hit a custom domain while env still points at the default deployment hostname.
- **OAuth resource URL alignment**: Protected resource metadata and stored auth codes use a canonical MCP URL (`{origin}/api/mcp`); token exchange accepts equivalent origin vs `/api/mcp` forms and allows omitting `resource` on the token request when the code was bound to the canonical MCP resource (client interop).
- **Opaque 500 on `/oauth/token` when JWT secret missing**: `OAUTH_JWT_SECRET` is required in `env.ts` (Zod) so misconfigured deployments fail at startup with a clear validation error instead of at first token issuance.

---

## [2.2.0] - 2026-04-11

### Added

- **Comps dot-notation in `apply_mapping_rules`**: Multiple CSV columns can now be aggregated into the nested BPost `Comps` object using `Comps.<code>` syntax (e.g. `"Familienaam": "Comps.1"`, `"Straatnaam": "Comps.3"`). Eliminates the need for manual `apply_row_fix` on every row for address data — the most common use case. ([#10](https://github.com/markminnoye/bpost-mcp/issues/10))
- **Automatic `seq` generation**: `seq` is now auto-assigned from the 1-based row index during mapping when not explicitly mapped, removing a mandatory manual correction step.
- **Actionable Comps error hints**: When mapping targets are invalid, the error message now explains the `Comps.<code>` syntax with a concrete Belgian address example and lists valid comp codes.
- `**src/lib/batch/apply-mapping.ts`**: Pure mapping function handling flat fields, Comps aggregation, and seq auto-generation.
- `**src/lib/batch/validate-mapping-targets.ts**`: Target validator accepting `ItemSchema` flat fields and valid `Comps.<code>` entries with descriptive hints.
- `**get_service_info` MCP tool**: Returns `{"service":"bpost-emasspost","version":"<package.json version>"}`; enables agents and users to query the service version. Server `serverInfo` now reads version from `package.json` dynamically instead of a hardcoded string.
- `**src/lib/app-version.ts`**: Single source of truth for `APP_VERSION` and `MCP_SERVER_DISPLAY_NAME`, imported by the MCP route.
- `**src/lib/oauth/resource-url.ts**`: Helpers for canonical MCP resource URL and OAuth `resource` normalization / token-endpoint matching.
- **JWT signing options** (`src/lib/oauth/jwt.ts`): `signAccessToken` accepts `{ issuerBaseUrl, expiresInOverride }`; `verifyAccessToken` accepts multiple allowed issuer bases for custom-domain + env transition.
- `**jwtAllowedIssuerBases`** (`src/lib/oauth/verify-token.ts`): Verifies OAuth JWTs against request origin and configured base when they differ.
- **Tests**: `resource-url.test.ts`, token interop case for omitted `resource`, JWT multi-issuer tests; OAuth/MCP request URLs use `http://localhost:3000` to match Vitest `NEXT_PUBLIC_BASE_URL`; `vitest.config.ts` sets `OAUTH_JWT_SECRET` for the worker.

### Fixed

- `**report_issue` fallback without `GITHUB_TOKEN`**: When `GITHUB_TOKEN` is unset on the server, the tool returns a prefilled GitHub "new issue" URL so users can still report issues in the browser; the same fallback link is also included on GitHub API errors.
- **Claude Desktop / MCP OAuth on custom domains**: OAuth metadata (`.well-known/oauth-authorization-server`, `.well-known/oauth-protected-resource`), authorize redirects, token `resource` matching, and JWT `iss`/`aud` now derive the public host from `getPublicOrigin(request)` instead of only `NEXT_PUBLIC_BASE_URL`, so the same deployment works when users hit a custom domain while env still points at the default deployment hostname.
- **OAuth resource URL alignment**: Protected resource metadata and stored auth codes use a canonical MCP URL (`{origin}/api/mcp`); token exchange accepts equivalent origin vs `/api/mcp` forms and allows omitting `resource` on the token request when the code was bound to the canonical MCP resource (client interop).
- **Opaque 500 on `/oauth/token` when JWT secret missing**: `OAUTH_JWT_SECRET` is required in `env.ts` (Zod) so misconfigured deployments fail at startup with a clear validation error instead of at first token issuance.

### Changed

- `**NEXT_PUBLIC_BASE_URL` resolution** (`env.ts`): Falls back to `VERCEL_URL` on Vercel, then `http://localhost:3000` locally, when unset; operators should still set an explicit canonical URL for dashboard/install copy.

---

## [2.1.1] - 2026-04-10

### Changed

- **Batch KV storage** (`src/lib/kv/client.ts`): Switched from `@upstash/redis` (REST / `UPSTASH_REDIS_*`) to the official `[redis](https://www.npmjs.com/package/redis)` TCP client using `REDIS_URL`, matching Vercel Marketplace Redis and avoiding deprecated `@vercel/kv`. Batch state is stored as JSON strings with the same key layout and 24h TTL.

### Removed

- **Dependency**: `@upstash/redis` (superseded by `redis` for this integration).

### Dependencies

- **Next.js** `16.2.1` → `16.2.3` (addresses published Server Components DoS advisory per `npm audit`).

### Documentation

- **README** / `**.env.example`**: Document `REDIS_URL` and Marketplace Redis instead of `KV_REST_*` / Vercel KV REST vars.

---

## [2.1.0] - 2026-04-10

### Added

- `**/install` page** (`src/app/install/page.tsx`): Public-facing installation guide for connecting Claude Desktop and Claude Code to the BPost MCP service. Covers OAuth 2.0 (recommended) and Bearer Token methods with copy-ready config snippets. No login required. Includes jump-nav, comparison cards with hover effects, and a page-level `metadata` export for SEO.
- **"How to connect" entry points**: Button added to homepage and link added to the dashboard "Claude / MCP Clients" section, both pointing to `/install`.
- **Token revocation UI** (`src/app/dashboard/TokenRow.tsx`): Trash icon on each dashboard token row opens a confirmation modal for hard-deleting the token. Replaces the static ACTIVE/REVOKED badge with a `lastUsedAt` indicator.
- `**revokeToken` server action** (`src/app/dashboard/actions.ts`): Validates UUID input, verifies ownership, hard-deletes the token, and returns a typed `ActionResult` union — no `redirect()` inside the action.
- **Self-Learning & Feedback MCP tools** (Phase 2 Sprint 3): Three new tools added to the MCP handler:
  - `add_protocol_rule` — writes discovered BPost protocol rules to the shared knowledge base
  - `add_fix_script` — persists auto-fixer scripts for reuse across sessions
  - `escalate_to_human` — surfaces unresolvable issues for human review
- **Env var centralisation** (`src/lib/config/env.ts`): All environment variables validated at startup via Zod; replaces scattered `process.env` accesses.
- `**check:hardcoded` script**: `npm run check:hardcoded` fails the build if any hardcoded `vercel.app` URLs are found in `src/`.
- `**check:all` script**: Runs lint + type-check + tests + hardcoded-URL check in one command.
- **ESLint setup**: ESLint 10 + `eslint-config-next` installed and wired up (`eslint.config.mjs`). `npm run lint` and `npm run lint:fix` now work correctly under Next.js 16.

### Fixed

- **Dashboard sign-in redirect**: After Google OAuth, users are now correctly returned to `/dashboard` (`callbackUrl=/dashboard` added to sign-in redirect).
- **Claude Code CLI snippets**: Corrected `claude mcp add` syntax to include `--transport http`.
- **Fallback `BASE_URL`**: Install page fallback updated to `bpost.sonicrocket.io`.
- **External link security**: Added `rel="noopener noreferrer"` to the "Skills Documentation" link on the homepage.
- `**no-explicit-any` across codebase**: Replaced all 8 `any` casts with proper types (`unknown`, typed session augmentation). Affected: `upload/route.ts`, `dashboard/page.tsx`, `dashboard/actions.ts`, `lib/auth.ts`, `lib/kv/client.ts`.
- **Unused variables**: Removed unused `isModalOpen` state (`TokenRow.tsx`), unused `BpostError` import (`client/bpost.ts`), unused `NextAuth` import (`next-auth.d.ts`), unused `tenantId` variable in MCP route.
- **Unused catch bindings**: `catch (error: any)` / `catch (err)` → `catch` where the error is never used (`oauth/register/route.ts`, `api/mcp/route.ts`).

---

## [2.0.1] - 2026-04-08

### Fixed

- **Batch pipeline hardening**: `apply_row_fix` no longer persists unvalidated `correctedData` to KV on re-validation failure (data pollution fix)
- **KV write resilience**: `apply_mapping_rules`, `apply_row_fix`, `submit_ready_batch` now return structured `isError` responses on Redis write failure instead of propagating unhandled exceptions
- `**get_raw_headers`**: Returns `errorCount` alongside `totalRows` when batch status is `MAPPED` or `SUBMITTED`, saving agents a round-trip
- `**apply_mapping_rules**`: Now allows re-mapping a `MAPPED` batch; only `SUBMITTED` batches cannot be re-mapped
- **Upload route**: `catch (error: any)` replaced with `unknown` + type-safe message extraction

### Added

- `**requireTenantId` helper** (`src/lib/mcp/require-tenant.ts`): Shared guard eliminating 8× duplicated tenantId extraction across MCP tool handlers

---

## [2.0.0] - 2026-04-07

### Added

- **OAuth 2.0 MCP Integration**: Claude.ai/Desktop can now authenticate via standard browser-based Google login — no more manual bearer token copy-paste.
- **OAuth Authorization Server** (custom Next.js implementation):
  - `GET /oauth/authorize` — PKCE S256, client resolution, Auth.js session check, BPost credential verification, auth code generation
  - `POST /oauth/token` — `authorization_code` and `refresh_token` grants with rotation
  - `POST /oauth/register` — Dynamic Client Registration (RFC 7591)
  - `GET /.well-known/oauth-protected-resource` — RFC 9728 Protected Resource Metadata
  - `GET /.well-known/oauth-authorization-server` — RFC 8414 Authorization Server Metadata
- **JWT support**: HS256 access tokens (1h) via `jose`; refresh tokens (90d, stateful in DB)
- **PKCE S256 enforcement**: Mandatory for all authorization code flows
- **Client ID Metadata Documents**: Preferred client resolution mechanism per MCP spec
- **Unified token verification**: OAuth JWT and legacy `bpost_*` M2M tokens both accepted at MCP boundary
- **3 new DB tables**: `oauth_clients`, `oauth_authorization_codes`, `oauth_refresh_tokens`
- **Dashboard**: "Claude / MCP Clients" section showing MCP URL for Claude Desktop
- **Favicons & PWA**: PNG icons (16×16, 32×32, 192×192, 512×512), `apple-touch-icon.png`, `site.webmanifest`; wired into root layout via Next.js metadata API

### Changed

- **MCP route** (`/api/mcp`): Migrated from raw `@modelcontextprotocol/sdk` to `mcp-handler` + `withMcpAuth`; `requiredScopes: ['mcp:tools']` enforced
- `**@modelcontextprotocol/sdk`**: Moved to `devDependencies` (type-only import)
- **Page title**: Updated to "BPost MCP"

### Security

- Authorization codes SHA-256 hashed and single-use (`used_at` prevents replay)
- Refresh token rotation — old token revoked before new token issued
- PKCE mandatory — no authorization code without `code_challenge`
- All secrets hashed before DB storage; BPost credentials remain AES-256-GCM encrypted

---

## [1.3.0] - 2026-04-05

### Added

- **Multi-tenant Dashboard** (`/dashboard`): Manage BPost credentials and API tokens per tenant
- **Credential encryption**: AES-256-GCM for BPost passwords at rest
- **Auth.js v5 integration**: Google OAuth login for dashboard access
- **API token management**: Generate/revoke `bpost_`* bearer tokens for M2M clients (Langflow, n8n)
- **Audit logging**: Credential changes and MCP calls logged to `audit_log` table
- **KV batch pipeline**: Bulk batch announcement support with Vercel KV

### Fixed

- `signOut` wrapped in server action to resolve 500 error
- Credential field validation added to dashboard form

---

## [1.2.0] - 2026-04-03

### Changed

- **Phase 1 Complete**: All action sub-schemas (`DepositCreate`, `DepositUpdate`, `DepositDelete`, `DepositValidate`, `MailingCreate`, `MailingCheck`, `MailingDelete`, `MailingReuse`) fully implemented from XSD sources. Response schemas (`deposit-response.ts`, `mailing-response.ts`) added.
- **AGENTS.md**: Updated active work section to reflect Phase 1 completion; removed in-progress implementation notes.
- **next-env.d.ts**: Updated route types import path to `.next/dev/types/routes.d.ts` (Next.js tooling update, auto-generated).
- **Claude settings**: Accumulated session permissions in `.claude/settings.local.json` for local tooling operations.

---

## [1.1.0] - 2026-03-29

### Changed

- **Submodule Upgrade (v1.1.0)**: Standardized the documentation library with a full XSD-compliant audit (BUG-001).
- **Naming Unification**: Renamed and unified all technical references to **e-MassPost** for consistency across the codebase and Skills Library.

### Added

- **Build Automation**: Integrated automated version management for skill bundles.
- **English Localization**: Fully localized the protocol documentation and build instructions.
- **Formal Audit Record**: Added systematic audit log and agent feedback loops to `AGENTS.md`.
- **Documentation Audit (2026-03-28)**: A systematic audit (BUG-001) identified several casing and naming inconsistencies between the e-MassPost Markdown files and the source XSDs. Key fixes included lowercase attribute names for `<Context>` tags and mapping `fieldToPrint1-3` to `distributionOffice/routeName/routeSeq` in responses. Always prioritize `.xsd` files in `resources/` as the absolute source of truth.

## [1.0.0] - 2026-03-27

### Added

- Initial project structure with Vercel/TypeScript/Zod.
- Integrated `e-masspost-skills` library as a git submodule.
- Migrated legacy BPost documentation to the Skills Library format.
- Added Mermaid diagrams for technical protocol flows.