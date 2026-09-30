import { describe, expect, it } from 'vitest'
import { GET } from '@/app/.well-known/oauth-protected-resource/route'

describe('OAuth protected resource metadata', () => {
  it('advertises /mcp as the resource, not the legacy /api/mcp path', async () => {
    const res = await GET(new Request('http://localhost:3000/.well-known/oauth-protected-resource'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { resource: string; authorization_servers: string[] }
    expect(body.resource).toBe('http://localhost:3000/mcp')
    expect(body.resource.endsWith('/api/mcp')).toBe(false)
    expect(body.authorization_servers).toEqual(['http://localhost:3000'])
  })
})
