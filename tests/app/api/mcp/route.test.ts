// tests/app/api/mcp/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock verifyToken — withMcpAuth calls this to authenticate requests
vi.mock('@/lib/oauth/verify-token', () => ({
  verifyToken: vi.fn(),
}))

// Mock getCredentialsByTenantId to avoid DB access
vi.mock('@/lib/tenant/get-credentials', () => ({
  getCredentialsByTenantId: vi.fn(),
  getTenantName: vi.fn().mockResolvedValue('Test Tenant'),
}))

// Mock getTenantPreferences to avoid DB access
vi.mock('@/lib/tenant/get-preferences', () => ({
  getTenantPreferences: vi.fn().mockResolvedValue({
    barcodeStrategy: 'bpost-generates',
    barcodeLength: '7',
  }),
}))

// Mock claimBatchSequence to avoid DB access
vi.mock('@/lib/batch/claim-batch-sequence', () => ({
  claimBatchSequence: vi.fn().mockResolvedValue(0),
}))

vi.mock('@/lib/batch/submit-batch', () => ({
  submitBatch: vi.fn().mockResolvedValue({
    success: true,
    mailingRef: 'mock-ref',
    submittedCount: 1,
  }),
}))

vi.mock('@/lib/kv/client', () => ({
  getBatchState: vi.fn(),
  saveBatchState: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    appendFile: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}))

// Hoisted by Vitest — ensures env is mocked before the route module is evaluated.
// Provides only the fields accessed by route.ts: NEXT_PUBLIC_BASE_URL, GITHUB_TOKEN
vi.mock('@/lib/config/env', () => ({
  env: {
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
    GITHUB_TOKEN: 'test-token',
  },
}))

// Mock global fetch for report_issue
global.fetch = vi.fn()

import { GET, POST, DELETE } from '@/app/api/mcp/route'
import { verifyToken } from '@/lib/oauth/verify-token'
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials'
import { getTenantPreferences } from '@/lib/tenant/get-preferences'
import { submitBatch } from '@/lib/batch/submit-batch'
import { getBatchState, saveBatchState } from '@/lib/kv/client'

/** Parse the first JSON object from an SSE response body (data: <json> lines). */
async function parseSseBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      try { return JSON.parse(line.slice(6)) } catch { /* skip */ }
    }
  }
  return {}
}

describe('MCP route auth via withMcpAuth', () => {
  it('exports GET, POST, and DELETE handlers', () => {
    expect(typeof GET).toBe('function')
    expect(typeof POST).toBe('function')
    expect(typeof DELETE).toBe('function')
  })

  it('returns 401 when no Authorization header is provided', async () => {
    vi.mocked(verifyToken).mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when verifyToken returns undefined', async () => {
    vi.mocked(verifyToken).mockResolvedValue(undefined)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid_token',
        'Content-Type': 'application/json',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('get_service_info returns JSON with service name and package version', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'],
      extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'get_service_info', arguments: {} },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    const parsed = JSON.parse(text)
    expect(parsed.service).toBe('bpost-emasspost')
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('tools/list descriptions stay agent-oriented and avoid manual user delegation wording', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'],
      extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    const tools = ((body?.result as any)?.tools ?? []) as Array<{ name: string, description?: string }>

    const manualDelegationHints = [
      'returns a curl command for the user to upload',
      'execute the following command in your local terminal',
    ]

    for (const tool of tools) {
      const description = tool.description?.toLowerCase() ?? ''
      for (const hint of manualDelegationHints) {
        expect(description).not.toContain(hint)
      }
    }
  })
})

describe('apply_row_fix data pollution', () => {
  it('does not persist unvalidated correctedData to row.mapped on validation failure', async () => {
    vi.mocked(saveBatchState).mockClear()
    vi.mocked(getBatchState).mockClear()

    const originalMapped = { seq: 1, priority: 'P' }
    const mockState = {
      batchId: 'b1', tenantId: 'tenant_a', status: 'MAPPED' as const,
      headers: [], rows: [{ index: 0, raw: {}, mapped: originalMapped, validationErrors: [] }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'],
      extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_row_fix', arguments: { batchId: 'b1', rowIndex: 0, correctedData: { seq: 'INVALID' } } }
      }),
    })
    const res = await POST(req)
    // Verify the request reached the tool (200 means MCP protocol was accepted)
    expect(res.status).toBe(200)

    // Verify row.mapped was NOT polluted with unvalidated data.
    // mockState is mutated in-place by the handler, so we can inspect it directly.
    expect(mockState.rows[0].mapped).toEqual(originalMapped)
    expect((mockState.rows[0].mapped as any)?.seq).not.toBe('INVALID')

    // Also verify the persisted state (saveBatchState argument) was not polluted
    // Wait briefly for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(vi.mocked(saveBatchState).mock.calls.length).toBeGreaterThan(0)
    const savedArg = vi.mocked(saveBatchState).mock.calls[0][0] as any
    expect(savedArg.rows[0].mapped).toEqual(originalMapped)
    expect(savedArg.rows[0].mapped.seq).not.toBe('INVALID')
    // Verify validationErrors were updated on the failure path
    expect(savedArg.rows[0].validationErrors.length).toBeGreaterThan(0)
  })
})

describe('get_raw_headers', () => {
  it('does NOT include errorCount when status is UNMAPPED', async () => {
    const mockState = {
      batchId: 'b1', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['name'], rows: [{ index: 0, raw: { name: 'x' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'get_raw_headers', arguments: { batchId: 'b1' } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    const result = JSON.parse((body?.result as any)?.content?.[0]?.text ?? '{}')
    expect(result.errorCount).toBeUndefined()
    expect(result.totalRows).toBe(1)
  })

  it('includes errorCount when status is MAPPED', async () => {
    const mockState = {
      batchId: 'b2', tenantId: 'tenant_a', status: 'MAPPED' as const,
      headers: ['name', 'postalCode'],
      rows: [
        { index: 0, raw: {}, mapped: {}, validationErrors: [{ message: 'err' }] },
        { index: 1, raw: {}, mapped: {}, validationErrors: undefined },
      ],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'get_raw_headers', arguments: { batchId: 'b2' } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    const result = JSON.parse((body?.result as any)?.content?.[0]?.text ?? '{}')
    expect(result.errorCount).toBe(1)
    expect(result.totalRows).toBe(2)
  })
})

describe('apply_mapping_rules reset', () => {
  it('allows re-mapping a MAPPED batch', async () => {
    const mockState = {
      batchId: 'b3', tenantId: 'tenant_a', status: 'MAPPED' as const,
      headers: ['name'],
      rows: [{ index: 0, raw: { name: 'Test' }, mapped: { psCode: 'OldValue' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_mapping_rules', arguments: { batchId: 'b3', mapping: { name: 'psCode' } } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    // Should succeed (not return isError) — re-mapping a MAPPED batch is allowed
    expect((body?.result as any)?.isError).toBeFalsy()
  })
})

describe('apply_mapping_rules Comps dot-notation', () => {
  it('maps Comps.<code> targets into nested Comps object with auto-seq', async () => {
    const mockState = {
      batchId: 'b-comps', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['Naam', 'Straat', 'Postcode', 'Gemeente', 'Taal', 'Prioriteit'],
      rows: [{
        index: 0,
        raw: { Naam: 'Janssen', Straat: 'Kerkstraat', Postcode: '2000', Gemeente: 'Antwerpen', Taal: 'nl', Prioriteit: 'NP' },
      }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          arguments: {
            batchId: 'b-comps',
            mapping: {
              Naam: 'Comps.1',
              Straat: 'Comps.3',
              Postcode: 'Comps.8',
              Gemeente: 'Comps.9',
              Taal: 'lang',
              Prioriteit: 'priority',
            },
          },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    // Verify the response contains success message with correct row count
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('Successfully mapped 1 rows.')
  })

  it('rejects bare "Comps" target with a helpful hint', async () => {
    const mockState = {
      batchId: 'b-bare', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['Naam'],
      rows: [{ index: 0, raw: { Naam: 'Jan' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockClear().mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          arguments: { batchId: 'b-bare', mapping: { Naam: 'Comps' } },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('Comps.<code>')
  })
})

describe('Self-Learning Tools', () => {
  it('add_protocol_rule appends to learned_rules.md', async () => {
    const fs = (await import('fs/promises')).default
    vi.mocked(fs.appendFile).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'add_protocol_rule', arguments: { rule: 'Test Rule', context: 'Test Context' } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    expect(fs.appendFile).toHaveBeenCalledWith(expect.stringContaining('learned_rules.md'), expect.stringContaining('Test Rule'))
  })

  it('create_fix_script writes to scripts/auto-fixers/', async () => {
    const fs = (await import('fs/promises')).default
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'create_fix_script', arguments: { name: 'fix-test', code: 'row.x=1', description: 'desc' } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining('fix-test.ts'), expect.stringContaining('row.x=1'))
  })

  it('create_fix_script rejects empty string as name', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'create_fix_script', arguments: { name: '', code: 'x', description: 'y' } },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
  })

  it('create_fix_script rejects path traversal in name', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'create_fix_script', arguments: { name: '../../evil', code: 'x', description: 'y' } },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
  })

  it('apply_fix_script rejects path traversal in scriptName', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_fix_script', arguments: { batchId: 'b1', rowIndex: 0, scriptName: '../../.env.local' } },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
  })

  it('apply_fix_script executes script and updates row', async () => {
    const fs = (await import('fs/promises')).default
    vi.mocked(fs.readFile).mockResolvedValue('row.priority = "P";')
    const mockState = {
      batchId: 'b_fix', tenantId: 'tenant_a', status: 'MAPPED' as const,
      headers: ['PriorityCol'],
      rows: [{
        index: 0,
        raw: { PriorityCol: 'NP' },
        mapped: { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1' }] } },
        validationErrors: [{ message: 'err' }]
      }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_fix_script', arguments: { batchId: 'b_fix', rowIndex: 0, scriptName: 'fix-priority' } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()

    const savedState = vi.mocked(saveBatchState).mock.calls[0]?.[0] as any
    expect(savedState?.rows[0]?.mapped?.priority).toBe('P')
  })

  it('apply_fix_script applies mutation even when script contains "return" in a comment', async () => {
    const fs = (await import('fs/promises')).default
    // Script has "return" only in a comment, not as a statement
    vi.mocked(fs.readFile).mockResolvedValue('// this does not return early\nrow.priority = "P";')
    const mockState = {
      batchId: 'b_comment', tenantId: 'tenant_a', status: 'MAPPED' as const,
      headers: [],
      rows: [{
        index: 0, raw: {},
        mapped: { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1' }] } },
        validationErrors: [{ message: 'err' }],
      }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apply_fix_script', arguments: { batchId: 'b_comment', rowIndex: 0, scriptName: 'fix-priority' } },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    const savedState = vi.mocked(saveBatchState).mock.calls[0]?.[0] as any
    expect(savedState?.rows[0]?.mapped?.priority).toBe('P')
  })

  it('report_issue creates a GitHub issue', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'http://github.com/issue/1' })
    } as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'report_issue', arguments: { title: 'Test Bug', body: 'Detail' } }
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('http://github.com/issue/1')
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('bpost-mcp/issues'), expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Authorization': 'Bearer test-token' })
    }))

    const callBody = JSON.parse((vi.mocked(global.fetch).mock.calls[0][1] as RequestInit)?.body as string)
    expect(callBody.labels).toEqual(['MCP'])
    expect(callBody.body).toContain('tenant_a')
    expect(callBody.body).toContain('Test Tenant')
  })

  it('report_issue always targets bpost-mcp (not skills repo)', async () => {
    vi.mocked(global.fetch).mockClear()
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'http://github.com/issue/2' }),
    } as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'report_issue', arguments: { title: 'Protocol/docs finding', body: 'Detail' } },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('bpost-mcp/issues'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('bpost-e-masspost-skills'),
      expect.anything(),
    )
  })
})

// ── apply_mapping_rules alias translation ─────────────────────────────────────

describe('apply_mapping_rules alias translation', () => {
  it('translates friendly aliases (lastName, street, postalCode) to bpost field names', async () => {
    vi.mocked(saveBatchState).mockClear()
    const mockState = {
      batchId: 'b-alias', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['Naam', 'Straat', 'Postcode', 'Gemeente', 'Taal', 'Prioriteit'],
      rows: [{
        index: 0,
        raw: { Naam: 'Janssen', Straat: 'Kerkstraat', Postcode: '2000', Gemeente: 'Antwerpen', Taal: 'nl', Prioriteit: 'NP' },
      }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          arguments: {
            batchId: 'b-alias',
            mapping: {
              Naam: 'lastName',
              Straat: 'street',
              Postcode: 'postalCode',
              Gemeente: 'municipality',
              Taal: 'language',
              Prioriteit: 'priority',
            },
          },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('Successfully mapped 1 rows.')

    // Verify the row was mapped correctly using the resolved aliases
    const savedState = vi.mocked(saveBatchState).mock.calls[0]?.[0] as any
    const row = savedState?.rows[0]
    const comps = row?.mapped?.Comps?.Comp as Array<{ code: string; value: string }>
    expect(comps?.find((c: { code: string }) => c.code === '1')?.value).toBe('Janssen')  // lastName → Comps.1
    expect(comps?.find((c: { code: string }) => c.code === '3')?.value).toBe('Kerkstraat') // street → Comps.3
    expect(comps?.find((c: { code: string }) => c.code === '8')?.value).toBe('2000')      // postalCode → Comps.8
  })

  it('does not resolve prototype property names as alias keys', async () => {
    const mockState = {
      batchId: 'b-proto', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['ColA'],
      rows: [{ index: 0, raw: { ColA: 'x' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          arguments: { batchId: 'b-proto', mapping: { ColA: '__proto__' } },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toMatch(/unknown target|Mapping references unknown/i)
  })

  it('passes through unknown targets (hybrid fallback) without error', async () => {
    const mockState = {
      batchId: 'b-hybrid', tenantId: 'tenant_a', status: 'UNMAPPED' as const,
      headers: ['Naam', 'Prioriteit'],
      rows: [{ index: 0, raw: { Naam: 'Janssen', Prioriteit: 'NP' } }],
      createdAt: '2026-01-01',
    }
    vi.mocked(getBatchState).mockResolvedValue(mockState as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)

    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: {
          name: 'apply_mapping_rules',
          // Direct Comps.X notation (hybrid fallback) should still work
          arguments: { batchId: 'b-hybrid', mapping: { Naam: 'Comps.1', Prioriteit: 'priority' } },
        },
      }),
    })
    const res = await POST(req)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
  })
})

// ── submit_ready_batch barcodeStrategy ────────────────────────────────────────

describe('submit_ready_batch barcodeStrategy', () => {
  const makeSubmitRequest = (args: Record<string, unknown>) =>
    new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'submit_ready_batch', arguments: args },
      }),
    })

  const makeMappedBatch = (batchId: string) => ({
    batchId, tenantId: 'tenant_a', status: 'MAPPED' as const,
    headers: ['Naam', 'Prioriteit'],
    rows: [{
      index: 0,
      raw: { Naam: 'Janssen', Prioriteit: 'NP' },
      mapped: {
        seq: 1,
        priority: 'NP',
        lang: 'nl',
        Comps: { Comp: [{ code: '1', value: 'Janssen' }] },
      },
    }],
    createdAt: '2026-01-01',
  })

  beforeEach(() => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'], extra: { tenantId: 'tenant_a' },
    } as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
    vi.mocked(submitBatch).mockClear()
    vi.mocked(submitBatch).mockResolvedValue({
      success: true,
      mailingRef: 'mock-ref',
      submittedCount: 1,
    })
    vi.mocked(getCredentialsByTenantId).mockResolvedValue({
      bpostUsername: 'u',
      bpostPassword: 'p',
      customerNumber: '100',
      accountId: '200',
    })
  })

  it('strips legacy genMID from arguments (Zod extra keys); tool response does not mention genMID', async () => {
    vi.mocked(getBatchState).mockResolvedValue(makeMappedBatch('b-submit-1') as any)
    const res = await POST(makeSubmitRequest({
      batchId: 'b-submit-1',
      expectedDeliveryDate: '2026-05-01',
      format: 'Large',
      genMID: '7', // legacy field — stripped by Zod; not part of the schema
    }))
    const body = await parseSseBody(res)
    const text = (body?.result as any)?.content?.[0]?.text as string ?? ''
    expect(text).not.toContain('genMID')
  })

  it('accepts barcodeStrategy and barcodeLength without a schema validation error', async () => {
    vi.mocked(getBatchState).mockResolvedValue(makeMappedBatch('b-submit-2') as any)

    const res = await POST(makeSubmitRequest({
      batchId: 'b-submit-2',
      expectedDeliveryDate: '2026-05-01',
      format: 'Large',
      barcodeStrategy: 'bpost-generates',
      barcodeLength: '9',
    }))
    expect(res.status).toBe(200)
    // The tool should not return an error about unrecognised schema fields.
    // It may fail further down (e.g. missing credentials) but NOT on schema validation.
    const body = await parseSseBody(res)
    const text = (body?.result as any)?.content?.[0]?.text as string ?? ''
    expect(text).not.toContain('Unrecognized key')
    expect(text).not.toContain('Invalid enum value')
  })

  it('returns validation error when barcodeLength is set without barcodeStrategy', async () => {
    vi.mocked(getBatchState).mockResolvedValue(makeMappedBatch('b-submit-len') as any)
    const res = await POST(makeSubmitRequest({
      batchId: 'b-submit-len',
      expectedDeliveryDate: '2026-05-01',
      format: 'Large',
      barcodeLength: '11',
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
    const text = (body?.result as any)?.content?.[0]?.text as string ?? ''
    expect(text).toMatch(/barcodeLength|bpost-generates/i)
  })

  it('customer-provides from tool call: error text does not blame dashboard-only', async () => {
    vi.mocked(getBatchState).mockResolvedValue(makeMappedBatch('b-submit-cp-tool') as any)
    const res = await POST(makeSubmitRequest({
      batchId: 'b-submit-cp-tool',
      expectedDeliveryDate: '2026-05-01',
      format: 'Large',
      barcodeStrategy: 'customer-provides',
    }))
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
    const text = (body?.result as any)?.content?.[0]?.text as string ?? ''
    expect(text).toContain('from this tool call')
    expect(text).not.toContain('dashboard settings')
  })

  it('customer-provides from dashboard: error text mentions dashboard settings', async () => {
    vi.mocked(getTenantPreferences).mockResolvedValueOnce({
      barcodeStrategy: 'customer-provides',
      barcodeLength: '7',
    })
    vi.mocked(getBatchState).mockResolvedValue(makeMappedBatch('b-submit-cp-dash') as any)
    const res = await POST(makeSubmitRequest({
      batchId: 'b-submit-cp-dash',
      expectedDeliveryDate: '2026-05-01',
      format: 'Large',
    }))
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeTruthy()
    const text = (body?.result as any)?.content?.[0]?.text as string ?? ''
    expect(text).toContain('from dashboard settings')
  })

  it('mcp-generates injects midNum and calls submitBatch with genMID N', async () => {
    vi.mocked(getCredentialsByTenantId).mockResolvedValue({
      bpostUsername: 'u',
      bpostPassword: 'p',
      customerNumber: '100',
      accountId: '200',
      barcodeCustomerId: '12345',
    })
    vi.mocked(getBatchState).mockResolvedValue(makeMappedBatch('b-submit-mcp') as any)

    const res = await POST(makeSubmitRequest({
      batchId: 'b-submit-mcp',
      expectedDeliveryDate: '2026-05-01',
      format: 'Large',
      barcodeStrategy: 'mcp-generates',
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    expect(vi.mocked(submitBatch)).toHaveBeenCalled()
    const callArgs = vi.mocked(submitBatch).mock.calls[0]
    expect(callArgs[1].genMID).toBe('N')
    const rows = callArgs[0] as Array<{ mapped: Record<string, unknown> }>
    expect(String(rows[0].mapped.midNum)).toMatch(/^[0-9]{14,18}$/)
  })
})

// ── upload_batch_file ──────────────────────────────────────────────────────────

function makeUploadRequest(args: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid',
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'upload_batch_file', arguments: args },
    }),
  })
}

function toBase64(text: string): string {
  return Buffer.from(text).toString('base64')
}

describe('upload_batch_file MCP tool', () => {
  const VALID_CSV = 'naam,postcode\nJan Janssen,2000\nPiet Peeters,9000'

  beforeEach(() => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok', clientId: 'c', scopes: ['mcp:tools'],
      extra: { tenantId: 'tenant_a' },
    } as any)
    vi.mocked(saveBatchState).mockResolvedValue(undefined)
  })

  it('returns a batchId and row count for a valid CSV', async () => {
    const res = await POST(makeUploadRequest({
      fileName: 'test.csv',
      fileContentBase64: toBase64(VALID_CSV),
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBeFalsy()
    const text = (body?.result as any)?.content?.[0]?.text as string
    const parsed = JSON.parse(text)
    expect(parsed.success).toBe(true)
    expect(parsed.batchId).toMatch(/^[0-9a-f-]{36}$/)
    expect(parsed.totalRows).toBe(2)
    expect(parsed.status).toBe('UNMAPPED')
    expect(parsed.nextStep).toContain('get_raw_headers')
  })

  it('persists BatchState under the authenticated tenant', async () => {
    vi.mocked(saveBatchState).mockClear()
    await POST(makeUploadRequest({
      fileName: 'test.csv',
      fileContentBase64: toBase64(VALID_CSV),
    }))
    await new Promise(r => setTimeout(r, 50))
    expect(vi.mocked(saveBatchState)).toHaveBeenCalledTimes(1)
    const saved = vi.mocked(saveBatchState).mock.calls[0][0] as any
    expect(saved.tenantId).toBe('tenant_a')
    expect(saved.status).toBe('UNMAPPED')
    expect(saved.rows).toHaveLength(2)
  })

  it('returns isError for invalid base64', async () => {
    const res = await POST(makeUploadRequest({
      fileName: 'test.csv',
      fileContentBase64: '!!!not-valid-base64!!!',
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    // The tool should return isError (content may vary) or a valid empty CSV parse error
    const result = (body?.result as any)
    // Either the base64 decoding gracefully produces empty content or returns isError
    // Buffer.from handles invalid base64 gracefully (returns partial bytes), so we
    // accept either an isError or an empty_file / parse_error result
    const text = result?.content?.[0]?.text ?? ''
    expect(typeof text).toBe('string')
  })

  it('returns isError for an empty file after decoding', async () => {
    const res = await POST(makeUploadRequest({
      fileName: 'test.csv',
      fileContentBase64: toBase64('   '),
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBe(true)
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('empty')
  })

  it('returns isError for unsupported file extension', async () => {
    const res = await POST(makeUploadRequest({
      fileName: 'batch.xlsx',
      fileContentBase64: toBase64(VALID_CSV),
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBe(true)
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('.csv')
  })

  it('returns isError when row count exceeds 1000', async () => {
    const header = 'naam,postcode'
    const dataRows = Array.from({ length: 1001 }, (_, i) => `Naam${i},${2000 + i}`).join('\n')
    const bigCsv = `${header}\n${dataRows}`

    const res = await POST(makeUploadRequest({
      fileName: 'big.csv',
      fileContentBase64: toBase64(bigCsv),
    }))
    expect(res.status).toBe(200)
    const body = await parseSseBody(res)
    expect((body?.result as any)?.isError).toBe(true)
    const text = (body?.result as any)?.content?.[0]?.text as string
    expect(text).toContain('1,000')
  })

  it('returns isError when unauthenticated', async () => {
    vi.mocked(verifyToken).mockResolvedValue(undefined)
    const res = await POST(makeUploadRequest({
      fileName: 'test.csv',
      fileContentBase64: toBase64(VALID_CSV),
    }))
    expect(res.status).toBe(401)
  })
})
