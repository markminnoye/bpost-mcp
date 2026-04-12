// tests/app/api/mcp/route.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock verifyToken — withMcpAuth calls this to authenticate requests
vi.mock('@/lib/oauth/verify-token', () => ({
  verifyToken: vi.fn(),
}))

// Mock getCredentialsByTenantId to avoid DB access
vi.mock('@/lib/tenant/get-credentials', () => ({
  getCredentialsByTenantId: vi.fn(),
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
