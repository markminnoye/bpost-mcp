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

import { GET, POST, DELETE } from '@/app/api/mcp/route'
import { verifyToken } from '@/lib/oauth/verify-token'

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
