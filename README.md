# BPost MCP

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that bridges AI agents with BPost's **e-MassPost API** — Belgium's postal service for mass mail sorting and delivery batch announcements.

BPost's API requires XML payloads, strict field validation, and cryptic error codes. BPost MCP translates between JSON-native AI agents and the raw postal protocol, so agents can safely validate and submit mailings without understanding low-level HTTP/XML mechanics.

**Current version:** v0.3.0 — MCP resources/prompts, full `serverInfo` metadata, and OAuth 2.0 MCP integration

---

## MCP Surface

### Tools (15)

#### Batch pipeline (recommended for CSV mailings)

| Tool | Description |
|------|-------------|
| `upload_batch_file` | **Agent-native upload (preferred):** accepts base64-encoded CSV content, authenticates server-side, returns `batchId` |
| `get_upload_instructions` | Manual fallback: returns `curl` command details for environments where `upload_batch_file` cannot be used |
| `get_raw_headers` | Fetch raw CSV column headers after upload |
| `apply_mapping_rules` | Map raw columns to BPost schema fields |
| `get_batch_errors` | Retrieve validation errors row-by-row |
| `apply_row_fix` | Patch individual rows with corrected values |
| `check_batch` | Pre-validate addresses via BPost OptiAddress before submission |
| `submit_ready_batch` | Submit the validated batch to BPost |
| `apply_fix_script` | Run a saved fix script on one row, then re-validate |

#### Protocol knowledge / operations

| Tool | Description |
|------|-------------|
| `get_service_info` | Return service name + semantic version |
| `add_protocol_rule` | Append a discovered protocol rule to the shared knowledge base |
| `create_fix_script` | Save reusable TypeScript/JavaScript row-fix logic |
| `report_issue` | Create (or prepare) a GitHub issue for protocol/server problems |

#### Direct BPost API

| Tool | Description |
|------|-------------|
| `bpost_announce_deposit` | Announce a mail deposit (Create / Update / Delete / Validate) |
| `bpost_announce_mailing` | Announce a mailing batch with structured validation |

All tools require a Bearer token in the `Authorization` header.

### Resources (3)

- `bpost://guides/mapping-glossary`
- `bpost://guides/mode-priority-matrix`
- `bpost://guides/common-error-guidance`

### Prompts (3)

- `batch_onboarding_flow`
- `batch_error_triage_fix_loop`
- `submit_preflight_confirmation`

---

## Claude Desktop Configuration

Add the following to your Claude Desktop config file.

**Config file locations:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bpost": {
      "type": "http",
      "url": "https://bpost.sonicrocket.be/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```

Replace `<your-token>` with either:
- An **OAuth 2.0 access token** obtained via the [dashboard](https://bpost.sonicrocket.be/dashboard)
- A **legacy M2M token** (`bpost_…`) generated in the dashboard for Langflow/n8n integrations

---

## Getting a Token

1. Sign in at [https://bpost.sonicrocket.be/dashboard](https://bpost.sonicrocket.be/dashboard) with your Google account.
2. Navigate to **API Tokens** and generate a new token.
3. Copy the token — it is shown only once.

For OAuth 2.0 clients (e.g., Claude Desktop with dynamic client registration), the authorization server metadata is available at:

```
https://bpost.sonicrocket.be/.well-known/oauth-authorization-server
```

PKCE (`S256`) is mandatory for all OAuth flows.

---

## Development Setup

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- A [Vercel Marketplace Redis](https://vercel.com/marketplace) instance (provides `REDIS_URL`)
- Google OAuth credentials (for dashboard login)

### Install

```bash
git clone https://github.com/markminnoye/bpost-mcp.git
cd bpost-mcp
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `BPOST_DB_DATABASE_URL` | Primary Neon Postgres connection string (runtime) |
| `DATABASE_URL` | Local fallback connection string (used if `BPOST_DB_DATABASE_URL` is absent) |
| `ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM credential encryption |
| `AUTH_SECRET` | NextAuth v5 secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID (dashboard login) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `OAUTH_JWT_SECRET` | Secret for signing OAuth 2.0 JWTs |
| `SEED_BPOST_USERNAME` | BPost client ID (optional, for demo seeding) |
| `SEED_BPOST_PASSWORD` | BPost password (optional, for demo seeding) |
| `SEED_BPOST_CUSTOMER_NUMBER` | 8-digit PRS ID (optional) |
| `SEED_BPOST_ACCOUNT_ID` | 8-digit PBC ID (optional) |
| `SEED_USER_EMAIL` | Demo user email for seed script (optional, defaults to `test@example.com`) |
| `REDIS_URL` | TCP Redis connection string (auto-set by Vercel Marketplace Redis) |
| `NEXT_PUBLIC_BASE_URL` | Canonical public base URL (recommended explicit value in Vercel) |
| `VERCEL_URL` | Vercel-provided hostname fallback when `NEXT_PUBLIC_BASE_URL` is not set |
| `GITHUB_TOKEN` | Optional PAT for `report_issue` tool auto-creation |

Generate the encryption key and auth secret:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # OAUTH_JWT_SECRET
```

### Database setup

```bash
npm run db:push    # Apply schema migrations
npm run seed       # Seed a demo tenant (requires SEED_BPOST_* vars)
```

### Run locally

```bash
npm run dev        # http://localhost:3000
```

The local MCP endpoint is at `http://localhost:3000/api/mcp`.

---

## Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run test          # Run tests (Vitest)
npm run test:watch    # Watch mode
npm run db:generate   # Generate Drizzle migrations
npm run db:push       # Apply migrations
npm run db:studio     # Open Drizzle Studio (visual DB editor)
npm run seed          # Seed demo tenant
npm run lint          # Lint
npm run lint:fix      # Auto-fix lint errors
```

---

## Architecture

```
src/
├── app/api/mcp/           # MCP endpoint (mcp-handler + withMcpAuth)
├── app/api/batches/upload # Out-of-band file upload
├── app/oauth/             # OAuth 2.0 authorization server
├── app/dashboard/         # Credential & token management UI
├── app/.well-known/       # RFC 8414 & 9728 metadata
├── client/                # BPost HTTP client (XML ↔ JSON, error parsing)
├── schemas/               # Zod validation schemas
├── lib/
│   ├── db/                # Drizzle ORM schema & client (Neon Postgres)
│   ├── kv/                # Redis batch state (24-hour TTL)
│   ├── oauth/             # JWT, PKCE, client registration
│   ├── tenant/            # Per-tenant credential resolution
│   ├── auth/              # Token extraction & verification
│   └── crypto.ts          # AES-256-GCM encryption
└── types/                 # NextAuth type extensions
```

**Key design decisions:**

- **Out-of-band uploads** — CSV/Excel files are uploaded via `curl` to avoid overflowing LLM context windows. Batch state is stored in Redis with a 24-hour TTL.
- **Credential abstraction** — AI agents never see BPost credentials. Tokens resolve to an encrypted tenant record at request time.
- **GDPR** — PII lives only in transient Redis (24-hour expiration). The relational DB stores only credential metadata and hashed tokens.
- **XML compliance** — BPost requires `application/xml; charset=ISO-8859-1`. The client handles encoding, attribute casing, and error-code parsing.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Next.js 16 (App Router) on Vercel |
| Language | TypeScript 5 (strict) |
| MCP transport | `mcp-handler` (`createMcpHandler` + `withMcpAuth`) |
| Validation | Zod 4 |
| Database | Neon Postgres via Drizzle ORM |
| Batch state | Redis (`redis` npm client, `REDIS_URL`) |
| Auth (dashboard) | Auth.js v5 (`next-auth`) + Google OAuth |
| Auth (MCP) | OAuth 2.0 + JWT (jose) |
| XML | fast-xml-parser (ISO-8859-1) |
| CSV | Papa Parse |
| Tests | Vitest |

---

## Deployment

This project deploys automatically to Vercel on push to `main`.

For manual deploys:

```bash
vercel          # Preview deploy
vercel --prod   # Production deploy (main branch only)
```

Post-deploy verification:

```bash
vercel inspect <deployment-url>
vercel logs <deployment-url> --level error --since 1h
```

---

## License

Private — all rights reserved.
