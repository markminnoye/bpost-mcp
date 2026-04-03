# Phase 2 Sprint 1 — Credential Layer, Auth & Multi-Tenant MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded env-var BPost credentials with a multi-tenant credential layer: bearer-token auth on the MCP endpoint resolves to a tenant's AES-256-GCM encrypted credentials stored in Neon Postgres, and a Google OAuth settings dashboard lets tenants manage credentials and generate tokens.

**Architecture:** Each MCP request carries `Authorization: Bearer bpost_xxx`. The route extracts and SHA-256 hashes the token, looks it up in `api_tokens`, joins `bpost_credentials`, decrypts the password, and instantiates `BpostClient` with the resolved creds. The settings dashboard (`/dashboard`) is gated by Auth.js v5 Google OAuth — human tenants log in to configure credentials and generate tokens. No address data is stored (GDPR, ADR-006).

**Tech Stack:** Next.js 16, TypeScript, Vitest, Drizzle ORM, `@neondatabase/serverless`, `next-auth@beta` (Auth.js v5), `@auth/drizzle-adapter`, Node.js built-in `crypto` (AES-256-GCM), `tsx` (script runner), `drizzle-kit` (migrations)

**Reference:** Architecture decisions in [.agent/plans/2026-04-03-phase2-architecture.md](.agent/plans/2026-04-03-phase2-architecture.md)

> **Approved deviations (implemented by second agent, reviewed 2026-04-04):**
> - `bpost_credentials` table has two extra columns: `customerNumber` (NOT NULL) and `accountId` (NOT NULL) — real BPost fields needed for `Context.sender` / `Header.customerId/accountId` auto-injection in the MCP route.
> - `users` table has an extra `tenantId` FK column — used by Auth.js `createUser` event to link a Google login to a tenant automatically.
> - `auth.ts` has a `createUser` event + `signIn` callback that auto-creates a tenant on first Google login.
> - MCP route auto-injects `Context.sender`, `Header.customerId`, `Header.accountId`, `Header.mode` from tenant credentials — removes boilerplate from the agent caller.

---

## File Map

### New files

| File | Responsibility |
|---|---|
| `src/lib/db/schema.ts` | Drizzle table definitions: `tenants`, `bpost_credentials`, `api_tokens`, `audit_log` |
| `src/lib/db/client.ts` | Neon + Drizzle singleton (`db` export) |
| `src/lib/crypto.ts` | Pure AES-256-GCM `encrypt` / `decrypt` + `hashToken` (SHA-256) |
| `src/lib/tenant/resolve.ts` | `resolveTenant(token)` → `TenantContext \| null` — joins token hash → credentials, decrypts |
| `src/lib/auth.ts` | Auth.js v5 config (Google provider, Drizzle adapter) |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js HTTP handler |
| `src/app/dashboard/page.tsx` | Settings UI — BPost credentials form + bearer token generator |
| `drizzle.config.ts` | Drizzle Kit config pointing at `DATABASE_URL` |
| `scripts/seed-demo-tenant.ts` | Bootstrap customer #0 (internal demo), prints generated bearer token |
| `tests/lib/crypto.test.ts` | Unit tests for encrypt/decrypt round-trip, IV uniqueness, wrong-key rejection |
| `tests/lib/tenant/resolve.test.ts` | Unit tests for `resolveTenant`: valid token, unknown token, revoked token |
| `tests/client/bpost.test.ts` | Unit tests for `createBpostClient` with explicit credentials |
| `tests/app/api/mcp/route.test.ts` | Route integration tests: 401 on missing header, 401 on bad token |

### Modified files

| File | Change |
|---|---|
| `src/client/bpost.ts` | `createBpostClient(credentials)` — remove env-var reading, require explicit creds |
| `src/app/api/mcp/route.ts` | Extract bearer token → `resolveTenant` → 401 or pass creds to `createServer(creds)` |

---

## Environment Variables

Before running anything, these must be set in `.env.local` (dev) and Vercel dashboard (prod):

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Vercel Marketplace → Neon → auto-injected |
| `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` — 32-byte base64 |
| `AUTH_SECRET` | `npx auth secret` (prints a random secret) |
| `AUTH_GOOGLE_ID` | Google Cloud Console → OAuth 2.0 Client ID |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console → OAuth 2.0 Client Secret |
| `SEED_BPOST_USERNAME` | Your BPost e-MassPost username (seed only) |
| `SEED_BPOST_PASSWORD` | Your BPost e-MassPost password (seed only) |

**Remove after this sprint:** `BPOST_USERNAME`, `BPOST_PASSWORD` (no longer read by any code)

---

## Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime deps**

  ```bash
  npm install drizzle-orm @neondatabase/serverless next-auth@beta @auth/drizzle-adapter
  ```

- [ ] **Step 2: Install dev deps**

  ```bash
  npm install --save-dev drizzle-kit tsx
  ```

- [ ] **Step 3: Add scripts to package.json**

  Add to the `"scripts"` block:
  ```json
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "seed": "tsx scripts/seed-demo-tenant.ts"
  ```

- [ ] **Step 4: Verify install succeeds**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors (new packages have no types yet to conflict)

---

## Task 2: Drizzle config + DB schema

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/schema.ts`

- [ ] **Step 1: Create `drizzle.config.ts`**

  ```typescript
  // drizzle.config.ts
  import { defineConfig } from 'drizzle-kit'

  export default defineConfig({
    schema: './src/lib/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
      url: process.env.DATABASE_URL!,
    },
  })
  ```

- [ ] **Step 2: Create `src/lib/db/schema.ts`**

  ```typescript
  // src/lib/db/schema.ts
  import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'

  export const tenants = pgTable('tenants', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  })

  export const bpostCredentials = pgTable('bpost_credentials', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    username: text('username').notNull(),
    passwordEncrypted: text('password_encrypted').notNull(),
    passwordIv: text('password_iv').notNull(),
    prsNumber: text('prs_number'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  export const apiTokens = pgTable('api_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    tokenHash: text('token_hash').notNull().unique(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
  })

  export const auditLog = pgTable('audit_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    tool: text('tool').notNull(),
    action: text('action').notNull(),
    status: text('status').notNull(),
    errorCode: text('error_code'),
    durationMs: integer('duration_ms').notNull(),
    calledAt: timestamp('called_at').notNull().defaultNow(),
  })
  ```

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

---

## Task 3: DB client singleton

**Files:**
- Create: `src/lib/db/client.ts`

- [ ] **Step 1: Create `src/lib/db/client.ts`**

  ```typescript
  // src/lib/db/client.ts
  import { neon } from '@neondatabase/serverless'
  import { drizzle } from 'drizzle-orm/neon-http'
  import * as schema from './schema'

  const sql = neon(process.env.DATABASE_URL!)
  export const db = drizzle(sql, { schema })
  ```

  > Using `neon-http` driver (not TCP) avoids cold-start latency on Vercel serverless. This is the correct driver for `@neondatabase/serverless` + Drizzle.

- [ ] **Step 2: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

---

## Task 4: AES-256-GCM crypto helpers (TDD)

**Files:**
- Create: `src/lib/crypto.ts`
- Create: `tests/lib/crypto.test.ts`

- [ ] **Step 1: Write the failing tests**

  ```typescript
  // tests/lib/crypto.test.ts
  import { describe, it, expect } from 'vitest'
  import { randomBytes } from 'crypto'
  import { encrypt, decrypt, hashToken } from '@/lib/crypto'

  const TEST_KEY = randomBytes(32).toString('base64')

  describe('encrypt / decrypt', () => {
    it('round-trips plaintext correctly', () => {
      const plaintext = 'my-secret-password-123'
      const { ciphertext, iv } = encrypt(plaintext, TEST_KEY)
      expect(decrypt(ciphertext, iv, TEST_KEY)).toBe(plaintext)
    })

    it('produces a different IV on each call', () => {
      const { iv: iv1 } = encrypt('hello', TEST_KEY)
      const { iv: iv2 } = encrypt('hello', TEST_KEY)
      expect(iv1).not.toBe(iv2)
    })

    it('throws when decrypting with wrong key', () => {
      const { ciphertext, iv } = encrypt('secret', TEST_KEY)
      const wrongKey = randomBytes(32).toString('base64')
      expect(() => decrypt(ciphertext, iv, wrongKey)).toThrow()
    })
  })

  describe('hashToken', () => {
    it('returns a deterministic hex string for the same input', () => {
      expect(hashToken('abc')).toBe(hashToken('abc'))
    })

    it('returns different hashes for different inputs', () => {
      expect(hashToken('abc')).not.toBe(hashToken('xyz'))
    })

    it('produces a 64-char hex string (SHA-256)', () => {
      expect(hashToken('token').length).toBe(64)
    })
  })
  ```

- [ ] **Step 2: Run tests — verify they fail**

  ```bash
  npx vitest run tests/lib/crypto.test.ts
  ```
  Expected: `FAIL` — cannot find module `@/lib/crypto`

- [ ] **Step 3: Implement `src/lib/crypto.ts`**

  ```typescript
  // src/lib/crypto.ts
  import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

  const ALGORITHM = 'aes-256-gcm'
  const IV_BYTES = 12  // GCM standard IV length
  const TAG_BYTES = 16 // GCM auth tag length

  export function encrypt(
    plaintext: string,
    keyBase64: string,
  ): { ciphertext: string; iv: string } {
    const key = Buffer.from(keyBase64, 'base64')
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    // Append auth tag to ciphertext so both travel together
    const combined = Buffer.concat([encrypted, authTag])
    return {
      ciphertext: combined.toString('base64'),
      iv: iv.toString('base64'),
    }
  }

  export function decrypt(
    ciphertext: string,
    iv: string,
    keyBase64: string,
  ): string {
    const key = Buffer.from(keyBase64, 'base64')
    const ivBuf = Buffer.from(iv, 'base64')
    const combined = Buffer.from(ciphertext, 'base64')
    const authTag = combined.subarray(combined.length - TAG_BYTES)
    const encrypted = combined.subarray(0, combined.length - TAG_BYTES)
    const decipher = createDecipheriv(ALGORITHM, key, ivBuf)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
  }

  export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
  ```

- [ ] **Step 4: Run tests — verify they pass**

  ```bash
  npx vitest run tests/lib/crypto.test.ts
  ```
  Expected: `PASS` — 6 tests

---

## Task 5: Tenant resolver (TDD)

**Files:**
- Create: `src/lib/tenant/resolve.ts`
- Create: `tests/lib/tenant/resolve.test.ts`

- [ ] **Step 1: Write the failing tests**

  ```typescript
  // tests/lib/tenant/resolve.test.ts
  import { describe, it, expect, vi, beforeEach } from 'vitest'
  import { randomBytes } from 'crypto'
  import { hashToken, encrypt } from '@/lib/crypto'

  // Mock the db module before importing resolve
  vi.mock('@/lib/db/client', () => ({
    db: {
      select: vi.fn(),
      update: vi.fn(),
    },
  }))

  import { resolveTenant } from '@/lib/tenant/resolve'
  import { db } from '@/lib/db/client'

  const ENCRYPTION_KEY = randomBytes(32).toString('base64')
  const RAW_TOKEN = 'bpost_test_token_abc123'
  const TOKEN_HASH = hashToken(RAW_TOKEN)
  const TENANT_ID = 'tenant-uuid-1'
  const TOKEN_ID = 'token-uuid-1'

  function makeDbChain(result: unknown[]) {
    // Drizzle fluent chain: .select().from().innerJoin().where().where().limit()
    const chain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(result),
    }
    vi.mocked(db.select).mockReturnValue(chain as never)
    return chain
  }

  function makeUpdateChain() {
    const chain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(db.update).mockReturnValue(chain as never)
    return chain
  }

  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('ENCRYPTION_KEY', ENCRYPTION_KEY)
    vi.clearAllMocks()
  })

  describe('resolveTenant', () => {
    it('returns TenantContext for a valid non-revoked token', async () => {
      const { ciphertext, iv } = encrypt('secret-pass', ENCRYPTION_KEY)
      makeDbChain([
        {
          tenantId: TENANT_ID,
          tokenId: TOKEN_ID,
          username: 'demo-user',
          passwordEncrypted: ciphertext,
          passwordIv: iv,
          prsNumber: null,
        },
      ])
      makeUpdateChain()

      const ctx = await resolveTenant(RAW_TOKEN)

      expect(ctx).not.toBeNull()
      expect(ctx!.tenantId).toBe(TENANT_ID)
      expect(ctx!.bpostUsername).toBe('demo-user')
      expect(ctx!.bpostPassword).toBe('secret-pass')
      expect(ctx!.prsNumber).toBeUndefined()
    })

    it('returns null for an unknown token hash', async () => {
      makeDbChain([])
      // db.update is NOT called when rows is empty — no makeUpdateChain() needed

      const ctx = await resolveTenant('bpost_unknown_token')
      expect(ctx).toBeNull()
      expect(vi.mocked(db.update)).not.toHaveBeenCalled()
    })

    it('returns null when db returns empty (token revoked — filtered by query)', async () => {
      // Revoked tokens are excluded by WHERE revokedAt IS NULL in the query
      // So the db returns an empty array — same as unknown token
      makeDbChain([])

      const ctx = await resolveTenant(RAW_TOKEN)
      expect(ctx).toBeNull()
      expect(vi.mocked(db.update)).not.toHaveBeenCalled()
    })
  })
  ```

- [ ] **Step 2: Run tests — verify they fail**

  ```bash
  npx vitest run tests/lib/tenant/resolve.test.ts
  ```
  Expected: `FAIL` — cannot find module `@/lib/tenant/resolve`

- [ ] **Step 3: Implement `src/lib/tenant/resolve.ts`**

  ```typescript
  // src/lib/tenant/resolve.ts
  import { eq, isNull } from 'drizzle-orm'
  import { db } from '@/lib/db/client'
  import { apiTokens, bpostCredentials } from '@/lib/db/schema'
  import { decrypt, hashToken } from '@/lib/crypto'

  export interface TenantContext {
    tenantId: string
    bpostUsername: string
    bpostPassword: string
    prsNumber?: string
  }

  export async function resolveTenant(bearerToken: string): Promise<TenantContext | null> {
    const hash = hashToken(bearerToken)

    const rows = await db
      .select({
        tenantId: apiTokens.tenantId,
        tokenId: apiTokens.id,
        username: bpostCredentials.username,
        passwordEncrypted: bpostCredentials.passwordEncrypted,
        passwordIv: bpostCredentials.passwordIv,
        prsNumber: bpostCredentials.prsNumber,
      })
      .from(apiTokens)
      .innerJoin(bpostCredentials, eq(bpostCredentials.tenantId, apiTokens.tenantId))
      .where(eq(apiTokens.tokenHash, hash))
      .where(isNull(apiTokens.revokedAt))
      .limit(1)

    if (rows.length === 0) return null

    const row = rows[0]
    const password = decrypt(
      row.passwordEncrypted,
      row.passwordIv,
      process.env.ENCRYPTION_KEY!,
    )

    // Non-critical: update last_used_at in the background
    db.update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, row.tokenId))
      .execute()
      .catch(() => {})

    return {
      tenantId: row.tenantId,
      bpostUsername: row.username,
      bpostPassword: password,
      prsNumber: row.prsNumber ?? undefined,
    }
  }
  ```

- [ ] **Step 4: Run tests — verify they pass**

  ```bash
  npx vitest run tests/lib/tenant/resolve.test.ts
  ```
  Expected: `PASS` — 3 tests

---

## Task 6: Modify `src/client/bpost.ts` — accept explicit credentials

**Files:**
- Modify: `src/client/bpost.ts`

The `createBpostClient()` factory currently reads `BPOST_USERNAME`/`BPOST_PASSWORD` from env. Replace it to require explicit credentials. The `BpostClient` class itself is unchanged.

- [ ] **Step 1: Write the failing test**

  ```typescript
  // tests/client/bpost.test.ts
  import { describe, it, expect } from 'vitest'
  import { createBpostClient, BpostClient } from '@/client/bpost'

  describe('createBpostClient', () => {
    it('creates a BpostClient from explicit credentials', () => {
      const client = createBpostClient({ username: 'user', password: 'pass' })
      expect(client).toBeInstanceOf(BpostClient)
    })

    it('does not read from process.env', () => {
      // Should not throw even when env vars are absent
      delete process.env.BPOST_USERNAME
      delete process.env.BPOST_PASSWORD
      expect(() => createBpostClient({ username: 'u', password: 'p' })).not.toThrow()
    })
  })
  ```

- [ ] **Step 2: Run test — verify it fails**

  ```bash
  npx vitest run tests/client/bpost.test.ts
  ```
  Expected: `FAIL` — `createBpostClient` requires no args currently / test type mismatch

- [ ] **Step 3: Update `src/client/bpost.ts`**

  Replace only the factory function (lines 63–71). The `BpostClient` class and everything above it is unchanged:

  ```typescript
  /** Factory: builds BpostClient from explicit credentials */
  export function createBpostClient(credentials: { username: string; password: string }): BpostClient {
    return new BpostClient(credentials)
  }
  ```

- [ ] **Step 4: Run test — verify it passes**

  ```bash
  npx vitest run tests/client/bpost.test.ts
  ```
  Expected: `PASS` — 2 tests

---

## Task 7: Modify `src/app/api/mcp/route.ts` — add tenant resolution (TDD)

**Files:**
- Modify: `src/app/api/mcp/route.ts`
- Create: `tests/app/api/mcp/route.test.ts`

- [ ] **Step 1: Write the failing tests**

  ```typescript
  // tests/app/api/mcp/route.test.ts
  import { describe, it, expect, vi } from 'vitest'

  vi.mock('@/lib/tenant/resolve', () => ({
    resolveTenant: vi.fn(),
  }))

  import { POST } from '@/app/api/mcp/route'
  import { resolveTenant } from '@/lib/tenant/resolve'

  describe('POST /api/mcp', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new Request('http://localhost/api/mcp', { method: 'POST' })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 401 when Authorization header is not Bearer format', async () => {
      const req = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 401 when token does not resolve to a tenant', async () => {
      vi.mocked(resolveTenant).mockResolvedValue(null)
      const req = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: { Authorization: 'Bearer bpost_unknown' },
      })
      const res = await POST(req)
      expect(res.status).toBe(401)
    })
  })
  ```

- [ ] **Step 2: Run tests — verify they fail**

  ```bash
  npx vitest run tests/app/api/mcp/route.test.ts
  ```
  Expected: `FAIL` — currently no 401, route always proceeds

- [ ] **Step 3: Update `src/app/api/mcp/route.ts`**

  Full replacement:

  ```typescript
  // src/app/api/mcp/route.ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
  import { DepositRequestSchema } from '@/schemas/deposit-request'
  import { MailingRequestSchema } from '@/schemas/mailing-request'
  import { buildXml } from '@/lib/xml'
  import { createBpostClient } from '@/client/bpost'
  import { BpostError } from '@/client/errors'
  import { resolveTenant } from '@/lib/tenant/resolve'

  interface BpostCredentials {
    username: string
    password: string
  }

  function createServer(credentials: BpostCredentials): McpServer {
    const server = new McpServer({
      name: 'bpost-emasspost',
      version: '1.0.0',
    })

    server.registerTool(
      'bpost_announce_deposit',
      {
        description:
          'Announce a mail deposit to BPost e-MassPost. Accepts a validated DepositRequest payload ' +
          '(Create, Update, Delete, or Validate actions) and returns the BPost response.',
        inputSchema: DepositRequestSchema,
      },
      async (input) => {
        const client = createBpostClient(credentials)
        const xml = buildXml({ DepositRequest: input })
        try {
          const result = await client.sendDepositRequest(xml)
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        } catch (err) {
          if (err instanceof BpostError) {
            return {
              content: [{ type: 'text', text: JSON.stringify(err.toMcpError(), null, 2) }],
              isError: true,
            }
          }
          throw err
        }
      },
    )

    server.registerTool(
      'bpost_announce_mailing',
      {
        description:
          'Announce a mailing batch to BPost e-MassPost. Accepts a MailingRequest payload and ' +
          'returns the BPost response or a structured error with the MPW/MID code.',
        inputSchema: MailingRequestSchema,
      },
      async (input) => {
        const client = createBpostClient(credentials)
        const xml = buildXml({ MailingRequest: input })
        try {
          const result = await client.sendMailingRequest(xml)
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        } catch (err) {
          if (err instanceof BpostError) {
            return {
              content: [{ type: 'text', text: JSON.stringify(err.toMcpError(), null, 2) }],
              isError: true,
            }
          }
          throw err
        }
      },
    )

    return server
  }

  export async function POST(req: Request): Promise<Response> {
    // 1. Extract bearer token
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Resolve tenant from token
    const tenant = await resolveTenant(token)
    if (!tenant) {
      return new Response(JSON.stringify({ error: 'Invalid or revoked token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Handle MCP request with tenant credentials
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    const server = createServer({ username: tenant.bpostUsername, password: tenant.bpostPassword })
    await server.connect(transport)
    return transport.handleRequest(req)
  }
  ```

- [ ] **Step 4: Run tests — verify they pass**

  ```bash
  npx vitest run tests/app/api/mcp/route.test.ts
  ```
  Expected: `PASS` — 3 tests

- [ ] **Step 5: Run full test suite — no regressions**

  ```bash
  npm test
  ```
  Expected: all tests pass

---

## Task 7b: External service setup — Neon + Google OAuth

These are manual steps with no code changes. Complete before Task 8.

**Neon Postgres:**

- [ ] **Step 1: Provision Neon via Vercel Marketplace**

  1. Go to your Vercel project → Storage → Add → Neon Postgres
  2. Follow the wizard — Vercel auto-injects `DATABASE_URL` into your project's environment variables
  3. Pull env vars locally: `vercel env pull .env.local`
  4. Verify `DATABASE_URL` is present: `grep DATABASE_URL .env.local`

**Google OAuth:**

- [ ] **Step 2: Create a Google Cloud project + OAuth credentials**

  1. Go to [console.cloud.google.com](https://console.cloud.google.com)
  2. Create a new project (or reuse an existing one)
  3. APIs & Services → Enable → search for "Google+ API" → Enable
  4. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
  5. Application type: **Web application**
  6. Authorised redirect URIs — add both:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://your-vercel-domain.vercel.app/api/auth/callback/google` (prod)
  7. Copy **Client ID** and **Client Secret**

- [ ] **Step 3: Add all env vars to `.env.local`**

  ```bash
  # Already present after vercel env pull:
  # DATABASE_URL=postgres://...

  # Generate and add:
  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  AUTH_SECRET=$(npx auth secret --raw)  # or: openssl rand -base64 32

  # From Google Cloud Console:
  AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
  AUTH_GOOGLE_SECRET=GOCSPX-...
  ```

  Append these to `.env.local` manually.

- [ ] **Step 4: Verify env vars are present**

  ```bash
  grep -E "DATABASE_URL|ENCRYPTION_KEY|AUTH_SECRET|AUTH_GOOGLE" .env.local
  ```
  Expected: 5 lines, all non-empty

---

## Task 8: Auth.js v5 config + route

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

Auth.js v5 requires `users`, `accounts`, `sessions`, and `verificationTokens` tables. The `@auth/drizzle-adapter` does **not** export a pre-built schema file — you define these tables yourself using `pgTable` from Drizzle, following the shape the adapter expects.

- [ ] **Step 1: Verify the adapter's required table shape**

  After Task 1 runs, check what the installed adapter exports:
  ```bash
  node -e "const a = require('@auth/drizzle-adapter'); console.log(Object.keys(a))"
  ```
  Then open `node_modules/@auth/drizzle-adapter/README.md` or the adapter source to copy the exact Postgres table definitions. The adapter requires specific column names (`name`, `email`, `emailVerified`, `image` for `users`; `userId`, `type`, `provider`, `providerAccountId` for `accounts`; etc.).

- [ ] **Step 2: Add Auth.js tables to `src/lib/db/schema.ts`**

  Append the following to `src/lib/db/schema.ts` (column names mirror Auth.js adapter expectations — do not rename):

  ```typescript
  import { boolean } from 'drizzle-orm/pg-core'

  export const users = pgTable('user', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name'),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('emailVerified', { mode: 'date' }),
    image: text('image'),
  })

  export const accounts = pgTable('account', {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  })

  export const sessions = pgTable('session', {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  })

  export const verificationTokens = pgTable('verificationToken', {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  })
  ```

  > These exact column names are required by `DrizzleAdapter`. The `boolean` import is only needed if you extend later. Remove it if unused after this step.

- [ ] **Step 3: Create `src/lib/auth.ts`**

  Pass tables explicitly to `DrizzleAdapter` — required because we defined the Auth.js tables in our own schema file:

  ```typescript
  // src/lib/auth.ts
  import NextAuth from 'next-auth'
  import Google from 'next-auth/providers/google'
  import { DrizzleAdapter } from '@auth/drizzle-adapter'
  import { db } from '@/lib/db/client'
  import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'

  export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    providers: [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      }),
    ],
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id
        return session
      },
    },
  })
  ```

- [ ] **Step 4: Create `src/app/api/auth/[...nextauth]/route.ts`**

  ```typescript
  // src/app/api/auth/[...nextauth]/route.ts
  import { handlers } from '@/lib/auth'
  export const { GET, POST } = handlers
  ```

- [ ] **Step 5: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors

---

## Task 9: Run database migrations

- [ ] **Step 1: Ensure `DATABASE_URL` is set in `.env.local`**

  ```
  DATABASE_URL=postgres://...  (copy from Vercel Neon integration)
  ENCRYPTION_KEY=...           (generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  AUTH_SECRET=...              (generate: npx auth secret)
  AUTH_GOOGLE_ID=...
  AUTH_GOOGLE_SECRET=...
  ```

- [ ] **Step 2: Generate migration SQL**

  ```bash
  npm run db:generate
  ```
  Expected: `drizzle/` folder created with `0000_initial.sql`

- [ ] **Step 3: Push schema to Neon**

  ```bash
  npm run db:push
  ```
  Expected: all tables created — output lists each table

---

## Task 10: Seed script — bootstrap customer #0

**Files:**
- Create: `scripts/seed-demo-tenant.ts`

- [ ] **Step 1: Create `scripts/seed-demo-tenant.ts`**

  ```typescript
  // scripts/seed-demo-tenant.ts
  import { randomBytes } from 'crypto'
  import { db } from '../src/lib/db/client'
  import { tenants, bpostCredentials, apiTokens } from '../src/lib/db/schema'
  import { encrypt, hashToken } from '../src/lib/crypto'

  async function seed() {
    const encKey = process.env.ENCRYPTION_KEY
    if (!encKey) throw new Error('ENCRYPTION_KEY env var is required')

    const username = process.env.SEED_BPOST_USERNAME
    const password = process.env.SEED_BPOST_PASSWORD
    if (!username || !password) {
      throw new Error('SEED_BPOST_USERNAME and SEED_BPOST_PASSWORD must be set')
    }

    console.log('Seeding internal demo tenant (customer #0)...')

    const [tenant] = await db
      .insert(tenants)
      .values({ name: 'Internal Demo (Customer #0)' })
      .returning()

    const { ciphertext, iv } = encrypt(password, encKey)
    await db.insert(bpostCredentials).values({
      tenantId: tenant.id,
      username,
      passwordEncrypted: ciphertext,
      passwordIv: iv,
    })

    const rawToken = `bpost_${randomBytes(32).toString('hex')}`
    const tokenHash = hashToken(rawToken)
    await db.insert(apiTokens).values({
      tenantId: tenant.id,
      tokenHash,
      label: 'demo-seed-token',
    })

    console.log(`\n✅ Demo tenant seeded`)
    console.log(`   Tenant ID : ${tenant.id}`)
    console.log(`   Bearer token: ${rawToken}`)
    console.log('\n⚠️  Copy this token now — it is not stored in plaintext and cannot be recovered.\n')
  }

  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
  ```

- [ ] **Step 2: Run the seed**

  ```bash
  npm run seed
  ```
  Expected: prints tenant ID and bearer token — **save the token**

---

## Task 11: Dashboard page — credentials form + token management

**Files:**
- Create: `src/app/dashboard/page.tsx`

This is a Server Component. It reads the Auth.js session server-side and redirects if not authenticated. Credential form and token generation are handled via Server Actions.

- [ ] **Step 1: Create `src/app/dashboard/page.tsx`**

  Two design notes for this implementation:
  - **No relational queries (`db.query.X.findFirst({ with: ... })`)** — that API requires `relations()` calls in schema.ts that we don't have. Use plain `db.select().from().leftJoin()` instead.
  - **Token display** — the `generateToken` Server Action redirects to `/dashboard?token=xxx` so the token appears on the page. It is only ever visible via this redirect; the URL query param is cleared on next navigation.

  ```typescript
  // src/app/dashboard/page.tsx
  import { redirect } from 'next/navigation'
  import { auth, signOut } from '@/lib/auth'
  import { db } from '@/lib/db/client'
  import { tenants, bpostCredentials, apiTokens } from '@/lib/db/schema'
  import { encrypt, hashToken } from '@/lib/crypto'
  import { eq } from 'drizzle-orm'
  import { randomBytes } from 'crypto'

  interface Props {
    searchParams: Promise<{ token?: string }>
  }

  export default async function DashboardPage({ searchParams }: Props) {
    const session = await auth()
    if (!session?.user?.id) {
      redirect('/api/auth/signin')
    }

    const params = await searchParams
    const newlyGeneratedToken = params.token ?? null

    // For Phase 2 pilot: first tenant in the table is the pilot tenant.
    // Sprint 2 adds a proper user→tenant mapping table.
    const [existingTenant] = await db.select().from(tenants).limit(1)

    const existingCreds = existingTenant
      ? await db
          .select()
          .from(bpostCredentials)
          .where(eq(bpostCredentials.tenantId, existingTenant.id))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null

    const tokens = existingTenant
      ? await db.select().from(apiTokens).where(eq(apiTokens.tenantId, existingTenant.id))
      : []

    async function saveCreds(formData: FormData) {
      'use server'
      const username = formData.get('username') as string
      const password = formData.get('password') as string
      const prsNumber = (formData.get('prsNumber') as string) || null
      const encKey = process.env.ENCRYPTION_KEY!
      const { ciphertext, iv } = encrypt(password, encKey)

      const [tenant] = await db.select().from(tenants).limit(1)
      if (tenant) {
        await db
          .update(bpostCredentials)
          .set({ username, passwordEncrypted: ciphertext, passwordIv: iv, prsNumber, updatedAt: new Date() })
          .where(eq(bpostCredentials.tenantId, tenant.id))
      } else {
        const [newTenant] = await db
          .insert(tenants)
          .values({ name: 'Pilot Tenant' })
          .returning()
        await db.insert(bpostCredentials).values({
          tenantId: newTenant.id,
          username,
          passwordEncrypted: ciphertext,
          passwordIv: iv,
          prsNumber,
        })
      }
      redirect('/dashboard')
    }

    async function generateToken(formData: FormData) {
      'use server'
      const label = (formData.get('label') as string) || 'claude-desktop'
      const [tenant] = await db.select().from(tenants).limit(1)
      if (!tenant) redirect('/dashboard')

      const rawToken = `bpost_${randomBytes(32).toString('hex')}`
      const tokenHash = hashToken(rawToken)
      await db.insert(apiTokens).values({ tenantId: tenant.id, tokenHash, label })
      // Redirect with token in URL — shown once on the page, then gone on next navigation
      redirect(`/dashboard?token=${encodeURIComponent(rawToken)}`)
    }

    return (
      <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
        <h1>BPost MCP — Settings</h1>
        <p>Logged in as {session.user.email}</p>
        <form action={signOut as never}>
          <button type="submit">Sign out</button>
        </form>

        {newlyGeneratedToken && (
          <div style={{ background: '#fffbe6', border: '2px solid #f5a623', padding: '1rem', margin: '1rem 0' }}>
            <strong>⚠️ Copy your bearer token now — it will not be shown again:</strong><br />
            <code style={{ wordBreak: 'break-all' }}>{newlyGeneratedToken}</code>
          </div>
        )}

        <hr />
        <h2>BPost Credentials</h2>
        {existingCreds && <p>✅ Credentials configured for user: <strong>{existingCreds.username}</strong></p>}
        <form action={saveCreds}>
          <label>
            Username<br />
            <input name="username" defaultValue={existingCreds?.username ?? ''} required />
          </label><br />
          <label>
            Password<br />
            <input name="password" type="password" required />
          </label><br />
          <label>
            PRS Number (optional)<br />
            <input name="prsNumber" defaultValue={existingCreds?.prsNumber ?? ''} />
          </label><br />
          <button type="submit">Save Credentials</button>
        </form>

        <hr />
        <h2>Bearer Tokens</h2>
        <form action={generateToken}>
          <label>
            Label (e.g. &quot;claude-desktop-prod&quot;)<br />
            <input name="label" defaultValue="claude-desktop" required />
          </label><br />
          <button type="submit">Generate Token</button>
        </form>

        <h3>Active tokens ({tokens.filter((t) => !t.revokedAt).length})</h3>
        <ul>
          {tokens.map((t) => (
            <li key={t.id}>
              {t.label} — created {t.createdAt.toISOString()}
              {t.revokedAt ? ' (revoked)' : ''}
            </li>
          ))}
        </ul>
      </main>
    )
  }
  ```

- [ ] **Step 2: Type-check**

  ```bash
  npx tsc --noEmit
  ```
  Expected: no errors (resolve any `session.user.id` type augmentation if needed — see Auth.js docs for `types/next-auth.d.ts`)

---

## Task 12: Remove legacy env-var credentials

- [ ] **Step 1: Remove `BPOST_USERNAME` and `BPOST_PASSWORD` from `.env.local`**

- [ ] **Step 2: Verify nothing imports from env for BPost creds**

  ```bash
  grep -rE "BPOST_USERNAME|BPOST_PASSWORD" src/
  ```
  Expected: no matches

- [ ] **Step 3: Full test suite + type check**

  ```bash
  npm test && npx tsc --noEmit && npm run lint:fix
  ```
  Expected: all pass

---

## Task 13: Smoke test end-to-end (manual)

- [ ] **Step 1: Start dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: Verify dashboard redirects to Google sign-in**

  Open `http://localhost:3000/dashboard` — should redirect to `/api/auth/signin`

- [ ] **Step 3: Verify MCP endpoint 401s without token**

  ```bash
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  ```
  Expected: `401`

- [ ] **Step 4: Verify MCP endpoint accepts seed token**

  ```bash
  curl -s \
    -X POST http://localhost:3000/api/mcp \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <paste seed token here>" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  ```
  Expected: `200` with `bpost_announce_deposit` and `bpost_announce_mailing` in the tools list

---

## Checklist — Definition of Done

- [ ] `npm test` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint:fix` passes with no remaining errors
- [ ] MCP `/api/mcp` returns 401 without a valid bearer token
- [ ] MCP `/api/mcp` returns 200 + tools list with the seed token
- [ ] `/dashboard` redirects to Google sign-in when unauthenticated
- [ ] `BPOST_USERNAME` and `BPOST_PASSWORD` no longer appear in `src/`
- [ ] Plan marked ✅ in `INDEX.md`
