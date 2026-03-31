# Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working BPost e-MassPost MCP server on Next.js/Vercel with Zod-validated schemas and a typed HTTP client.

**Architecture:** Schema-first — Zod schemas derived from XSDs drive the MCP tool input types and the HTTP client request/response types. The MCP route exposes tools that accept validated JSON, serialize to XML, call BPost's HTTPS endpoint, and return structured results or typed errors.

**Tech Stack:** Next.js 15+ (App Router), TypeScript (strict), Zod, `@modelcontextprotocol/sdk`, `fast-xml-parser`, Vitest

---

## Implementation Status (as of 2026-03-31)

| Task | Status | Notes |
|---|---|---|
| 1 — Install skills | ✅ Complete | All 6 skills in `.agent/skills/` |
| 2 — Bootstrap project | ✅ Complete | Next.js 16, Vitest 4, all deps installed |
| 3 — Shared Zod types | ✅ Complete | `src/schemas/common.ts`, 5 tests passing |
| 4 — XML utility | ✅ Complete | `src/lib/xml.ts`, parseTagValue fix applied |
| 5 — DepositRequest schema | 🔲 Pending | |
| 6 — BPost error types | 🔲 Pending | |
| 7 — BPost HTTP client | 🔲 Pending | |
| 8 — MCP route + tools | 🔲 Pending | |
| 9 — MailingRequest schema | 🔲 Pending | **⚠️ See note below before starting** |
| 10 — Smoke test | 🔲 Pending | |

**⚠️ Pre-Task 9 required fix:** `ContextSchema` in `src/schemas/common.ts` uses DepositRequest literals (`dataset: 'M004_MPA'`, `receiver: 'EMP'`, `version: '0100'`). MailingRequest uses different values (`dataset: 'M037_MID'`, `receiver: 'MID'`, `version: '0200'`). Before Task 9, split into `DepositContextSchema` and `MailingContextSchema` (or a discriminated union), and update Task 5 imports accordingly. Source: `DepositRequest.xsd` vs `MailingRequest.xsd` in `resources/`.

---

## Prerequisite: Read First

Before starting any task, read these files to understand the protocol:
- `@docs/internal/e-masspost/skills/e-masspost-protocol/index.md` — navigation map
- `@docs/internal/e-masspost/skills/e-masspost-protocol/schemas/deposit-request.md` — field specs
- `@docs/internal/e-masspost/skills/e-masspost-protocol/errors/deposit-error-codes.md` — MPW error codes
- `@docs/internal/e-masspost/skills/e-masspost-protocol/transport/http-protocol.md` — HTTPS endpoint

XSD source of truth: `docs/internal/e-masspost/skills/e-masspost-protocol/resources/`

Active skills to invoke:
- `@.agent/skills/zod-validation-expert/` — when touching `src/schemas/`
- `@.agent/skills/mcp-builder/` — when touching `src/app/api/mcp/`
- `@.agent/skills/api-design-principles/` — when designing `src/client/`
- `@.agent/skills/error-handling-patterns/` — when mapping MPW/MID codes
- `@.agent/skills/tdd-workflow/` — before writing any implementation code
- `@.agent/skills/typescript-pro/` — for strict typing across all layers

---

## File Map

```
src/
├── app/api/mcp/
│   └── route.ts                  MCP HTTP handler (POST endpoint)
├── schemas/
│   ├── common.ts                 Shared Zod types (BooleanType, Context, etc.)
│   ├── deposit-request.ts        DepositRequest Zod schema
│   ├── deposit-response.ts       DepositResponse Zod schema
│   ├── mailing-request.ts        MailingRequest Zod schema
│   └── mailing-response.ts       MailingResponse Zod schema
├── client/
│   ├── bpost.ts                  BPost HTTP client (serialize → POST → deserialize)
│   └── errors.ts                 MPW-xxxx / MID-xxxx error taxonomy
└── lib/
    └── xml.ts                    fast-xml-parser config (singleton builder/parser)

tests/
├── schemas/
│   ├── common.test.ts
│   ├── deposit-request.test.ts
│   └── mailing-request.test.ts
├── client/
│   ├── bpost.test.ts
│   └── errors.test.ts
└── mcp/
    └── route.test.ts
```

---

## Task 1: Install Missing Skills

**Files:**
- Create: `.agent/skills/zod-validation-expert/SKILL.md`
- Create: `.agent/skills/error-handling-patterns/SKILL.md`
- Create: `.agent/skills/api-design-principles/SKILL.md`
- Create: `.agent/skills/tdd-workflow/SKILL.md`
- Create: `.agent/skills/typescript-pro/SKILL.md`

- [ ] **Step 1: Copy the 5 missing skills from iCloud**

```bash
SKILLS_SRC="/Users/markminnoye/Library/Mobile Documents/com~apple~CloudDocs/AI_tools/skills/antigravity-awesome-skills/skills"
SKILLS_DST=".agent/skills"

for skill in zod-validation-expert error-handling-patterns api-design-principles tdd-workflow typescript-pro; do
  cp -r "$SKILLS_SRC/$skill" "$SKILLS_DST/"
done
```

- [ ] **Step 2: Verify all 6 skills are present**

```bash
ls .agent/skills/
```

Expected output includes: `mcp-builder`, `zod-validation-expert`, `error-handling-patterns`, `api-design-principles`, `tdd-workflow`, `typescript-pro`

- [ ] **Step 3: Commit**

```bash
git add .agent/skills/
git commit -m "chore: install Phase 1 skill stack (zod, tdd, api-design, errors, typescript)"
```

---

## Task 2: Bootstrap Next.js TypeScript Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx` (minimal, required by Next.js)

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --app --no-src-dir --no-tailwind --no-eslint --import-alias "@/*"
```

> Say yes to all prompts. This will create `package.json`, `tsconfig.json`, `next.config.ts`, and `src/app/`.

- [ ] **Step 2: Add project dependencies**

```bash
npm install zod @modelcontextprotocol/sdk fast-xml-parser
npm install -D vitest @vitest/coverage-v8 vite-tsconfig-paths
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify test runner works**

```bash
npm test
```

Expected: `No test files found` (not a failure — vitest exits 0 with no files)

- [ ] **Step 6: Document XML library choice in project-design.md**

Open `docs/internal/project-design.md` and add:

```markdown
## Decision: XML Parsing Library

**Library:** `fast-xml-parser` v4+
**Reason:** Pure TypeScript, no native deps, supports attribute parsing (`ignoreAttributes: false`),
handles ISO-8859-1 encoding used by BPost XSDs, and produces predictable JS objects.
**Used in:** `src/lib/xml.ts` (singleton builder + parser configured for BPost format)
```

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts src/ docs/internal/project-design.md
git commit -m "chore: bootstrap Next.js TypeScript project with Vitest and BPost deps"
```

---

## Task 3: Shared Zod Types

**Files:**
- Create: `src/schemas/common.ts`
- Create: `tests/schemas/common.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/schemas/common.test.ts
import { describe, it, expect } from 'vitest'
import { BooleanTypeSchema, ContextSchema } from '@/schemas/common'

describe('BooleanTypeSchema', () => {
  it('accepts Y', () => expect(BooleanTypeSchema.parse('Y')).toBe('Y'))
  it('accepts N', () => expect(BooleanTypeSchema.parse('N')).toBe('N'))
  it('rejects anything else', () => {
    expect(() => BooleanTypeSchema.parse('yes')).toThrow()
    expect(() => BooleanTypeSchema.parse('')).toThrow()
  })
})

describe('ContextSchema', () => {
  it('parses a valid DepositRequest context', () => {
    const result = ContextSchema.parse({
      requestName: 'DepositRequest',
      dataset: 'M004_MPA',
      sender: 12345678,
      receiver: 'EMP',
      version: '0100',
    })
    expect(result.requestName).toBe('DepositRequest')
    expect(result.sender).toBe(12345678)
  })

  it('rejects wrong requestName', () => {
    expect(() => ContextSchema.parse({
      requestName: 'BadRequest',
      dataset: 'M004_MPA',
      sender: 123,
      receiver: 'EMP',
      version: '0100',
    })).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/schemas/common.test.ts
```

Expected: FAIL — `Cannot find module '@/schemas/common'`

- [ ] **Step 3: Implement shared types**

```typescript
// src/schemas/common.ts
import { z } from 'zod'

/** XSD BooleanType: Y | N */
export const BooleanTypeSchema = z.enum(['Y', 'N'])
export type BooleanType = z.infer<typeof BooleanTypeSchema>

/** XSD Context attributes — fixed values validated at parse time */
export const ContextSchema = z.object({
  requestName: z.enum(['DepositRequest', 'MailingRequest']),
  dataset: z.literal('M004_MPA'),
  sender: z.number().int().positive(),
  receiver: z.literal('EMP'),
  version: z.literal('0100'),
})
export type Context = z.infer<typeof ContextSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/schemas/common.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/schemas/common.ts tests/schemas/common.test.ts
git commit -m "feat: add shared Zod types (BooleanType, Context)"
```

---

## Task 4: XML Utility

**Files:**
- Create: `src/lib/xml.ts`

No separate tests — this is a thin wrapper, tested implicitly through client tests.

- [ ] **Step 1: Implement XML builder/parser singleton**

```typescript
// src/lib/xml.ts
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseAttributeValue: false, // keep strings as-is per BPost spec
}

const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: false,
}

export const xmlParser = new XMLParser(PARSER_OPTIONS)
export const xmlBuilder = new XMLBuilder(BUILDER_OPTIONS)

export function parseXml<T>(xml: string): T {
  return xmlParser.parse(xml) as T
}

export function buildXml(obj: Record<string, unknown>): string {
  return `<?xml version="1.0" encoding="ISO-8859-1"?>\n${xmlBuilder.build(obj)}`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/xml.ts
git commit -m "feat: add fast-xml-parser singleton (buildXml/parseXml)"
```

---

## Task 5: DepositRequest Zod Schema

**Files:**
- Create: `src/schemas/deposit-request.ts`
- Create: `tests/schemas/deposit-request.test.ts`

Reference: `@docs/internal/e-masspost/skills/e-masspost-protocol/schemas/deposit-request.md`
XSD truth: `docs/internal/e-masspost/skills/e-masspost-protocol/resources/DepositRequest.xsd`

- [ ] **Step 1: Write failing tests with minimal fixture**

```typescript
// tests/schemas/deposit-request.test.ts
import { describe, it, expect } from 'vitest'
import { DepositRequestSchema } from '@/schemas/deposit-request'

const validContext = {
  requestName: 'DepositRequest' as const,
  dataset: 'M004_MPA' as const,
  sender: 12345678,
  receiver: 'EMP' as const,
  version: '0100' as const,
}

describe('DepositRequestSchema', () => {
  it('parses a minimal valid DepositRequest envelope', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: {
        Files: {
          RequestProps: { filename: 'test.xml' },
          ResponseProps: { filename: 'test_resp.xml' },
        },
        CustomerRefs: { RequestProps: {}, ResponseProps: {} },
      },
      DepositCreate: [{}], // at least one action required by .refine()
    })
    expect(result.Context.requestName).toBe('DepositRequest')
  })

  it('rejects missing Context', () => {
    expect(() => DepositRequestSchema.parse({ Header: {}, DepositCreate: [] })).toThrow()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test tests/schemas/deposit-request.test.ts
```

Expected: FAIL — `Cannot find module '@/schemas/deposit-request'`

- [ ] **Step 3: Implement schema (start minimal, expand from XSD)**

```typescript
// src/schemas/deposit-request.ts
import { z } from 'zod'
import { ContextSchema } from './common'

// Expand these schemas by reading DepositRequest.xsd field by field.
// This is the minimal envelope — add all child elements per the XSD.
const RequestPropsSchema = z.object({
  filename: z.string().optional(),
}).passthrough()

const ResponsePropsSchema = z.object({
  filename: z.string().optional(),
}).passthrough()

const HeaderSchema = z.object({
  Files: z.object({
    RequestProps: RequestPropsSchema,
    ResponseProps: ResponsePropsSchema,
  }),
  CustomerRefs: z.object({
    RequestProps: RequestPropsSchema,
    ResponseProps: ResponsePropsSchema,
  }).optional(),
})

// Deposit action types — expand with full field specs from deposit-request.md
const DepositCreateSchema = z.object({}).passthrough()
const DepositUpdateSchema = z.object({}).passthrough()
const DepositDeleteSchema = z.object({}).passthrough()
const DepositValidateSchema = z.object({}).passthrough()

export const DepositRequestSchema = z.object({
  Context: ContextSchema,
  Header: HeaderSchema,
  DepositCreate: z.array(DepositCreateSchema).optional(),
  DepositUpdate: z.array(DepositUpdateSchema).optional(),
  DepositDelete: z.array(DepositDeleteSchema).optional(),
  DepositValidate: z.array(DepositValidateSchema).optional(),
}).refine(
  (data) => [data.DepositCreate, data.DepositUpdate, data.DepositDelete, data.DepositValidate]
    .some((arr) => arr !== undefined && arr.length > 0),
  { message: 'At least one deposit action (Create/Update/Delete/Validate) is required' }
)

export type DepositRequest = z.infer<typeof DepositRequestSchema>
```

> **Note:** The `.passthrough()` stubs let tests pass now. Expand each sub-schema by reading the XSD and `deposit-request.md` field-by-field before building real payloads.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/schemas/deposit-request.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/schemas/deposit-request.ts tests/schemas/deposit-request.test.ts
git commit -m "feat: add DepositRequest Zod schema (envelope + action types)"
```

---

## Task 6: BPost Error Types

**Files:**
- Create: `src/client/errors.ts`
- Create: `tests/client/errors.test.ts`

Reference: `@docs/internal/e-masspost/skills/e-masspost-protocol/errors/deposit-error-codes.md`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/client/errors.test.ts
import { describe, it, expect } from 'vitest'
import { parseBpostError, BpostError } from '@/client/errors'

describe('parseBpostError', () => {
  it('parses an MPW error code into a structured error', () => {
    const err = parseBpostError('MPW-4010', 'Invalid sender')
    expect(err).toBeInstanceOf(BpostError)
    expect(err.code).toBe('MPW-4010')
    expect(err.message).toBe('Invalid sender')
    expect(err.isRetryable).toBe(false)
  })

  it('marks network-level errors as retryable', () => {
    const err = parseBpostError('NETWORK_TIMEOUT', 'Request timed out')
    expect(err.isRetryable).toBe(true)
  })

  it('serializes cleanly for MCP tool response', () => {
    const err = parseBpostError('MPW-4010', 'Invalid sender')
    const json = err.toMcpError()
    expect(json).toHaveProperty('code', 'MPW-4010')
    expect(json).toHaveProperty('message')
    expect(json).toHaveProperty('retryable', false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test tests/client/errors.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement error types**

```typescript
// src/client/errors.ts

/** Non-retryable BPost protocol errors (MPW / MID prefix) */
const PROTOCOL_ERROR_PATTERN = /^(MPW|MID)-\d+$/

export class BpostError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly isRetryable: boolean,
  ) {
    super(message)
    this.name = 'BpostError'
  }

  toMcpError() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.isRetryable,
    }
  }
}

export function parseBpostError(code: string, message: string): BpostError {
  const isRetryable = !PROTOCOL_ERROR_PATTERN.test(code)
  return new BpostError(code, message, isRetryable)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/client/errors.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/errors.ts tests/client/errors.test.ts
git commit -m "feat: add BpostError class and parseBpostError with retryable detection"
```

---

## Task 7: BPost HTTP Client

**Files:**
- Create: `src/client/bpost.ts`
- Create: `tests/client/bpost.test.ts`

Reference: `@docs/internal/e-masspost/skills/e-masspost-protocol/transport/http-protocol.md`
Auth: HTTPS to `www.bpost.be/emasspost` with `BPOST_USERNAME` + `BPOST_PASSWORD` env vars.

- [ ] **Step 1: Write failing tests (mock HTTP)**

```typescript
// tests/client/bpost.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const validDepositXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DepositRequest><Context requestName="DepositRequest" dataset="M004_MPA" sender="12345678" receiver="EMP" version="0100"/></DepositRequest>`

describe('BpostClient', () => {
  let client: BpostClient

  beforeEach(() => {
    client = new BpostClient({
      username: 'testuser',
      password: 'testpass',
    })
    vi.clearAllMocks()
  })

  it('sends XML to BPost endpoint and returns parsed response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<DepositResponse><Result code="OK"/></DepositResponse>',
    })

    const result = await client.sendDepositRequest(validDepositXml)
    expect(result).toHaveProperty('DepositResponse')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('bpost.be'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws BpostError on HTTP error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '<Error code="MPW-4010">Invalid sender</Error>',
    })

    await expect(client.sendDepositRequest(validDepositXml))
      .rejects.toBeInstanceOf(BpostError)
  })

  it('throws retryable BpostError on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'))

    const err = await client.sendDepositRequest(validDepositXml).catch(e => e)
    expect(err).toBeInstanceOf(BpostError)
    expect(err.isRetryable).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test tests/client/bpost.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement client**

```typescript
// src/client/bpost.ts
import { parseXml } from '@/lib/xml'
import { parseBpostError, BpostError } from './errors'

const BPOST_ENDPOINT = 'https://www.bpost.be/emasspost'

interface BpostClientConfig {
  username: string
  password: string
  endpoint?: string
}

export class BpostClient {
  private readonly endpoint: string
  private readonly authHeader: string

  constructor(config: BpostClientConfig) {
    this.endpoint = config.endpoint ?? BPOST_ENDPOINT
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
  }

  async sendDepositRequest(xmlPayload: string): Promise<Record<string, unknown>> {
    return this.post(xmlPayload)
  }

  async sendMailingRequest(xmlPayload: string): Promise<Record<string, unknown>> {
    return this.post(xmlPayload)
  }

  private async post(xmlPayload: string): Promise<Record<string, unknown>> {
    let response: Response

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=ISO-8859-1',
          'Authorization': this.authHeader,
        },
        body: xmlPayload,
      })
    } catch (err) {
      throw parseBpostError('NETWORK_TIMEOUT', (err as Error).message)
    }

    const text = await response.text()

    if (!response.ok) {
      // Try to extract BPost error code from XML response body
      const parsed = parseXml<Record<string, unknown>>(text)
      const errorEl = (parsed as Record<string, unknown>)['Error'] as Record<string, unknown> | undefined
      const code = (errorEl?.['@_code'] as string) ?? `HTTP_${response.status}`
      const message = typeof errorEl === 'object'
        ? String((errorEl as Record<string, unknown>)['#text'] ?? 'Unknown error')
        : 'Unknown error'
      throw parseBpostError(code, message)
    }

    return parseXml<Record<string, unknown>>(text)
  }
}

/** Factory: builds BpostClient from environment variables */
export function createBpostClient(): BpostClient {
  const username = process.env.BPOST_USERNAME
  const password = process.env.BPOST_PASSWORD
  if (!username || !password) {
    throw new Error('BPOST_USERNAME and BPOST_PASSWORD must be set in environment')
  }
  return new BpostClient({ username, password })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/client/bpost.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/client/bpost.ts tests/client/bpost.test.ts
git commit -m "feat: add BpostClient with HTTP POST, auth, error parsing, and retry detection"
```

---

## Task 8: MCP Route and Tool Definitions

**Files:**
- Create: `src/app/api/mcp/route.ts`
- Create: `tests/mcp/route.test.ts`

Reference: `@.agent/skills/mcp-builder/SKILL.md`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/mcp/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/mcp/route'

// Minimal MCP list-tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
}

describe('MCP route', () => {
  it('responds to tools/list with the bpost tool names', async () => {
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listToolsRequest),
    })
    const res = await POST(req)
    const body = await res.json()

    const toolNames = body.result?.tools?.map((t: { name: string }) => t.name) ?? []
    expect(toolNames).toContain('bpost_announce_deposit')
    expect(toolNames).toContain('bpost_announce_mailing')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test tests/mcp/route.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement MCP route**

```typescript
// src/app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

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
    const client = createBpostClient()
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
    inputSchema: z.object({}).passthrough(), // replace with MailingRequestSchema in Task 9
  },
  async (_input) => {
    return {
      content: [{ type: 'text', text: 'MailingRequest not yet implemented — see Task 9' }],
      isError: true,
    }
  },
)

export async function POST(req: Request): Promise<Response> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  return transport.handleRequest(req)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/mcp/route.test.ts
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/app/api/mcp/route.ts tests/mcp/route.test.ts
git commit -m "feat: add MCP route with bpost_announce_deposit and bpost_announce_mailing tools"
```

---

## Task 9: MailingRequest Schema (expand stub)

**Files:**
- Create: `src/schemas/mailing-request.ts`
- Create: `tests/schemas/mailing-request.test.ts`
- Modify: `src/app/api/mcp/route.ts:50` — replace `.passthrough()` stub with `MailingRequestSchema`

Reference: `@docs/internal/e-masspost/skills/e-masspost-protocol/schemas/mailing-request.md`
XSD truth: `docs/internal/e-masspost/skills/e-masspost-protocol/resources/MailingRequest.xsd`

Follow the same TDD pattern as Task 5 (write failing test → implement → pass → commit).

- [ ] **Step 1: Write failing tests** (mirror Task 5 pattern for MailingRequest)
- [ ] **Step 2: Run to verify failure**
- [ ] **Step 3: Implement `src/schemas/mailing-request.ts`**
- [ ] **Step 4: Wire into route.ts** — replace the passthrough stub with `MailingRequestSchema`
- [ ] **Step 5: Run full suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/schemas/mailing-request.ts tests/schemas/mailing-request.test.ts src/app/api/mcp/route.ts
git commit -m "feat: add MailingRequest schema and wire into bpost_announce_mailing MCP tool"
```

---

## Task 10: Smoke Test + Deploy Gate

- [ ] **Step 1: Lint and type-check**

```bash
npm run lint
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Local dev server**

```bash
npm run dev
```

Then in another terminal:
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Expected: JSON response containing `bpost_announce_deposit` and `bpost_announce_mailing`

- [ ] **Step 4: Update AGENT.md Active Work status**

Change the status line in `AGENT.md` from:
```
Status: **DRAFT — skills not yet installed.**
```
to:
```
Status: **Complete — Phase 1 deployed.**
```

- [ ] **Step 5: Final commit**

```bash
git add AGENT.md
git commit -m "chore: mark Phase 1 implementation complete"
```

---

## Environment Variables Required

Add to `.env.local` (never commit):
```
BPOST_USERNAME=your_emasspost_login
BPOST_PASSWORD=your_emasspost_password
```

These map to `BPOST_USERNAME` and `BPOST_PASSWORD` read by `createBpostClient()` in `src/client/bpost.ts`.

---

## Definition of Done

Per `AGENT.md`:
1. `npm run lint` — 0 errors on changed files
2. `npx tsc --noEmit` — 0 type errors
3. `npm test` — all tests pass, no skipped suites
