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
