import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_LEGACY_ISSUER } from '@/lib/oauth/accepted-issuers'

vi.mock('@/lib/config/env', () => ({
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://bpost.sonicrocket.app',
    AUTH_ACCEPTED_ISSUERS: ['https://bpost.sonicrocket.io'],
  },
}))

vi.mock('@/lib/tenant/resolve', () => ({
  resolveTenant: vi.fn(),
}))

import { signAccessToken } from '@/lib/oauth/jwt'
import { verifyToken } from '@/lib/oauth/verify-token'

const APP_ORIGIN = 'https://bpost.sonicrocket.app'
const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' }

function requestOn(origin: string): Request {
  const url = new URL(origin)
  return new Request(`${origin}/api/mcp`, {
    headers: {
      'x-forwarded-host': url.host,
      'x-forwarded-proto': url.protocol.replace(':', ''),
    },
  })
}

describe('legacy issuer allowlist', () => {
  it('accepts an access token issued on the .app base URL', async () => {
    const token = await signAccessToken(payload, { issuerBaseUrl: APP_ORIGIN })
    const result = await verifyToken(requestOn(APP_ORIGIN), token)
    expect(result?.extra?.tenantId).toBe('tenant_456')
    expect(result?.extra?.userId).toBe('user_123')
  })

  it('accepts an access token issued on .io via the legacy allowlist', async () => {
    const token = await signAccessToken(payload, { issuerBaseUrl: DEFAULT_LEGACY_ISSUER })
    const result = await verifyToken(requestOn(APP_ORIGIN), token)
    expect(result?.extra?.tenantId).toBe('tenant_456')
    expect(result?.scopes).toEqual(['mcp:tools'])
  })

  it('rejects an access token from an unrelated issuer', async () => {
    const token = await signAccessToken(payload, { issuerBaseUrl: 'https://unrelated.example' })
    const result = await verifyToken(requestOn(APP_ORIGIN), token)
    expect(result).toBeUndefined()
  })
})
