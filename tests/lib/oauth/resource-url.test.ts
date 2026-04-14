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

  it('oauthResourceMatchesAuthCodeAtTokenEndpoint: token host differs from canonical env but stored resource matches env', async () => {
    const {
      oauthResourceMatchesAuthCodeAtTokenEndpoint,
      oauthResourcesMatchForTokenFromBase,
    } = await import('@/lib/oauth/resource-url')
    const stored = `${BASE}/api/mcp`
    const tokenRequestBase = 'https://bpost-abc123-preview.vercel.app'
    expect(oauthResourcesMatchForTokenFromBase(tokenRequestBase, stored, null)).toBe(false)
    expect(oauthResourceMatchesAuthCodeAtTokenEndpoint(tokenRequestBase, stored, null)).toBe(true)
  })

  it('oauthResourceMatchesAuthCodeAtTokenEndpoint rejects unrelated stored resource', async () => {
    const { oauthResourceMatchesAuthCodeAtTokenEndpoint } = await import('@/lib/oauth/resource-url')
    expect(
      oauthResourceMatchesAuthCodeAtTokenEndpoint(
        'https://bpost-xyz.vercel.app',
        'https://attacker.example/api/mcp',
        null,
      ),
    ).toBe(false)
  })
})
