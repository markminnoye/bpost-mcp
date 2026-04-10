import { describe, it, expect } from 'vitest'

/** Matches vitest.config.ts test.env NEXT_PUBLIC_BASE_URL */
const BASE = 'http://localhost:3000'
const CANONICAL = `${BASE}/api/mcp`

describe('oauth resource URL helpers', () => {
  it('mcpProtectedResourceUrl appends /api/mcp', async () => {
    const { mcpProtectedResourceUrl } = await import('@/lib/oauth/resource-url')
    expect(mcpProtectedResourceUrl()).toBe(CANONICAL)
  })

  it('normalizes origin and /api/mcp to canonical', async () => {
    const { normalizeOAuthResourceParam } = await import('@/lib/oauth/resource-url')
    expect(normalizeOAuthResourceParam(BASE)).toBe(CANONICAL)
    expect(normalizeOAuthResourceParam(`${BASE}/`)).toBe(CANONICAL)
    expect(normalizeOAuthResourceParam(CANONICAL)).toBe(CANONICAL)
  })

  it('oauthResourcesMatchForToken accepts origin vs mcp URL', async () => {
    const { oauthResourcesMatchForToken } = await import('@/lib/oauth/resource-url')
    expect(oauthResourcesMatchForToken(BASE, CANONICAL)).toBe(true)
  })

  it('oauthResourcesMatchForToken accepts missing token resource when stored is canonical', async () => {
    const { oauthResourcesMatchForToken } = await import('@/lib/oauth/resource-url')
    expect(oauthResourcesMatchForToken(CANONICAL, null)).toBe(true)
  })

  it('oauthResourcesMatchForToken rejects unrelated resource', async () => {
    const { oauthResourcesMatchForToken } = await import('@/lib/oauth/resource-url')
    expect(oauthResourcesMatchForToken('https://other.app', 'https://other.app')).toBe(true)
    expect(oauthResourcesMatchForToken('https://other.app', 'https://example.com/api/mcp')).toBe(
      false,
    )
  })
})
