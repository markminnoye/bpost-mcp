// tests/mcp/route.test.ts
// NOTE: This test was the Phase 1 smoke test for the bare MCP route.
// Phase 2 introduced bearer-token auth via withMcpAuth — the route now requires a valid token.
// The authoritative Phase 2 route tests live in tests/app/api/mcp/route.test.ts.
//
// This file is kept to avoid breaking the test runner glob, but all cases are
// now covered by the new test file with proper mocking.

import { describe, it, expect, vi } from 'vitest'

// Mock verifyToken — withMcpAuth calls this to authenticate requests
vi.mock('@/lib/oauth/verify-token', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    token: 'bpost_test_token',
    clientId: 'api_token',
    scopes: ['mcp:tools'],
    extra: { tenantId: 'tenant-1' },
  }),
}))

// Mock getCredentialsByTenantId to avoid DB access
vi.mock('@/lib/tenant/get-credentials', () => ({
  getCredentialsByTenantId: vi.fn().mockResolvedValue({
    bpostUsername: 'testuser',
    bpostPassword: 'testpass',
    customerNumber: '123456',
    accountId: '789',
  }),
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

// Mock KV client to avoid Redis access
vi.mock('@/lib/kv/client', () => ({
  getBatchState: vi.fn(),
  saveBatchState: vi.fn(),
}))

import { POST } from '@/app/api/mcp/route'

/**
 * Parse an SSE response body to extract JSON-RPC messages.
 * mcp-handler returns responses as Server-Sent Events.
 */
async function parseSseResponse(res: Response): Promise<unknown> {
  const text = await res.text()
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      return JSON.parse(line.slice(6))
    }
  }
  throw new Error(`No data line found in SSE response: ${text}`)
}

// Minimal MCP list-tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
}

describe('MCP route (Phase 2 — withMcpAuth)', () => {
  it('responds to tools/list with the bpost tool names when a valid token is provided', async () => {
    const req = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer bpost_test_token',
      },
      body: JSON.stringify(listToolsRequest),
    })
    const res = await POST(req)
    const body = (await parseSseResponse(res)) as {
      result?: { tools?: { name: string }[] }
    }

    const toolNames = body.result?.tools?.map((t) => t.name) ?? []
    expect(toolNames).toContain('get_service_info')
    expect(toolNames).toContain('bpost_announce_deposit')
    expect(toolNames).toContain('bpost_announce_mailing')
  })
})
