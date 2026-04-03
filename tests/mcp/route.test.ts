// tests/mcp/route.test.ts
// NOTE: This test was the Phase 1 smoke test for the bare MCP route.
// Phase 2 introduced bearer-token auth — the route now requires a valid token.
// The authoritative Phase 2 route tests live in tests/app/api/mcp/route.test.ts.
//
// This file is kept to avoid breaking the test runner glob, but all cases are
// now covered by the new test file with proper mocking.

import { describe, it, expect, vi } from 'vitest'

// Mock DB before any route import to avoid DATABASE_URL requirement at module load
vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn().mockResolvedValue({
    tenantId: 'tenant-1',
    bpostUsername: 'testuser',
    bpostPassword: 'testpass',
  }),
}))

import { POST } from '@/app/api/mcp/route'

// Minimal MCP list-tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
}

describe('MCP route (Phase 2 — bearer token required)', () => {
  it('responds to tools/list with the bpost tool names when a valid token is provided', async () => {
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': 'Bearer bpost_test_token',
      },
      body: JSON.stringify(listToolsRequest),
    })
    const res = await POST(req)
    const body = await res.json()

    const toolNames = body.result?.tools?.map((t: { name: string }) => t.name) ?? []
    expect(toolNames).toContain('bpost_announce_deposit')
    expect(toolNames).toContain('bpost_announce_mailing')
  })
})
