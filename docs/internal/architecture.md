# Architecture Overview

**Current version:** v2.0.0 — Phase 2 Sprint 2 complete
**Last updated:** 2026-04-07

This document describes the full current architecture. For historical context on the Phase 1 design decisions, see [`phase1-architecture.md`](./phase1-architecture.md).

---

## The Big Picture

BPost's **e-MassPost** API requires XML, HTTP Basic Auth, and deep knowledge of BPost-specific field rules. AI agents work in JSON and know none of that.

`bpost-mcp` is the bridge. It sits between AI agents and BPost, handling everything in between:

```mermaid
flowchart LR
    subgraph Clients["Clients"]
        A1["Claude.ai / Claude Desktop<br/>(OAuth 2.0)"]
        A2["Langflow / n8n / Scripts<br/>(API token)"]
    end

    subgraph Service["bpost-mcp (Vercel)"]
        MCP["/api/mcp<br/>mcp-handler + withMcpAuth"]
        AS["OAuth Authorization Server<br/>/oauth/authorize<br/>/oauth/token<br/>/oauth/register"]
        DB["Neon Postgres<br/>(Drizzle ORM)"]
        DASH["Dashboard<br/>/dashboard"]
    end

    subgraph BPost["BPost"]
        API["e-MassPost API<br/>XML / HTTP Basic Auth"]
    end

    A1 -- "OAuth 2.0 (PKCE)" --> AS
    AS -- "JWT Bearer token" --> A1
    A1 -- "Bearer JWT" --> MCP
    A2 -- "Bearer bpost_*" --> MCP
    MCP -- "verifyToken" --> DB
    MCP -- "XML POST" --> API
    API -- "XML response" --> MCP
    MCP -- "JSON result" --> Clients
    DASH -- "manage credentials / tokens" --> DB
```

---

## System Components

### 1. MCP Route (`/api/mcp`)

The entry point for all AI agent calls. Powered by `mcp-handler` with `withMcpAuth`.

- Accepts GET, POST, DELETE (SSE and JSON transport)
- `withMcpAuth` validates the Bearer token before any tool executes
- Two tools registered: `bpost_announce_deposit` and `bpost_announce_mailing`
- After auth, tool handlers fetch BPost credentials via `getCredentialsByTenantId(tenantId)`

```mermaid
sequenceDiagram
    participant Agent
    participant MCP as /api/mcp (withMcpAuth)
    participant VT as verifyToken
    participant Tool as Tool Handler
    participant DB as Neon Postgres
    participant BPost

    Agent->>MCP: Bearer <token>
    MCP->>VT: verifyToken(req, token)
    alt JWT token (3 dots)
        VT->>VT: jose.jwtVerify() → {sub, tid, scope}
    else bpost_* token
        VT->>DB: SHA-256 hash lookup in api_tokens
    end
    VT-->>MCP: AuthInfo { tenantId, scopes }
    MCP->>Tool: call with AuthInfo
    Tool->>DB: getCredentialsByTenantId(tenantId)
    DB-->>Tool: { username, password (decrypted) }
    Tool->>BPost: POST XML (HTTP Basic Auth)
    BPost-->>Tool: XML response
    Tool-->>Agent: JSON result
```

### 2. OAuth Authorization Server

A full OAuth 2.1 Authorization Server built as Next.js API routes. Enables Claude.ai/Desktop to log in with Google without any manual token setup.

**Endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `GET /oauth/authorize` | Start OAuth flow — check session, generate auth code |
| `POST /oauth/token` | Exchange auth code or refresh token for JWT access token |
| `POST /oauth/register` | Dynamic Client Registration (RFC 7591) |
| `GET /.well-known/oauth-protected-resource` | RFC 9728 — tells clients where the AS lives |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 — advertises endpoints and capabilities |

**OAuth flow (Claude Desktop):**

```mermaid
sequenceDiagram
    participant Claude as Claude Desktop
    participant MCP as /api/mcp
    participant WK as /.well-known/*
    participant Auth as /oauth/authorize
    participant Google as Google OAuth
    participant Token as /oauth/token

    Claude->>MCP: Request (no token)
    MCP-->>Claude: 401 + WWW-Authenticate: Bearer resource_metadata=...
    Claude->>WK: GET /.well-known/oauth-protected-resource
    WK-->>Claude: { authorization_servers: ["https://bpost-mcp.vercel.app"] }
    Claude->>WK: GET /.well-known/oauth-authorization-server
    WK-->>Claude: { authorize, token, register endpoints }
    Claude->>Auth: GET /oauth/authorize?code_challenge=...&client_id=...
    Auth->>Google: Redirect (no session)
    Google-->>Auth: User authenticated
    Auth->>Auth: Check BPost credentials exist
    Auth-->>Claude: Redirect to redirect_uri?code=...
    Claude->>Token: POST /oauth/token (code + code_verifier)
    Token-->>Claude: { access_token (JWT), refresh_token }
    Claude->>MCP: Bearer <JWT>
    MCP-->>Claude: Tool result ✓
```

**Token types:**

| Type | Format | Lifetime | Storage |
|------|--------|----------|---------|
| JWT access token | `eyJ...` (3 dots) | 1 hour | Stateless — verified with HS256 |
| Refresh token | `ref_...` | 90 days | SHA-256 hash in `oauth_refresh_tokens` |
| M2M API token | `bpost_...` | Until revoked | SHA-256 hash in `api_tokens` |

### 3. Multi-Tenancy & Credential Layer

Every user has a **tenant**. BPost credentials are stored per tenant, encrypted with AES-256-GCM.

```mermaid
flowchart TD
    U["users (Auth.js)<br/>id, email, name"]
    T["tenants<br/>id → users.id"]
    C["bpost_credentials<br/>tenantId, username<br/>passwordEncrypted (AES-256-GCM)<br/>passwordIv, customerNumber, accountId"]
    AT["api_tokens<br/>tenantId, tokenHash<br/>label, createdAt, revokedAt"]
    OC["oauth_clients<br/>clientId, clientSecret (SHA-256)<br/>redirectUris, grantTypes"]
    OAC["oauth_authorization_codes<br/>code (SHA-256), clientId<br/>userId, tenantId, codeChallenge<br/>expiresAt, usedAt"]
    ORT["oauth_refresh_tokens<br/>tokenHash (SHA-256)<br/>clientId, userId, tenantId<br/>expiresAt, revokedAt"]

    U --> T
    T --> C
    T --> AT
    T --> OAC
    T --> ORT
```

The "**agent blinding**" principle: AI agents never receive BPost usernames or passwords. Credentials are fetched inside the MCP server after token verification and used only for the outbound HTTP call.

### 4. Dashboard (`/dashboard`)

A terminal-style web UI for tenants to self-manage:

- **BPost Credentials** — enter/update BPost username, password, customer number, account ID
- **API Tokens** — generate `bpost_*` tokens for Langflow/n8n/scripts
- **Claude / MCP Clients** — copy the MCP URL to paste into Claude Desktop

Protected by Auth.js v5 (Google OAuth session). `signOut` is a server action.

---

## Request Flow: Tool Execution

```mermaid
sequenceDiagram
    participant Agent
    participant MCP as route.ts
    participant Auth as verifyToken
    participant Creds as getCredentialsByTenantId
    participant Zod as Schema
    participant Client as BpostClient
    participant BPost

    Agent->>MCP: tools/call bpost_announce_deposit { Context, Header, DepositCreate }
    MCP->>Auth: verify Bearer token
    Auth-->>MCP: AuthInfo { tenantId }
    MCP->>Creds: getCredentialsByTenantId(tenantId)
    Creds-->>MCP: { username, password, customerNumber, accountId }
    MCP->>Zod: DepositRequestSchema.parse(input)
    alt invalid
        Zod-->>Agent: field-level validation error
    end
    MCP->>Client: sendDepositRequest(xml)
    Client->>BPost: POST XML
    alt BPost error (MPW-xxxx)
        BPost-->>Client: <Error code="MPW-4010">
        Client-->>Agent: { isError: true, code: "MPW-4010", retryable: false }
    else success
        BPost-->>Client: <DepositResponse>
        Client-->>Agent: { content: [{ type: "text", text: "..." }] }
    end
```

---

## Authentication Summary

Two authentication systems coexist:

| System | Who uses it | How it works |
|--------|-------------|--------------|
| **Auth.js (Google OAuth)** | Dashboard users | Google login → session cookie → access to `/dashboard` |
| **OAuth 2.0 (MCP)** | Claude.ai / Claude Desktop | Google login → JWT access token → Bearer header on MCP calls |
| **API tokens (M2M)** | Langflow, n8n, scripts | Manual token from dashboard → `bpost_*` Bearer header on MCP calls |

The OAuth 2.0 MCP flow uses Auth.js under the hood for the identity step (Google login). After the user is authenticated via Google, the OAuth Authorization Server issues its own JWT — Auth.js sessions are not shared with MCP clients.

---

## Security Properties

| Property | Implementation |
|----------|---------------|
| PKCE mandatory | `/oauth/authorize` rejects requests without `code_challenge` |
| Auth code replay prevention | `used_at` set on first exchange; second use rejected |
| Refresh token rotation | Old token revoked before new token issued |
| JWT verification | `jose.jwtVerify()` — checks signature, expiry, issuer, audience |
| Secrets never stored raw | All tokens/codes stored as SHA-256 hashes |
| BPost password encrypted | AES-256-GCM with per-row IV; `ENCRYPTION_KEY` env var |
| Agent blinding | AI never sees BPost credentials — fetched server-side after auth |
| Scope enforcement | `withMcpAuth` enforces `requiredScopes: ['mcp:tools']` |

---

## File Map (Current)

```
bpost-mcp/
│
├── src/
│   ├── app/
│   │   ├── api/mcp/
│   │   │   └── route.ts              ← MCP endpoint (mcp-handler + withMcpAuth)
│   │   ├── oauth/
│   │   │   ├── authorize/route.ts    ← OAuth authorization endpoint
│   │   │   ├── token/route.ts        ← OAuth token endpoint
│   │   │   └── register/route.ts     ← Dynamic Client Registration
│   │   ├── .well-known/
│   │   │   ├── oauth-protected-resource/route.ts  ← RFC 9728
│   │   │   └── oauth-authorization-server/route.ts ← RFC 8414
│   │   ├── dashboard/
│   │   │   └── page.tsx              ← Tenant self-service UI
│   │   └── layout.tsx                ← Root layout (favicons, metadata)
│   │
│   ├── lib/
│   │   ├── auth.ts                   ← Auth.js v5 config (Google provider)
│   │   ├── crypto.ts                 ← AES-256-GCM encrypt/decrypt, hashToken
│   │   ├── db/
│   │   │   ├── client.ts             ← Drizzle + Neon connection
│   │   │   └── schema.ts             ← All table definitions
│   │   ├── oauth/
│   │   │   ├── jwt.ts                ← signAccessToken / verifyAccessToken (jose)
│   │   │   ├── pkce.ts               ← verifyPkceS256
│   │   │   ├── client-resolver.ts    ← Resolve client_id (metadata doc or DB)
│   │   │   └── verify-token.ts       ← Unified token verification (JWT + bpost_*)
│   │   └── tenant/
│   │       ├── resolve.ts            ← resolveTenant (M2M token → credentials)
│   │       └── get-credentials.ts    ← getCredentialsByTenantId
│   │
│   ├── client/
│   │   ├── bpost.ts                  ← BpostClient (XML HTTP calls)
│   │   └── errors.ts                 ← BpostError + parseBpostError
│   │
│   └── schemas/                      ← Zod schemas (from BPost XSDs)
│       ├── common.ts
│       ├── deposit-request.ts
│       └── mailing-request.ts
│
├── tests/                            ← Vitest test suite (102 tests)
│
├── drizzle/                          ← Generated SQL migrations
│
├── docs/
│   ├── internal/
│   │   ├── architecture.md           ← This file
│   │   ├── phase1-architecture.md    ← Phase 1 detailed design
│   │   ├── project-design.md         ← Decision log and constraints
│   │   ├── vision.md                 ← Roadmap (3 phases)
│   │   └── e-masspost/               ← BPost protocol docs (git submodule)
│   └── samples/                      ← Example JSON/XML payloads
│
└── .agent/
    ├── plans/                        ← Implementation plans (INDEX.md)
    └── skills/                       ← Agent skill files
```

---

## Technology Stack

| What | Tool | Why |
|------|------|-----|
| **Web framework** | Next.js 16 (App Router) | Vercel deployment, clean API routes, server actions |
| **MCP server** | `mcp-handler` | `withMcpAuth` + `protectedResourceHandler` out of the box |
| **Auth (dashboard)** | Auth.js v5 | Google OAuth, session management, Drizzle adapter |
| **JWT** | `jose` | Lightweight, zero deps, HS256 signing/verification |
| **Database** | Neon Postgres + Drizzle ORM | Serverless Postgres, type-safe queries |
| **Validation** | Zod v4 | Runtime validation + TypeScript types from one schema |
| **XML** | `fast-xml-parser` v5 | ISO-8859-1 support, predictable JS objects |
| **Tests** | Vitest 4 | TypeScript-native, fast, `@/` aliases via vite-tsconfig-paths |
| **Hosting** | Vercel | Serverless, zero-config Next.js, preview deploys on push |

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `AUTH_SECRET` | ✅ | Auth.js session signing key |
| `AUTH_GOOGLE_ID` | ✅ | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | ✅ | Google OAuth client secret |
| `ENCRYPTION_KEY` | ✅ | AES-256-GCM key for BPost passwords (base64, 32 bytes) |
| `OAUTH_JWT_SECRET` | ✅ | HS256 JWT signing key (base64, 32 bytes) |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Public URL (e.g. `https://bpost-mcp.vercel.app`) |

---

## What's Not Built Yet

| Item | Location | Notes |
|------|----------|-------|
| DCR rate limiting | `src/app/oauth/register/route.ts` | Max 10 registrations/IP/hour — TODO comment |
| Expired auth code cleanup | DB `oauth_authorization_codes` | No cron job yet — rows accumulate |
| Phase 2 self-learning pipeline | `.agent/plans/INDEX.md` | Next sprint |
| Phase 3: enterprise automation | `docs/internal/vision.md` | Future |
