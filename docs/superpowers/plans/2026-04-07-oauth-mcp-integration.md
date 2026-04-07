# OAuth 2.0 MCP Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Claude.ai/Desktop to authenticate with the MCP server via OAuth 2.0, eliminating manual token copy-paste.

**Architecture:** Vercel `mcp-handler` wraps the MCP route with `withMcpAuth`. A custom OAuth Authorization Server (built as Next.js API routes) handles `/authorize`, `/token`, and `/register`. Google OAuth (via existing Auth.js) remains the identity backend. JWT access tokens (1h) + refresh tokens (90d) for OAuth sessions; existing M2M `bpost_*` tokens preserved.

**Tech Stack:** Next.js 16, mcp-handler, jose (JWT), Drizzle ORM, Neon Postgres, Auth.js v5, Vitest

**Spec:** `docs/superpowers/specs/2026-04-07-oauth-mcp-integration-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/lib/oauth/jwt.ts` | Sign & verify JWT access tokens (jose, HS256) |
| `src/lib/oauth/pkce.ts` | PKCE S256 challenge verification |
| `src/lib/oauth/client-resolver.ts` | Resolve client_id: URL metadata doc fetch or DB lookup |
| `src/lib/oauth/verify-token.ts` | Unified token verification for `withMcpAuth` (JWT + bpost_* tokens) |
| `src/app/.well-known/oauth-protected-resource/route.ts` | RFC 9728 protected resource metadata |
| `src/app/.well-known/oauth-authorization-server/route.ts` | RFC 8414 AS metadata |
| `src/app/oauth/authorize/route.ts` | OAuth authorization endpoint |
| `src/app/oauth/token/route.ts` | OAuth token endpoint |
| `src/app/oauth/register/route.ts` | Dynamic Client Registration (RFC 7591) |
| `tests/lib/oauth/jwt.test.ts` | JWT helper tests |
| `tests/lib/oauth/pkce.test.ts` | PKCE helper tests |
| `tests/lib/oauth/client-resolver.test.ts` | Client resolver tests |
| `tests/lib/oauth/verify-token.test.ts` | Unified token verification tests |
| `tests/app/oauth/register.test.ts` | DCR endpoint tests |
| `tests/app/oauth/token.test.ts` | Token endpoint tests |
| `tests/app/oauth/authorize.test.ts` | Authorize endpoint tests |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Add 3 new Drizzle tables |
| `src/app/api/mcp/route.ts` | Migrate to `mcp-handler` + `withMcpAuth` |
| `src/app/dashboard/page.tsx` | Add MCP URL section |
| `package.json` | Add `mcp-handler` + `jose` |
| `.env.example` | Add `OAUTH_JWT_SECRET` |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install mcp-handler and jose**

```bash
npm install mcp-handler jose
```

- [ ] **Step 2: Verify installation and inspect mcp-handler API**

```bash
node -e "const m = require('mcp-handler'); console.log('mcp-handler exports:', Object.keys(m))"
```

Expected: Output should include `createMcpHandler`, `withMcpAuth`, `protectedResourceHandler`, `metadataCorsOptionsRequestHandler`. If any are missing, check the package docs and adjust the plan accordingly before proceeding.

> **Risk gate:** If `withMcpAuth` does not exist or has a different signature than `(handler, verifyFn, options)`, STOP and re-evaluate the approach. This is the highest-risk dependency assumption in the plan.

- [ ] **Step 3: Add OAUTH_JWT_SECRET to .env.example**

Add to `.env.example`:
```
OAUTH_JWT_SECRET="generate-a-32-byte-random-secret-here"  # JWT signing (HS256)
```

- [ ] **Step 4: Generate and set local OAUTH_JWT_SECRET**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the output to `.env.local` as `OAUTH_JWT_SECRET=<value>`.

---

## Task 2: Database Schema — OAuth Tables

**Files:**
- Modify: `src/lib/db/schema.ts`

**Context:** Existing schema uses `pgTable`, `text`, `timestamp`, `uuid` from `drizzle-orm/pg-core`. Primary keys use `uuid().defaultRandom()`. Foreign keys use `.references(() => table.id)`. Follow the exact same patterns.

- [ ] **Step 1: Add oauth_clients table**

Add to `src/lib/db/schema.ts` after the existing tables:

```typescript
export const oauthClients = pgTable('oauth_clients', {
  id: uuid().defaultRandom().primaryKey(),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret'), // SHA-256 hashed, null for public clients
  clientName: text('client_name'),
  redirectUris: text('redirect_uris').array().notNull(),
  grantTypes: text('grant_types').array().notNull().default(sql`ARRAY['authorization_code','refresh_token']`),
  responseTypes: text('response_types').array().notNull().default(sql`ARRAY['code']`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 2: Add oauth_authorization_codes table**

```typescript
export const oauthAuthorizationCodes = pgTable('oauth_authorization_codes', {
  id: uuid().defaultRandom().primaryKey(),
  code: text().notNull().unique(), // SHA-256 hashed
  clientId: text('client_id').notNull(), // DCR client or URL-format, no FK
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  redirectUri: text('redirect_uri').notNull(),
  scope: text(),
  codeChallenge: text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),
  resource: text(), // RFC 8707
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
});
```

- [ ] **Step 3: Add oauth_refresh_tokens table**

```typescript
export const oauthRefreshTokens = pgTable('oauth_refresh_tokens', {
  id: uuid().defaultRandom().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  clientId: text('client_id').notNull(), // DCR client or URL-format, no FK
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  scope: text(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

- [ ] **Step 4: Add `sql` import if missing**

Ensure the `sql` helper is imported from `drizzle-orm`:
```typescript
import { sql } from 'drizzle-orm';
```

- [ ] **Step 5: Generate and push migration**

```bash
npm run db:generate
npm run db:push
```

Expected: Migration generated and applied to Neon DB without errors.

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

---

## Task 3: JWT Helpers

**Files:**
- Create: `src/lib/oauth/jwt.ts`
- Create: `tests/lib/oauth/jwt.test.ts`

**Context:** Uses `jose` library for HS256 JWT signing/verification. Existing crypto patterns in `src/lib/crypto.ts` use Node `crypto` module.

- [ ] **Step 1: Write failing tests for JWT sign/verify**

Create `tests/lib/oauth/jwt.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signAccessToken, verifyAccessToken } from '@/lib/oauth/jwt';

const TEST_SECRET = 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE='; // base64, 32 bytes

describe('JWT helpers', () => {
  beforeEach(() => {
    vi.stubEnv('OAUTH_JWT_SECRET', TEST_SECRET);
  });

  it('signs and verifies a valid access token', async () => {
    const payload = {
      sub: 'user_123',
      tid: 'tenant_456',
      scope: 'mcp:tools',
    };

    const token = await signAccessToken(payload);
    expect(token).toContain('.'); // JWT format

    const verified = await verifyAccessToken(token);
    expect(verified.sub).toBe('user_123');
    expect(verified.tid).toBe('tenant_456');
    expect(verified.scope).toBe('mcp:tools');
    expect(verified.jti).toBeDefined();
    expect(verified.iss).toBeDefined();
    expect(verified.aud).toBeDefined();
  });

  it('rejects an expired token', async () => {
    const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' };
    const token = await signAccessToken(payload, -60); // expired 60s ago

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a token signed with wrong secret', async () => {
    const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' };
    const token = await signAccessToken(payload);

    vi.stubEnv('OAUTH_JWT_SECRET', 'd3Jvbmctc2VjcmV0LXRoYXQtaXMtMzItYnl0ZXMh');
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/oauth/jwt.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement JWT helpers**

Create `src/lib/oauth/jwt.ts`:

```typescript
import * as jose from 'jose';
import { randomUUID } from 'crypto';

const ISSUER = process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app';
const AUDIENCE = ISSUER;
const ACCESS_TOKEN_TTL = 3600; // 1 hour

function getSecret(): Uint8Array {
  const secret = process.env.OAUTH_JWT_SECRET;
  if (!secret) throw new Error('OAUTH_JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload {
  sub: string;
  tid: string;
  scope: string;
  jti?: string;
  iss?: string;
  aud?: string;
}

export async function signAccessToken(
  payload: { sub: string; tid: string; scope: string },
  expiresInOverride?: number,
): Promise<string> {
  const secret = getSecret();
  const expiresIn = expiresInOverride ?? ACCESS_TOKEN_TTL;

  return new jose.SignJWT({
    tid: payload.tid,
    scope: payload.scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(expiresInOverride !== undefined && expiresInOverride < 0
      ? Math.floor(Date.now() / 1000) + expiresInOverride
      : `${expiresIn}s`)
    .setJti(randomUUID())
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const secret = getSecret();

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return {
    sub: payload.sub as string,
    tid: payload.tid as string,
    scope: payload.scope as string,
    jti: payload.jti as string,
    iss: payload.iss as string,
    aud: payload.aud as string,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/oauth/jwt.test.ts
```

Expected: All 3 tests PASS.

---

## Task 4: PKCE Helper

**Files:**
- Create: `src/lib/oauth/pkce.ts`
- Create: `tests/lib/oauth/pkce.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/oauth/pkce.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { verifyPkceS256 } from '@/lib/oauth/pkce';

describe('PKCE S256 verification', () => {
  it('verifies a valid code_verifier against code_challenge', () => {
    // Known test vector: verifier → SHA256 → base64url
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it('rejects an invalid code_verifier', () => {
    const verifier = 'wrong-verifier';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    expect(verifyPkceS256(verifier, challenge)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/oauth/pkce.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement PKCE helper**

Create `src/lib/oauth/pkce.ts`:

```typescript
import { createHash } from 'crypto';

/**
 * Verify PKCE S256: SHA256(code_verifier) base64url-encoded === code_challenge
 */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const hash = createHash('sha256').update(codeVerifier).digest('base64url');
  return hash === codeChallenge;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/lib/oauth/pkce.test.ts
```

Expected: All 2 tests PASS.

---

## Task 5: Client Resolver

**Files:**
- Create: `src/lib/oauth/client-resolver.ts`
- Create: `tests/lib/oauth/client-resolver.test.ts`

**Context:** Must handle two `client_id` formats:
1. URL-format (`https://...`) — fetch Client ID Metadata Document
2. String-format (`mcp_*`) — DB lookup in `oauth_clients`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/oauth/client-resolver.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveClient, type ResolvedClient } from '@/lib/oauth/client-resolver';

vi.mock('@/lib/db/client');

describe('resolveClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('resolves a URL-format client_id by fetching metadata document', async () => {
    const metadataUrl = 'https://example.com/.well-known/oauth-client';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        client_id: metadataUrl,
        client_name: 'Test Client',
        redirect_uris: ['https://example.com/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });

    const result = await resolveClient(metadataUrl);
    expect(result).not.toBeNull();
    expect(result!.clientId).toBe(metadataUrl);
    expect(result!.redirectUris).toContain('https://example.com/callback');
    expect(result!.source).toBe('metadata_document');
  });

  it('resolves a string-format client_id from DB', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            clientId: 'mcp_abc123',
            clientName: 'Claude Desktop',
            redirectUris: ['https://claude.ai/callback'],
            grantTypes: ['authorization_code', 'refresh_token'],
            responseTypes: ['code'],
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const result = await resolveClient('mcp_abc123');
    expect(result).not.toBeNull();
    expect(result!.clientId).toBe('mcp_abc123');
    expect(result!.source).toBe('database');
  });

  it('returns null for unknown string-format client_id', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const result = await resolveClient('mcp_nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when URL metadata fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await resolveClient('https://bad-url.example.com');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/oauth/client-resolver.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement client resolver**

Create `src/lib/oauth/client-resolver.ts`:

```typescript
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { oauthClients } from '@/lib/db/schema';

export interface ResolvedClient {
  clientId: string;
  clientName: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  source: 'metadata_document' | 'database';
}

function isUrlFormat(clientId: string): boolean {
  return clientId.startsWith('https://');
}

async function resolveFromMetadataDocument(clientId: string): Promise<ResolvedClient | null> {
  try {
    const response = await fetch(clientId, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const metadata = await response.json();

    // Validate: client_id in document must match the URL we fetched
    if (metadata.client_id !== clientId) return null;
    if (!Array.isArray(metadata.redirect_uris) || metadata.redirect_uris.length === 0) return null;

    return {
      clientId: metadata.client_id,
      clientName: metadata.client_name ?? null,
      redirectUris: metadata.redirect_uris,
      grantTypes: metadata.grant_types ?? ['authorization_code'],
      responseTypes: metadata.response_types ?? ['code'],
      source: 'metadata_document',
    };
  } catch {
    return null;
  }
}

async function resolveFromDatabase(clientId: string): Promise<ResolvedClient | null> {
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUris: row.redirectUris,
    grantTypes: row.grantTypes,
    responseTypes: row.responseTypes,
    source: 'database',
  };
}

export async function resolveClient(clientId: string): Promise<ResolvedClient | null> {
  if (isUrlFormat(clientId)) {
    return resolveFromMetadataDocument(clientId);
  }
  return resolveFromDatabase(clientId);
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/lib/oauth/client-resolver.test.ts
```

Expected: All 4 tests PASS.

---

## Task 6: Unified Token Verification

**Files:**
- Create: `src/lib/oauth/verify-token.ts`
- Create: `tests/lib/oauth/verify-token.test.ts`

**Context:** The `verifyToken` function is passed to `withMcpAuth`. It must return `AuthInfo` (from `@modelcontextprotocol/sdk/server/auth/types.js`) or `undefined` for both JWT and `bpost_*` tokens. The existing `resolveTenant` in `src/lib/tenant/resolve.ts` handles `bpost_*` tokens.

- [ ] **Step 1: Write failing tests**

Create `tests/lib/oauth/verify-token.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken } from '@/lib/oauth/verify-token';

vi.mock('@/lib/oauth/jwt');
vi.mock('@/lib/tenant/resolve');

const TEST_SECRET = 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE=';

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OAUTH_JWT_SECRET', TEST_SECRET);
  });

  it('verifies a valid JWT and returns AuthInfo', async () => {
    const { verifyAccessToken } = await import('@/lib/oauth/jwt');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: 'user_123',
      tid: 'tenant_456',
      scope: 'mcp:tools',
      jti: 'tok_abc',
    });

    const result = await verifyToken(new Request('http://localhost'), 'eyJ.header.signature');
    expect(result).toBeDefined();
    expect(result!.extra?.tenantId).toBe('tenant_456');
    expect(result!.extra?.userId).toBe('user_123');
    expect(result!.scopes).toContain('mcp:tools');
  });

  it('verifies a valid bpost_* token via resolveTenant', async () => {
    const { resolveTenant } = await import('@/lib/tenant/resolve');
    (resolveTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenantId: 'tenant_789',
      bpostUsername: 'user',
      bpostPassword: 'pass',
      customerNumber: '123',
      accountId: '456',
    });

    const result = await verifyToken(new Request('http://localhost'), 'bpost_abc123def456');
    expect(result).toBeDefined();
    expect(result!.extra?.tenantId).toBe('tenant_789');
  });

  it('returns undefined for invalid JWT', async () => {
    const { verifyAccessToken } = await import('@/lib/oauth/jwt');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('invalid'));

    const result = await verifyToken(new Request('http://localhost'), 'eyJ.bad.token');
    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown bpost_* token', async () => {
    const { resolveTenant } = await import('@/lib/tenant/resolve');
    (resolveTenant as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await verifyToken(new Request('http://localhost'), 'bpost_unknown');
    expect(result).toBeUndefined();
  });

  it('returns undefined when no token provided', async () => {
    const result = await verifyToken(new Request('http://localhost'), undefined);
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/oauth/verify-token.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement unified token verification**

Create `src/lib/oauth/verify-token.ts`:

```typescript
// Note: @modelcontextprotocol/sdk remains as a dependency (mcp-handler re-exports some types
// but AuthInfo must be imported from the SDK directly)
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { verifyAccessToken } from './jwt';
import { resolveTenant } from '@/lib/tenant/resolve';

function isJwt(token: string): boolean {
  return token.split('.').length === 3;
}

function isBpostToken(token: string): boolean {
  return token.startsWith('bpost_');
}

export async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  if (isJwt(bearerToken)) {
    return verifyJwt(bearerToken);
  }

  if (isBpostToken(bearerToken)) {
    return verifyBpostToken(bearerToken);
  }

  return undefined;
}

async function verifyJwt(token: string): Promise<AuthInfo | undefined> {
  try {
    const payload = await verifyAccessToken(token);
    return {
      token,
      clientId: 'oauth',
      scopes: payload.scope ? payload.scope.split(' ') : [],
      extra: {
        tenantId: payload.tid,
        userId: payload.sub,
      },
    };
  } catch {
    return undefined;
  }
}

async function verifyBpostToken(token: string): Promise<AuthInfo | undefined> {
  const tenant = await resolveTenant(token);
  if (!tenant) return undefined;

  return {
    token,
    clientId: 'api_token',
    scopes: ['mcp:tools'],
    extra: {
      tenantId: tenant.tenantId,
    },
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/lib/oauth/verify-token.test.ts
```

Expected: All 5 tests PASS.

---

## Task 7: Metadata Endpoints

**Files:**
- Create: `src/app/.well-known/oauth-protected-resource/route.ts`
- Create: `src/app/.well-known/oauth-authorization-server/route.ts`

**Context:** These are static metadata endpoints. The protected resource route uses `protectedResourceHandler` from `mcp-handler`. The AS metadata is a simple JSON response.

- [ ] **Step 1: Create protected resource metadata route**

Create `src/app/.well-known/oauth-protected-resource/route.ts`:

```typescript
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app';

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

- [ ] **Step 2: Create AS metadata route**

Create `src/app/.well-known/oauth-authorization-server/route.ts`:

```typescript
import { NextResponse } from 'next/server';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app';

const metadata = {
  issuer: baseUrl,
  authorization_endpoint: `${baseUrl}/oauth/authorize`,
  token_endpoint: `${baseUrl}/oauth/token`,
  registration_endpoint: `${baseUrl}/oauth/register`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  scopes_supported: ['mcp:tools'],
  client_id_metadata_document_supported: true,
};

export function GET() {
  return NextResponse.json(metadata, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

---

## Task 8: Dynamic Client Registration Endpoint

**Files:**
- Create: `src/app/oauth/register/route.ts`
- Create: `tests/app/oauth/register.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/app/oauth/register.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client');

describe('POST /oauth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('registers a new client and returns credentials', async () => {
    const { db } = await import('@/lib/db/client');
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          clientId: 'mcp_generated',
          clientName: 'Test Client',
          redirectUris: ['https://example.com/callback'],
          grantTypes: ['authorization_code', 'refresh_token'],
          responseTypes: ['code'],
        }]),
      }),
    });
    (db as any).insert = mockInsert;

    const { POST } = await import('@/app/oauth/register/route');
    const request = new Request('http://localhost/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Test Client',
        redirect_uris: ['https://example.com/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.client_id).toBeDefined();
    expect(body.client_name).toBe('Test Client');
    expect(body.redirect_uris).toContain('https://example.com/callback');
  });

  it('rejects request without redirect_uris', async () => {
    const { POST } = await import('@/app/oauth/register/route');
    const request = new Request('http://localhost/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'No Redirects' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/app/oauth/register.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement DCR endpoint**

Create `src/app/oauth/register/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { oauthClients } from '@/lib/db/schema';

const RegisterRequestSchema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  grant_types: z.array(z.string()).optional().default(['authorization_code', 'refresh_token']),
  response_types: z.array(z.string()).optional().default(['code']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_client_metadata', error_description: parsed.error.message },
        { status: 400 },
      );
    }

    // TODO: Add rate limiting (max 10 registrations per IP per hour)
    // Implement via Vercel Edge Middleware or in-function IP tracking

    const { client_name, redirect_uris, grant_types, response_types } = parsed.data;

    const rawClientId = `mcp_${randomBytes(32).toString('hex')}`;
    const rawClientSecret = `sec_${randomBytes(32).toString('hex')}`;
    const secretHash = createHash('sha256').update(rawClientSecret).digest('hex');

    await db.insert(oauthClients).values({
      clientId: rawClientId,
      clientSecret: secretHash,
      clientName: client_name ?? null,
      redirectUris: redirect_uris,
      grantTypes: grant_types,
      responseTypes: response_types,
    });

    return NextResponse.json(
      {
        client_id: rawClientId,
        client_secret: rawClientSecret,
        client_name: client_name ?? null,
        redirect_uris,
        grant_types,
        response_types,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'server_error', error_description: 'Registration failed' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/app/oauth/register.test.ts
```

Expected: All 2 tests PASS.

---

## Task 9: Token Endpoint

**Files:**
- Create: `src/app/oauth/token/route.ts`
- Create: `tests/app/oauth/token.test.ts`

**Context:** Handles `authorization_code` and `refresh_token` grants. Uses PKCE verification, JWT signing, and refresh token rotation.

- [ ] **Step 1: Write failing tests**

Create `tests/app/oauth/token.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client');
vi.mock('@/lib/oauth/jwt');
vi.mock('@/lib/oauth/pkce');

const TEST_SECRET = 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE=';

describe('POST /oauth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('OAUTH_JWT_SECRET', TEST_SECRET);
  });

  it('exchanges authorization code for tokens', async () => {
    const { verifyPkceS256 } = await import('@/lib/oauth/pkce');
    (verifyPkceS256 as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { signAccessToken } = await import('@/lib/oauth/jwt');
    (signAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue('eyJ.mock.jwt');

    const { db } = await import('@/lib/db/client');
    // Mock auth code lookup
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'code-id',
            code: 'hashed-code',
            clientId: 'mcp_test',
            userId: 'user_123',
            tenantId: 'tenant_456',
            redirectUri: 'https://example.com/callback',
            scope: 'mcp:tools',
            codeChallenge: 'test-challenge',
            codeChallengeMethod: 'S256',
            resource: 'https://bpost-mcp.vercel.app',
            expiresAt: new Date(Date.now() + 600000), // 10 min from now
            usedAt: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    // Mock update (mark code as used)
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db as any).update = mockUpdate;

    // Mock refresh token insert
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db as any).insert = mockInsert;

    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'raw-auth-code',
      redirect_uri: 'https://example.com/callback',
      client_id: 'mcp_test',
      code_verifier: 'test-verifier',
      resource: 'https://bpost-mcp.vercel.app',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.access_token).toBeDefined();
    expect(json.token_type).toBe('Bearer');
    expect(json.expires_in).toBe(3600);
    expect(json.refresh_token).toBeDefined();
  });

  it('exchanges refresh token for new tokens (rotation)', async () => {
    const { signAccessToken } = await import('@/lib/oauth/jwt');
    (signAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue('eyJ.new.jwt');

    const { db } = await import('@/lib/db/client');
    // Mock refresh token lookup
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'refresh-id',
            tokenHash: 'hashed-refresh',
            clientId: 'mcp_test',
            userId: 'user_123',
            tenantId: 'tenant_456',
            scope: 'mcp:tools',
            expiresAt: new Date(Date.now() + 86400000), // tomorrow
            revokedAt: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    // Mock update (revoke old) + insert (new refresh token)
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db as any).update = mockUpdate;

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db as any).insert = mockInsert;

    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: 'ref_old_token',
      client_id: 'mcp_test',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.access_token).toBeDefined();
    expect(json.refresh_token).toBeDefined();
    // Old token should have been revoked (update called)
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('rejects invalid grant_type', async () => {
    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'mcp_test',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/app/oauth/token.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement token endpoint**

Create `src/app/oauth/token/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { oauthAuthorizationCodes, oauthRefreshTokens } from '@/lib/db/schema';
import { signAccessToken } from '@/lib/oauth/jwt';
import { verifyPkceS256 } from '@/lib/oauth/pkce';
import { hashToken } from '@/lib/crypto';

function errorResponse(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

async function handleAuthorizationCode(params: URLSearchParams) {
  const code = params.get('code');
  const redirectUri = params.get('redirect_uri');
  const clientId = params.get('client_id');
  const codeVerifier = params.get('code_verifier');
  const resource = params.get('resource');

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return errorResponse('invalid_request', 'Missing required parameters');
  }

  const codeHash = hashToken(code);

  const rows = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.code, codeHash))
    .limit(1);

  if (rows.length === 0) {
    return errorResponse('invalid_grant', 'Authorization code not found');
  }

  const authCode = rows[0];

  // Validate code
  if (authCode.usedAt) {
    return errorResponse('invalid_grant', 'Authorization code already used');
  }
  if (new Date() > authCode.expiresAt) {
    return errorResponse('invalid_grant', 'Authorization code expired');
  }
  if (authCode.clientId !== clientId) {
    return errorResponse('invalid_grant', 'Client ID mismatch');
  }
  if (authCode.redirectUri !== redirectUri) {
    return errorResponse('invalid_grant', 'Redirect URI mismatch');
  }
  if (authCode.resource && authCode.resource !== resource) {
    return errorResponse('invalid_grant', 'Resource mismatch');
  }

  // Verify PKCE
  if (!verifyPkceS256(codeVerifier, authCode.codeChallenge)) {
    return errorResponse('invalid_grant', 'PKCE verification failed');
  }

  // Mark code as used
  await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthAuthorizationCodes.id, authCode.id));

  // Generate tokens
  const accessToken = await signAccessToken({
    sub: authCode.userId,
    tid: authCode.tenantId,
    scope: authCode.scope || 'mcp:tools',
  });

  const rawRefreshToken = `ref_${randomBytes(32).toString('hex')}`;
  const refreshHash = hashToken(rawRefreshToken);

  await db.insert(oauthRefreshTokens).values({
    tokenHash: refreshHash,
    clientId,
    userId: authCode.userId,
    tenantId: authCode.tenantId,
    scope: authCode.scope || 'mcp:tools',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: rawRefreshToken,
  });
}

async function handleRefreshToken(params: URLSearchParams) {
  const refreshToken = params.get('refresh_token');
  const clientId = params.get('client_id');

  if (!refreshToken || !clientId) {
    return errorResponse('invalid_request', 'Missing required parameters');
  }

  const tokenHash = hashToken(refreshToken);

  const rows = await db
    .select()
    .from(oauthRefreshTokens)
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return errorResponse('invalid_grant', 'Refresh token not found or revoked');
  }

  const oldToken = rows[0];

  if (new Date() > oldToken.expiresAt) {
    return errorResponse('invalid_grant', 'Refresh token expired');
  }
  if (oldToken.clientId !== clientId) {
    return errorResponse('invalid_grant', 'Client ID mismatch');
  }

  // Rotate: revoke old, create new
  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshTokens.id, oldToken.id));

  const newRawRefreshToken = `ref_${randomBytes(32).toString('hex')}`;
  const newRefreshHash = hashToken(newRawRefreshToken);

  await db.insert(oauthRefreshTokens).values({
    tokenHash: newRefreshHash,
    clientId,
    userId: oldToken.userId,
    tenantId: oldToken.tenantId,
    scope: oldToken.scope || 'mcp:tools',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  const accessToken = await signAccessToken({
    sub: oldToken.userId,
    tid: oldToken.tenantId,
    scope: oldToken.scope || 'mcp:tools',
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: newRawRefreshToken,
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  let params: URLSearchParams;

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    params = new URLSearchParams(text);
  } else {
    return errorResponse('invalid_request', 'Content-Type must be application/x-www-form-urlencoded');
  }

  const grantType = params.get('grant_type');

  switch (grantType) {
    case 'authorization_code':
      return handleAuthorizationCode(params);
    case 'refresh_token':
      return handleRefreshToken(params);
    default:
      return errorResponse('unsupported_grant_type', `Grant type '${grantType}' is not supported`);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/app/oauth/token.test.ts
```

Expected: All 2 tests PASS.

---

## Task 10: Authorization Endpoint

**Files:**
- Create: `src/app/oauth/authorize/route.ts`
- Create: `tests/app/oauth/authorize.test.ts`

**Context:** This is the most complex endpoint. It must resolve the client, validate params, check Auth.js session, verify BPost credentials exist, generate an auth code, and redirect. It uses `auth()` from Auth.js to check session state.

- [ ] **Step 1: Write failing tests**

Create `tests/app/oauth/authorize.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth');
vi.mock('@/lib/db/client');
vi.mock('@/lib/oauth/client-resolver');

describe('GET /oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('redirects to Google login when no session exists', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { resolveClient } = await import('@/lib/oauth/client-resolver');
    (resolveClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      clientId: 'mcp_test',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      source: 'database',
    });

    const { GET } = await import('@/app/oauth/authorize/route');
    const url = new URL('http://localhost/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'mcp_test');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    url.searchParams.set('code_challenge', 'test-challenge');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', 'random-state');

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('/api/auth/signin');
  });

  it('generates auth code and redirects when session + credentials exist', async () => {
    const { auth } = await import('@/lib/auth');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user_123', tenantId: 'tenant_456' },
    });

    const { resolveClient } = await import('@/lib/oauth/client-resolver');
    (resolveClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      clientId: 'mcp_test',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      source: 'database',
    });

    const { db } = await import('@/lib/db/client');
    // Mock BPost credentials exist
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'cred_1' }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    // Mock auth code insert
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db as any).insert = mockInsert;

    const { GET } = await import('@/app/oauth/authorize/route');
    const url = new URL('http://localhost/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'mcp_test');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    url.searchParams.set('code_challenge', 'test-challenge');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', 'random-state');

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location')!;
    expect(location).toContain('https://example.com/callback');
    expect(location).toContain('code=');
    expect(location).toContain('state=random-state');
  });

  it('rejects request with missing code_challenge', async () => {
    const { resolveClient } = await import('@/lib/oauth/client-resolver');
    (resolveClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      clientId: 'mcp_test',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      source: 'database',
    });

    const { GET } = await import('@/app/oauth/authorize/route');
    const url = new URL('http://localhost/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'mcp_test');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    // No code_challenge

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('rejects unknown client_id', async () => {
    const { resolveClient } = await import('@/lib/oauth/client-resolver');
    (resolveClient as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import('@/app/oauth/authorize/route');
    const url = new URL('http://localhost/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'unknown');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    url.searchParams.set('code_challenge', 'test-challenge');
    url.searchParams.set('code_challenge_method', 'S256');

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/app/oauth/authorize.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement authorize endpoint**

Create `src/app/oauth/authorize/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { bpostCredentials, oauthAuthorizationCodes } from '@/lib/db/schema';
import { resolveClient } from '@/lib/oauth/client-resolver';
import { hashToken } from '@/lib/crypto';

const SUPPORTED_SCOPES = ['mcp:tools'];
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const responseType = params.get('response_type');
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method') || 'S256';
  const scope = params.get('scope') || 'mcp:tools';
  const state = params.get('state');
  const resource = params.get('resource');

  // 1. Basic validation
  if (responseType !== 'code') {
    return NextResponse.json(
      { error: 'unsupported_response_type', error_description: 'Only response_type=code is supported' },
      { status: 400 },
    );
  }

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'client_id and redirect_uri are required' },
      { status: 400 },
    );
  }

  // 2. Resolve client
  const client = await resolveClient(clientId);
  if (!client) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Unknown client_id' },
      { status: 400 },
    );
  }

  // 3. Validate redirect_uri
  if (!client.redirectUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri not registered for this client' },
      { status: 400 },
    );
  }

  // 4. Require PKCE
  if (!codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge is required (PKCE)' },
      { status: 400 },
    );
  }
  if (codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Only S256 code_challenge_method is supported' },
      { status: 400 },
    );
  }

  // 5. Validate scope
  const requestedScopes = scope.split(' ');
  if (!requestedScopes.every((s) => SUPPORTED_SCOPES.includes(s))) {
    return NextResponse.json(
      { error: 'invalid_scope', error_description: `Supported scopes: ${SUPPORTED_SCOPES.join(', ')}` },
      { status: 400 },
    );
  }

  // 6. Check Auth.js session
  const session = await auth();
  if (!session?.user?.id || !session?.user?.tenantId) {
    // No session — redirect to Google login, preserve all params as callbackUrl
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
    const callbackUrl = `${baseUrl}/oauth/authorize?${params.toString()}`;
    const signInUrl = new URL('/api/auth/signin', baseUrl);
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(signInUrl.toString(), 302);
  }

  // 7. Check BPost credentials exist
  const creds = await db
    .select()
    .from(bpostCredentials)
    .where(eq(bpostCredentials.tenantId, session.user.tenantId))
    .limit(1);

  if (creds.length === 0) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || url.origin;
    const dashboardUrl = new URL('/dashboard', baseUrl);
    dashboardUrl.searchParams.set('setup', 'credentials');
    dashboardUrl.searchParams.set('returnTo', url.toString());
    return NextResponse.redirect(dashboardUrl.toString(), 302);
  }

  // 8. Generate authorization code
  const rawCode = randomBytes(32).toString('hex');
  const hashedCode = hashToken(rawCode);

  await db.insert(oauthAuthorizationCodes).values({
    code: hashedCode,
    clientId,
    userId: session.user.id,
    tenantId: session.user.tenantId,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod,
    resource: resource || null,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  // 9. Redirect with code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', rawCode);
  if (state) redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl.toString(), 302);
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/app/oauth/authorize.test.ts
```

Expected: All 3 tests PASS.

---

## Task 11: Credential-Fetching Helper

**Files:**
- Create: `src/lib/tenant/get-credentials.ts`
- Create: `tests/lib/tenant/get-credentials.test.ts`

**Context:** The current MCP route uses `resolveTenant(bearerToken)` which couples token lookup + credential decryption. The new `mcp-handler` approach separates token verification (via `withMcpAuth`) from credential fetching. We need a function that takes a `tenantId` and returns decrypted BPost credentials.

- [ ] **Step 1: Write failing tests**

Create `tests/lib/tenant/get-credentials.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials';

vi.mock('@/lib/db/client');

describe('getCredentialsByTenantId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ENCRYPTION_KEY', 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyE=');
  });

  it('returns decrypted credentials for valid tenantId', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            username: 'bpost_user',
            passwordEncrypted: 'encrypted_pw',
            passwordIv: 'iv_value',
            customerNumber: '12345678',
            accountId: '87654321',
            prsNumber: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const result = await getCredentialsByTenantId('tenant_123');
    expect(result).not.toBeNull();
    expect(result!.bpostUsername).toBe('bpost_user');
    expect(result!.customerNumber).toBe('12345678');
  });

  it('returns null for tenantId with no credentials', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const result = await getCredentialsByTenantId('tenant_no_creds');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/tenant/get-credentials.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement credential-fetching helper**

Create `src/lib/tenant/get-credentials.ts`:

```typescript
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bpostCredentials } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';

export interface BpostCredentials {
  bpostUsername: string;
  bpostPassword: string;
  customerNumber: string;
  accountId: string;
  prsNumber?: string;
}

export async function getCredentialsByTenantId(
  tenantId: string,
): Promise<BpostCredentials | null> {
  const rows = await db
    .select()
    .from(bpostCredentials)
    .where(eq(bpostCredentials.tenantId, tenantId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY is not set');

  const password = decrypt(row.passwordEncrypted, row.passwordIv, encryptionKey);

  return {
    bpostUsername: row.username,
    bpostPassword: password,
    customerNumber: row.customerNumber,
    accountId: row.accountId,
    prsNumber: row.prsNumber ?? undefined,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/lib/tenant/get-credentials.test.ts
```

Expected: All 2 tests PASS.

---

## Task 12: Migrate MCP Route to mcp-handler

**Files:**
- Modify: `src/app/api/mcp/route.ts`
- Modify: `tests/app/api/mcp/route.test.ts` and `tests/mcp/route.test.ts`

**Context:** This is the highest-risk task. The current route manually creates an `McpServer`, extracts the bearer token, resolves the tenant, and registers tools. The new route uses `createMcpHandler` + `withMcpAuth`. All tool logic stays the same — only the wrapper changes.

> **Risk:** This task depends heavily on the `mcp-handler` API verified in Task 1 Step 2. If the API differs from what's documented, adjust accordingly.

**Important:** Read the current `src/app/api/mcp/route.ts` in full before making changes. The tool registration logic must be preserved exactly.

- [ ] **Step 1: Read current route.ts thoroughly**

Read `src/app/api/mcp/route.ts` and `src/lib/tenant/resolve.ts` to understand:
- How tools get tenant credentials (via closure from `resolveTenant` result)
- How KV batch state is managed
- Which tool schemas are imported

- [ ] **Step 2: Verify mcp-handler's verifyToken callback signature**

```bash
node -e "const m = require('mcp-handler'); console.log(m.withMcpAuth.toString().slice(0, 200))"
```

Confirm the callback signature is `(req: Request, bearerToken?: string) => Promise<AuthInfo | undefined>`. If different, update `src/lib/oauth/verify-token.ts` to match before proceeding.

- [ ] **Step 3: Refactor to mcp-handler**

The key change: tool handlers now use `getCredentialsByTenantId(tenantId)` from Task 11 instead of receiving pre-resolved credentials from a closure.

Update `src/app/api/mcp/route.ts`:

```typescript
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { verifyToken } from '@/lib/oauth/verify-token';
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials';

const handler = createMcpHandler(
  (server) => {
    // Register all existing tools — same logic, same schemas
    // Inside each tool handler, get credentials from AuthInfo:
    //   const tenantId = server.auth?.extra?.tenantId;
    //   const creds = await getCredentialsByTenantId(tenantId);
  },
  {},
  { basePath: '/api' },
);

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
```

- [ ] **Step 4: Update existing MCP route tests**

The existing tests in `tests/app/api/mcp/route.test.ts` and `tests/mcp/route.test.ts` import `POST` from the route. After migration:
- Exports change to `GET`, `POST`, `DELETE` (all `authHandler`)
- Token verification is now handled by `withMcpAuth`, not manual extraction
- Update mocks to provide `AuthInfo` via the `mcp-handler` test utilities, or mock `verifyToken` directly

- [ ] **Step 5: Run updated tests**

```bash
npx vitest run tests/app/api/mcp/route.test.ts
npx vitest run tests/mcp/route.test.ts
```

Expected: All tests PASS. If tests fail, investigate whether `mcp-handler` wraps the handler differently than expected.

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

---

## Task 13: Dashboard — MCP URL Section

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Context:** Add a third section showing the MCP URL for Claude Desktop. Simple static content with a copy button. Follow the existing terminal-style dark UI.

- [ ] **Step 1: Read current dashboard page**

Read `src/app/dashboard/page.tsx` to understand the existing layout and styling patterns.

- [ ] **Step 2: Add MCP URL section**

After the existing API Tokens section, add:

```tsx
{/* MCP Clients Section */}
<div style={{
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '20px',
  marginTop: '20px',
}}>
  <h2 style={{ color: '#ff4444', fontFamily: 'monospace', marginTop: 0 }}>
    Claude / MCP Clients
  </h2>
  <p style={{ color: '#ccc', fontFamily: 'monospace', fontSize: '14px' }}>
    Verbind Claude met je BPost account:
  </p>
  <div style={{
    background: '#1a1a1a',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '12px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <code>{`${baseUrl}/api/mcp`}</code>
  </div>
  <p style={{ color: '#888', fontFamily: 'monospace', fontSize: '12px', marginTop: '8px' }}>
    Plak deze URL in Claude Desktop onder Settings &gt; MCP Servers.
    Claude regelt de login automatisch via Google.
  </p>
</div>
```

Where `baseUrl` is derived from `process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app'`.

- [ ] **Step 3: Verify the page renders**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard` and verify the new section appears.

---

## Task 14: Lint, Type Check & Final Verification

**Files:** All changed files

- [ ] **Step 1: Lint all changed files**

```bash
npm run lint:fix
```

Expected: No errors.

- [ ] **Step 2: Full type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass, no regressions.

- [ ] **Step 4: Verify .well-known endpoints locally**

```bash
npm run dev &
curl http://localhost:3000/.well-known/oauth-protected-resource | jq .
curl http://localhost:3000/.well-known/oauth-authorization-server | jq .
```

Expected: Both return valid JSON with correct metadata.

- [ ] **Step 5: Stage and commit all OAuth work**

```bash
git add src/lib/oauth/ src/lib/tenant/get-credentials.ts src/lib/db/schema.ts \
  src/app/.well-known/ src/app/oauth/ src/app/api/mcp/route.ts \
  src/app/dashboard/page.tsx tests/lib/oauth/ tests/app/oauth/ \
  tests/lib/tenant/get-credentials.test.ts \
  package.json package-lock.json .env.example drizzle/
git commit -m "feat(oauth): add OAuth 2.0 MCP integration with mcp-handler"
```

---

## Commit Strategy

Per project convention: **single commit at the end** of all tasks, not per-task. Task 14 handles the final commit.

## Dependencies Note

`@modelcontextprotocol/sdk` stays as a dependency — `mcp-handler` wraps it but `AuthInfo` type must be imported directly from the SDK.

## Summary

| Task | Component | Est. Complexity |
|------|-----------|----------------|
| 1 | Install dependencies + API verification | Trivial |
| 2 | Database schema (3 tables) | Low |
| 3 | JWT helpers | Low |
| 4 | PKCE helper | Trivial |
| 5 | Client resolver | Medium |
| 6 | Unified token verification | Medium |
| 7 | Metadata endpoints | Low |
| 8 | DCR endpoint | Medium |
| 9 | Token endpoint | High |
| 10 | Authorization endpoint | High |
| 11 | Credential-fetching helper | Low |
| 12 | MCP route migration (highest risk) | High |
| 13 | Dashboard update | Low |
| 14 | Lint, verification & single commit | Trivial |
