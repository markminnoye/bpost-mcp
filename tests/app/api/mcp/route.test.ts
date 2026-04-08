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

import { GET, POST, DELETE } from '@/app/api/mcp/route'
import { verifyToken } from '@/lib/oauth/verify-token'
import { getBatchState, saveBatchState } from '@/lib/kv/client'

describe('MCP route auth via withMcpAuth', () => {
  it('exports GET, POST, and DELETE handlers', () => {
    expect(typeof GET).toBe('function')
    expect(typeof POST).toBe('function')
    expect(typeof DELETE).toBe('function')
  })

  it('returns 401 when no Authorization header is provided', async () => {
    vi.mocked(verifyToken).mockResolvedValue(undefined)

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when verifyToken returns undefined', async () => {
    vi.mocked(verifyToken).mockResolvedValue(undefined)

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid_token',
        'Content-Type': 'application/json',
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
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

    const req = new Request('http://localhost/api/mcp', {
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
