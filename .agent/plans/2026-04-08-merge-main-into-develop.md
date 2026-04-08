# Merge main→develop: Port Batch Pipeline to mcp-handler

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `main` into `develop` so develop contains all features from both branches — specifically porting the KV batch pipeline tools from `main`'s old `McpServer` pattern into `develop`'s `mcp-handler` + `withMcpAuth` architecture.

**Architecture:** The batch tools (`get_upload_instructions`, `get_raw_headers`, `apply_mapping_rules`, `get_batch_errors`, `apply_row_fix`, `submit_ready_batch`) currently use a closure-based `McpServer` that receives `tenantId` and `credentials` at construction time. In `develop`, tools get tenant context from `extra.authInfo.extra.tenantId` at call time. Each tool needs to be adapted to this pattern. The upload endpoint (`/api/batches/upload`) also needs its auth updated from `extractBearerToken` + `resolveTenant` to the new OAuth-compatible verification.

**Tech Stack:** TypeScript, mcp-handler, Zod, Vercel KV (@upstash/redis), vitest

---

## Context for Implementers

### How develop's mcp-handler pattern works

In `src/app/api/mcp/route.ts` on develop, tools are registered inside a `createMcpHandler` callback:

```typescript
const handler = createMcpHandler(
  (server) => {
    server.registerTool('tool_name', { description, inputSchema }, async (input, extra) => {
      const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
      if (!tenantId) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }], isError: true }
      }
      const credentials = await resolveCredentials(tenantId)
      // ... tool logic
    })
  },
  { serverInfo: { name: 'bpost-emasspost', version: '1.0.0' } },
  { basePath: '/api' },
)
```

Key differences from main's old pattern:
- `tenantId` comes from `extra.authInfo?.extra?.tenantId` (set by `verifyToken`)
- `credentials` are resolved per-call via `resolveCredentials(tenantId)`
- No closure — each tool resolves its own context
- `extra` second parameter is required in handler signature

### How `verifyToken` works

`verifyToken` in `src/lib/oauth/verify-token.ts` has this signature:

```typescript
export async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined>
```

It takes **two arguments**: the original Request object and the bearer token string. When called directly (outside `withMcpAuth`), you must pass both: `verifyToken(req, token)`.

### Files that exist on main but NOT on develop

| File | Purpose |
|---|---|
| `src/lib/kv/client.ts` | Redis client, `BatchState`/`BatchRow` types, `getBatchState`/`saveBatchState` |
| `src/app/api/batches/upload/route.ts` | CSV upload endpoint (uses old auth: `extractBearerToken` + `resolveTenant`) |

### Files that differ between main and develop

| File | Difference |
|---|---|
| `src/app/api/mcp/route.ts` | main: old McpServer + 8 tools. develop: mcp-handler + 2 tools |
| `src/schemas/mailing-request.ts` | main: `ItemSchema` exported + `Item` type. develop: `ItemSchema` private, no `Item` type |

### Dependencies on main not on develop

`main`'s `package.json` includes `papaparse` and `@upstash/redis` which are not in develop. These will be auto-merged by git, but `npm install` is required after the merge to install them into `node_modules`.

---

## Task 1: Merge main into develop (resolve non-route conflicts)

**Files:**
- All files differing between main and develop

- [ ] **Step 1: Run `git merge main` on develop branch**

```bash
git merge main
```

Expected: conflict in `src/app/api/mcp/route.ts` (and possibly `src/schemas/mailing-request.ts`)

- [ ] **Step 2: Resolve `src/schemas/mailing-request.ts`**

Take main's version for this file — re-export `ItemSchema` and the `Item` type. The batch tools need `ItemSchema` exported.

```bash
git checkout main -- src/schemas/mailing-request.ts
git add src/schemas/mailing-request.ts
```

- [ ] **Step 3: Accept both sides' non-conflicting files**

Files only on main (KV client, upload route) will be auto-added. Files only on develop (OAuth endpoints, etc.) are already there. Just verify with `git status`.

- [ ] **Step 4: Install dependencies**

Main adds `papaparse` and `@upstash/redis` which are not in develop's `node_modules`. Run:

```bash
npm install
```

- [ ] **Step 5: Mark merge as "in progress" — do NOT commit yet**

Route.ts will be resolved in Task 2.

---

## Task 2: Port batch tools into mcp-handler route

**Files:**
- Modify: `src/app/api/mcp/route.ts`

The final `route.ts` must:
1. Keep develop's `createMcpHandler` + `withMcpAuth` + `verifyToken` wrapper
2. Add `import { z } from 'zod'` — this is NOT in develop's current imports but is needed for batch tool inputSchemas
3. Add `import { ItemSchema } from '@/schemas/mailing-request'` to the existing import line
4. Add `import { getBatchState, saveBatchState } from '@/lib/kv/client'`
5. Port all 6 batch tools into the `createMcpHandler` callback, each using `(input, extra)` signature

- [ ] **Step 1: Write the complete merged route.ts**

Write the full file. For each of the 6 batch tools, copy the tool body from `main` (`git show main:src/app/api/mcp/route.ts`) and adapt it:
- Change handler signature from `async ({ field }) => {` to `async (input, extra) => {`
- Replace closure `tenantId` with: `const tenantId = extra.authInfo?.extra?.tenantId as string | undefined` + null check
- Replace `{ field }` destructuring with `input.field` access
- Add `as const` to all `type: 'text'` literals

Here is the complete target file:

```typescript
// src/app/api/mcp/route.ts
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { MailingRequestSchema, ItemSchema } from '@/schemas/mailing-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'
import { verifyToken } from '@/lib/oauth/verify-token'
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials'
import { z } from 'zod'
import { getBatchState, saveBatchState } from '@/lib/kv/client'

export const dynamic = 'force-dynamic'

async function resolveCredentials(tenantId: string) {
  const creds = await getCredentialsByTenantId(tenantId)
  if (!creds) {
    throw new Error(`No BPost credentials found for tenant ${tenantId}`)
  }
  return {
    username: creds.bpostUsername,
    password: creds.bpostPassword,
    customerNumber: creds.customerNumber,
    accountId: creds.accountId,
  }
}

const handler = createMcpHandler(
  (server) => {
    // ── Batch Pipeline Tools ─────────────────────────────────────────────

    server.registerTool(
      'get_upload_instructions',
      {
        description:
          'Returns the exact command to execute in your local terminal to securely upload an Excel or CSV file to the BPost MCP Service. Use this BEFORE attempting to validate a local file.',
        inputSchema: z.object({}),
      },
      async (_input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bpost.sonicrocket.io'
        const uploadUrl = `${baseUrl}/api/batches/upload`
        return {
          content: [{
            type: 'text' as const,
            text: `To securely upload your file, execute the following command in your local terminal exactly as written. Ensure you substitute <YOUR_FILE.csv> and your Bearer token:\n\ncurl -X POST -F "file=@<YOUR_FILE.csv>" ${uploadUrl} -H "Authorization: Bearer <TOKEN>"\n\nAfter a successful upload, you will receive a batchId in the JSON response. Use the "get_raw_headers" tool with that batchId to continue.`,
          }],
        }
      },
    )

    server.registerTool(
      'get_raw_headers',
      {
        description: 'Fetch the raw CSV headers of a newly uploaded batch. Use to prepare semantic mapping rules before triaging errors.',
        inputSchema: z.object({ batchId: z.string() }),
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} not found or expired.` }] }
        return { content: [{ type: 'text' as const, text: JSON.stringify({ headers: state.headers, status: state.status, totalRows: state.rows.length }, null, 2) }] }
      },
    )

    server.registerTool(
      'apply_mapping_rules',
      {
        description: 'Applies mapping rules to transform raw CSV columns into BPost schema fields. Moves the batch from UNMAPPED to MAPPED.',
        inputSchema: z.object({
          batchId: z.string(),
          mapping: z.record(z.string(), z.string()).describe('Format: { "Client Loc": "postalCode" }'),
        }),
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }
        if (state.status !== 'UNMAPPED') return { isError: true, content: [{ type: 'text' as const, text: 'Batch is already mapped. Use apply_row_fix to patch issues.' }] }

        const unknownCols = Object.keys(input.mapping).filter(col => !state.headers.includes(col))
        if (unknownCols.length > 0) {
          return { isError: true, content: [{ type: 'text' as const, text: `Mapping references unknown source columns: ${unknownCols.join(', ')}. Available headers: ${state.headers.join(', ')}` }] }
        }

        const knownFields = Object.keys(ItemSchema.shape)
        const unknownTargets = Object.values(input.mapping).filter(target => !knownFields.includes(target))
        if (unknownTargets.length > 0) {
          return { isError: true, content: [{ type: 'text' as const, text: `Mapping references unknown target fields: ${unknownTargets.join(', ')}. Known fields: ${knownFields.join(', ')}` }] }
        }

        state.rows = state.rows.map(r => {
          const mapped: Record<string, unknown> = {}
          Object.entries(input.mapping).forEach(([sourceCol, targetCol]) => {
            mapped[targetCol] = r.raw[sourceCol]
          })
          const result = ItemSchema.safeParse(mapped)
          return {
            ...r,
            mapped: result.success ? result.data : mapped,
            validationErrors: result.success ? undefined : result.error.issues,
          }
        })
        state.status = 'MAPPED'
        await saveBatchState(state)

        return { content: [{ type: 'text' as const, text: `Successfully mapped ${state.rows.length} rows.` }] }
      },
    )

    server.registerTool(
      'get_batch_errors',
      {
        description: 'Retrieves rows that failed Zod validation after mapping so you can trivially triage them with the user.',
        inputSchema: z.object({ batchId: z.string(), limit: z.number().int().min(1).default(10) }),
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        const erroredRows = state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0)
        const sliced = erroredRows.slice(0, input.limit)
        return { content: [{ type: 'text' as const, text: JSON.stringify({ totalErrors: erroredRows.length, visible: sliced.length, errors: sliced }, null, 2) }] }
      },
    )

    server.registerTool(
      'apply_row_fix',
      {
        description: 'Fixes a specific row using corrected payload data. Submits the surgical fix to the KV state cache.',
        inputSchema: z.object({
          batchId: z.string(),
          rowIndex: z.number().int().min(0),
          correctedData: z.record(z.string(), z.any()),
        }),
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        const row = state.rows.find(r => r.index === input.rowIndex)
        if (!row) return { isError: true, content: [{ type: 'text' as const, text: 'Row not found' }] }

        row.mapped = { ...row.mapped, ...input.correctedData }

        const validationResult = ItemSchema.safeParse(row.mapped)
        if (validationResult.success) {
          row.mapped = validationResult.data
          row.validationErrors = undefined
          await saveBatchState(state)
          return { content: [{ type: 'text' as const, text: `Row ${input.rowIndex} patched and validated successfully.` }] }
        } else {
          row.validationErrors = validationResult.error.issues
          await saveBatchState(state)
          return { content: [{ type: 'text' as const, text: `Row ${input.rowIndex} patched but still has ${validationResult.error.issues.length} validation error(s). Use get_batch_errors to review.` }] }
        }
      },
    )

    server.registerTool(
      'submit_ready_batch',
      {
        description: 'Submits all successfully validated rows from the KV batch to the physical BPost e-MassPost service via our XML Client.',
        inputSchema: z.object({ batchId: z.string() }),
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        if (state.status === 'SUBMITTED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} has already been submitted.` }] }
        if (state.status !== 'MAPPED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} is not in MAPPED state. Current status: ${state.status}` }] }

        const readyRows = state.rows.filter(r => !r.validationErrors || r.validationErrors.length === 0)
        if (readyRows.length === 0) return { isError: true, content: [{ type: 'text' as const, text: 'No physically ready rows to submit.' }] }

        state.status = 'SUBMITTED'
        await saveBatchState(state)

        return { content: [{ type: 'text' as const, text: `[STUB] ${readyRows.length} rows are ready for submission. BPost XML dispatch is not yet implemented.` }] }
      },
    )

    // ── BPost Core Tools ─────────────────────────────────────────────────

    server.registerTool(
      'bpost_announce_deposit',
      {
        description:
          'Announce a mail deposit to BPost e-MassPost. Accepts a validated DepositRequest payload ' +
          '(Create, Update, Delete, or Validate actions) and returns the BPost response.',
        inputSchema: DepositRequestSchema,
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }

        const credentials = await resolveCredentials(tenantId)
        const client = createBpostClient(credentials)

        const payload = {
          ...input,
          Context: {
            ...input.Context,
            sender: Number(credentials.customerNumber),
          },
          Header: {
            ...input.Header,
            customerId: Number(credentials.customerNumber),
            accountId: Number(credentials.accountId),
            mode: input.Header?.mode ?? 'T',
          },
        }

        const xml = buildXml({ DepositRequest: payload })
        try {
          const result = await client.sendDepositRequest(xml)
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
        } catch (err) {
          if (err instanceof BpostError) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(err.toMcpError(), null, 2) }],
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
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }

        const credentials = await resolveCredentials(tenantId)
        const client = createBpostClient(credentials)

        const payload = {
          ...input,
          Context: {
            ...input.Context,
            sender: Number(credentials.customerNumber),
          },
          Header: {
            ...input.Header,
            customerId: Number(credentials.customerNumber),
            accountId: Number(credentials.accountId),
            mode: input.Header?.mode ?? 'T',
          },
        }

        const xml = buildXml({ MailingRequest: payload })
        try {
          const result = await client.sendMailingRequest(xml)
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
        } catch (err) {
          if (err instanceof BpostError) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(err.toMcpError(), null, 2) }],
              isError: true,
            }
          }
          throw err
        }
      },
    )
  },
  { serverInfo: { name: 'bpost-emasspost', version: '1.0.0' } },
  { basePath: '/api' },
)

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
  requiredScopes: ['mcp:tools'],
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
```

- [ ] **Step 2: Stage route.ts and verify no conflict markers remain**

```bash
grep -c '<<<<<<' src/app/api/mcp/route.ts  # must be 0
git add src/app/api/mcp/route.ts
```

---

## Task 3: Update upload route auth to use OAuth verification

**Files:**
- Modify: `src/app/api/batches/upload/route.ts`

The upload route on main uses `extractBearerToken` + `resolveTenant`. It should use `verifyToken` to stay consistent with the OAuth layer, but since it's a standard Next.js route (not MCP), it can't use `withMcpAuth`. Instead, call `verifyToken` directly.

**Important:** `verifyToken` takes two args: `(req: Request, bearerToken?: string)`. You must pass `req` as the first argument.

- [ ] **Step 1: Update the upload route's auth**

Replace:
```typescript
import { resolveTenant } from "@/lib/tenant/resolve"
import { extractBearerToken } from "@/lib/auth/extract-token"
```

With:
```typescript
import { verifyToken } from "@/lib/oauth/verify-token"
```

Replace the token extraction + tenant resolution block:
```typescript
const token = extractBearerToken(req)
if (!token) { ... }
const tenant = await resolveTenant(token)
if (!tenant) { ... }
const tenantId = tenant.tenantId
```

With:
```typescript
const authHeader = req.headers.get('authorization')
const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
if (!token) {
  return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
}
const authInfo = await verifyToken(req, token)
if (!authInfo?.extra?.tenantId) {
  return NextResponse.json({ error: 'Invalid or revoked token' }, { status: 401 })
}
const tenantId = authInfo.extra.tenantId as string
```

Note: `verifyToken(req, token)` — the first arg is the Request object, the second is the bearer token string.

---

## Task 4: TypeScript check and test run

**Files:**
- All modified files

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

Expected: clean (0 errors)

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests pass. The batch tools don't have dedicated unit tests on main, so no new test failures expected. The existing `tests/app/api/mcp/route.test.ts` covers the auth layer via `withMcpAuth`.

- [ ] **Step 3: Commit the merge**

```bash
git commit -m "merge(main): port batch pipeline tools to mcp-handler + OAuth auth"
```

---

## Task 5: Merge develop into main and push

Since `develop` is a permanent integration branch, use a regular merge (not squash) to preserve ancestry. This keeps future merges clean.

- [ ] **Step 1: Switch to main and merge**

```bash
git checkout main
git merge develop --no-ff -m "merge: develop into main — OAuth 2.0 + batch pipeline on mcp-handler"
```

Expected: clean merge (no conflicts — develop now contains everything from main)

- [ ] **Step 2: Push both branches**

```bash
git push origin main
git checkout develop
git push origin develop
```
