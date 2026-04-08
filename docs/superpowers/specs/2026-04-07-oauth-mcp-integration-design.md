# OAuth 2.0 MCP Integration Design

**Date:** 2026-04-07
**Status:** Draft
**Approach:** Vercel `mcp-handler` + eigen Authorization Server (Aanpak E)

## Problem

Claude.ai/Desktop gebruikers moeten handmatig een bearer token aanmaken in het dashboard en kopiëren naar hun Claude config. Dit is foutgevoelig en geen standaard OAuth flow.

## Goal

Claude.ai toont een login-scherm, gebruiker authenticeert via Google, en Claude stuurt automatisch een access token mee bij elke MCP call. Geen handmatige tokens meer voor interactieve MCP clients.

## Decisions

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| Identity provider | Google OAuth (via Auth.js) | Al werkend, geen password management nodig |
| OAuth server | Eigen Authorization Server | MCP spec vereist endpoints op jouw domein |
| MCP route wrapper | Vercel `mcp-handler` | `withMcpAuth` + `protectedResourceHandler` out of the box |
| JWT library | `jose` | Lightweight, zero deps, industrie-standaard |
| Token type | JWT access (stateless) + refresh (stateful) | Access tokens hoeven niet in DB |
| M2M tokens | Behouden (`api_tokens`) | Langflow, n8n, scripts hebben geen browser |
| Token lifetime | 1h access + 90d refresh | Balans veiligheid/gebruiksgemak |
| Dashboard auth | Ongewijzigd (Auth.js sessions) | Geen reden om te wijzigen |

## Architecture

```
Claude.ai / Claude Desktop
        |
        | 1. MCP request (geen token)
        v
/api/mcp (mcp-handler + withMcpAuth)
        | 401 + WWW-Authenticate
        v
/.well-known/oauth-protected-resource
        | authorization_server URL
        v
/.well-known/oauth-authorization-server
        | authorize/token/register endpoints
        v
/oauth/authorize
        | redirect naar Google (Auth.js)
        | na login: auth code uitgeven
        v
/oauth/token
        | code -> JWT + refresh token
        v
/api/mcp (Bearer JWT)
        | verifyToken -> resolveTenant -> tool execution
```

## MCP OAuth Spec Compliance

Implements:
- OAuth 2.1 with PKCE (S256) — required
- Protected Resource Metadata (RFC 9728) — required
- Authorization Server Metadata (RFC 8414) — required
- Resource Indicators (RFC 8707) — required
- Client ID Metadata Documents (draft-ietf-oauth-client-id-metadata-document-00) — preferred by MCP spec
- Dynamic Client Registration (RFC 7591) — MAY support, backwards compatibility fallback
- Refresh token rotation — best practice

### Client Registration Strategy

The MCP spec's preferred mechanism is **Client ID Metadata Documents**, where the `client_id` is an HTTPS URL pointing to a JSON document describing the client. DCR (RFC 7591) is a fallback for backwards compatibility.

The `/oauth/authorize` and `/oauth/token` endpoints must handle two `client_id` formats:
1. **URL-format** (`https://...`) — fetch the metadata document, validate `redirect_uris`, cache
2. **String-format** (`mcp_abc123`) — lookup in `oauth_clients` table (DCR-registered clients)

### 401 Response Format

When `withMcpAuth` returns a 401, it MUST include:
```
WWW-Authenticate: Bearer resource_metadata="https://bpost-mcp.vercel.app/.well-known/oauth-protected-resource"
```
The `resourceMetadataPath` parameter passed to `withMcpAuth` controls this. Verify during implementation that `mcp-handler` emits this header correctly.

## Endpoints

### Metadata (static)

#### `GET /.well-known/oauth-protected-resource`

Via `protectedResourceHandler()` and `metadataCorsOptionsRequestHandler()` from `mcp-handler`.

```json
{
  "resource": "https://bpost-mcp.vercel.app",
  "authorization_servers": ["https://bpost-mcp.vercel.app"],
  "scopes_supported": ["mcp:tools"]
}
```

Route exports both GET and OPTIONS (CORS):
```typescript
export { handler as GET, corsHandler as OPTIONS };
```

#### `GET /.well-known/oauth-authorization-server`

```json
{
  "issuer": "https://bpost-mcp.vercel.app",
  "authorization_endpoint": "https://bpost-mcp.vercel.app/oauth/authorize",
  "token_endpoint": "https://bpost-mcp.vercel.app/oauth/token",
  "registration_endpoint": "https://bpost-mcp.vercel.app/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "none"],
  "scopes_supported": ["mcp:tools"],
  "client_id_metadata_document_supported": true
}
```

### Authorization

#### `GET /oauth/authorize`

Query params: `response_type`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method`, `resource`, `scope`, `state`

Flow:
1. Resolve client_id:
   - If URL-format (`https://...`): fetch Client ID Metadata Document, validate, cache
   - If string-format (`mcp_*`): lookup in `oauth_clients` table
   - Otherwise: reject (400)
2. Validate redirect_uri is in client's `redirect_uris[]`
3. Require code_challenge (PKCE mandatory)
4. Validate scope against `scopes_supported` (currently only `mcp:tools`)
5. Check for existing Auth.js session
   - No session: redirect to Google OAuth via Auth.js, preserve all params as return URL
   - Has session: continue
6. Check user has tenant with BPost credentials
   - No credentials: redirect to `/dashboard` with setup message
   - Has credentials: continue
7. Generate authorization code (32 random bytes, hash before storage)
8. Store in `oauth_authorization_codes` with code_challenge, client_id, tenant_id, 10min expiry
9. Redirect to `redirect_uri?code=<code>&state=<state>`

#### `POST /oauth/token`

**Grant: authorization_code**

```
grant_type=authorization_code
&code=abc123
&redirect_uri=https://claude.ai/callback
&client_id=claude_xxx
&code_verifier=original_pkce_verifier
&resource=https://bpost-mcp.vercel.app
```

Validation:
- Code hash lookup, not expired, not used
- client_id matches
- redirect_uri matches
- S256(code_verifier) === stored code_challenge
- resource parameter matches stored resource (RFC 8707)
- Mark code as used (used_at = now)

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "ref_abc123..."
}
```

**Grant: refresh_token**

```
grant_type=refresh_token
&refresh_token=ref_abc123
&client_id=claude_xxx
&resource=https://bpost-mcp.vercel.app
```

Validation:
- Token hash lookup, not expired, not revoked
- client_id matches

Token rotation:
- Revoke old refresh token (revoked_at = now)
- Generate new refresh token (new hash, 90d expiry)
- Generate new JWT access token (1h expiry)

#### `POST /oauth/register`

Dynamic Client Registration (RFC 7591). Fallback for clients that don't support Client ID Metadata Documents.

**Rate limiting:** Max 10 registrations per IP per hour (via Vercel Edge Middleware or in-function logic) to prevent abuse.

Request:
```json
{
  "client_name": "Claude Desktop",
  "redirect_uris": ["https://claude.ai/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"]
}
```

Response (201):
```json
{
  "client_id": "mcp_abc123...",
  "client_secret": "sec_xyz789...",
  "client_name": "Claude Desktop",
  "redirect_uris": ["https://claude.ai/callback"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

### MCP Route

#### `GET/POST /api/mcp`

Migrated from `@modelcontextprotocol/sdk` to `mcp-handler`.

```typescript
const handler = createMcpHandler((server) => {
  // same tool registrations as current route.ts
}, {}, { basePath: '/api' });

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
```

## Token Verification (verifyToken)

Unified function that handles both token types:

```
Bearer token
    |
    v
Contains two dots? (JWT format)
    |
  +-+-+
  yes  no
  |    |
  v    v
jose.jwtVerify()   Starts with "bpost_"?
  |                    |
  |               +----+----+
  |               yes       no -> 401
  |               |
  |               v
  |          SHA-256 hash lookup
  |          in api_tokens table
  |          check revoked_at = null
  |               |
  v               v
Extract:        Extract:
- sub (userId)  - tenantId
- tid (tenantId)- label
- scope
  |               |
  +-------+-------+
          v
  Return AuthInfo {
    token, clientId, scopes,
    extra: { tenantId, userId }
  }
```

## JWT Payload

```json
{
  "sub": "user_abc123",
  "tid": "tenant_xyz789",
  "scope": "mcp:tools",
  "jti": "tok_unique_id",
  "iss": "https://bpost-mcp.vercel.app",
  "aud": "https://bpost-mcp.vercel.app",
  "exp": 1712534400,
  "iat": 1712530800
}
```

Signing: HS256 with `OAUTH_JWT_SECRET` environment variable.

> **Note:** HS256 (symmetric) is chosen for simplicity since AS and resource server run on the same Vercel deployment. If the AS is ever split into a separate service (Phase 3), migrate to ES256 (asymmetric) with a JWKS endpoint.

## Database Schema

### New Tables

> **Note:** SQL below is documentation shorthand. Implementation uses Drizzle ORM table definitions in `src/lib/db/schema.ts`, consistent with existing tables.

```sql
-- OAuth clients (Dynamic Client Registration)
oauth_clients (
  id              TEXT PRIMARY KEY,
  client_id       TEXT UNIQUE NOT NULL,
  client_secret   TEXT,                    -- SHA-256 hashed, null for public clients
  client_name     TEXT,
  redirect_uris   TEXT[] NOT NULL,
  grant_types     TEXT[] DEFAULT ['authorization_code','refresh_token'],
  response_types  TEXT[] DEFAULT ['code'],
  created_at      TIMESTAMP DEFAULT NOW()
)

-- Authorization codes (short-lived, single-use)
oauth_authorization_codes (
  id              TEXT PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,     -- SHA-256 hashed
  client_id       TEXT NOT NULL,             -- DCR client or URL-format client ID
  user_id         TEXT NOT NULL -> users,
  tenant_id       TEXT NOT NULL -> tenants,
  redirect_uri    TEXT NOT NULL,
  scope           TEXT,
  code_challenge  TEXT NOT NULL,            -- PKCE S256
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',
  resource        TEXT,                     -- RFC 8707
  expires_at      TIMESTAMP NOT NULL,       -- +10 minutes
  used_at         TIMESTAMP                 -- null = unused
)

-- OAuth refresh tokens (long-lived)
oauth_refresh_tokens (
  id              TEXT PRIMARY KEY,
  token_hash      TEXT UNIQUE NOT NULL,     -- SHA-256
  client_id       TEXT NOT NULL,             -- DCR client or URL-format client ID
  user_id         TEXT NOT NULL -> users,
  tenant_id       TEXT NOT NULL -> tenants,
  scope           TEXT,
  expires_at      TIMESTAMP NOT NULL,       -- +90 days
  revoked_at      TIMESTAMP,               -- null = active
  created_at      TIMESTAMP DEFAULT NOW()
)
```

### Client ID Resolution

The `client_id` field in `oauth_authorization_codes` and `oauth_refresh_tokens` is **not a foreign key** to `oauth_clients`. It stores the client identifier as-is:
- **URL-format** (`https://...`): stored as the full URL; resolved dynamically via `client-resolver.ts` (fetch + validate metadata document)
- **String-format** (`mcp_*`): stored as the string; resolved via `oauth_clients` table lookup

This avoids FK constraint violations for URL-format clients while keeping the data model simple.

### Existing Tables — No Changes

- `users`, `tenants`, `api_tokens`, `bpost_credentials`, `audit_log` — unchanged

## Dependencies

### Add
- `mcp-handler` — MCP route wrapper with auth support
- `jose` — JWT signing/verification

### Remove
- `@modelcontextprotocol/sdk` — replaced by `mcp-handler` (which uses it internally)

### Environment Variables (new)
- `OAUTH_JWT_SECRET` — 32+ byte secret for HS256 JWT signing

## File Changes

### Modified
| File | Change |
|------|--------|
| `src/app/api/mcp/route.ts` | Migrate to `createMcpHandler` + `withMcpAuth` |
| `src/lib/db/schema.ts` | Add 3 new tables |
| `src/app/dashboard/page.tsx` | Add MCP URL section |
| `package.json` | Add `mcp-handler` + `jose` |
| `.env.example` | Add `OAUTH_JWT_SECRET` |

### New
| File | Purpose |
|------|---------|
| `src/app/.well-known/oauth-protected-resource/route.ts` | Resource metadata |
| `src/app/.well-known/oauth-authorization-server/route.ts` | AS metadata |
| `src/app/oauth/authorize/route.ts` | Authorization endpoint |
| `src/app/oauth/token/route.ts` | Token endpoint |
| `src/app/oauth/register/route.ts` | DCR endpoint |
| `src/lib/oauth/jwt.ts` | JWT sign/verify helpers |
| `src/lib/oauth/pkce.ts` | PKCE S256 verification |
| `src/lib/oauth/verify-token.ts` | Unified token verification (JWT + API token) |
| `src/lib/oauth/client-resolver.ts` | Resolve client_id (URL metadata doc or DB lookup) |

### Unchanged
- All MCP tool handlers
- Auth.js configuration (`src/lib/auth.ts`)
- BPost client code
- Zod schemas
- KV/batch pipeline
- Audit logging

## Dashboard Changes

Add a third section to the existing dashboard:

```
+---------------------------------------------+
|  BPost Credentials          (existing)      |
+---------------------------------------------+
|  API Tokens                 (existing)      |
+---------------------------------------------+
|  Claude / MCP Clients       (new)           |
|                                             |
|  Verbind Claude met je BPost account:       |
|  [https://bpost-mcp.vercel.app/api/mcp]    |
|                              [Kopieer]      |
|  Plak deze URL in Claude Desktop onder      |
|  Settings > MCP Servers. Claude regelt      |
|  de login automatisch via Google.           |
+---------------------------------------------+
```

## Security

- PKCE (S256) verplicht — geen auth codes zonder code_challenge
- Authorization codes single-use — `used_at` prevents replay
- Refresh token rotation — old token revoked on each refresh
- JWT stateless verification — no DB lookup for access tokens
- All secrets hashed (SHA-256) before storage
- BPost credentials remain encrypted (AES-256-GCM), never exposed to clients
- Agent blinding preserved — AI never sees BPost passwords
- DCR rate limiting — max 10 registrations per IP per hour
- JWT includes `jti` claim — enables revocation lists and audit correlation
