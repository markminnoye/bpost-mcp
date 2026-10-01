import { describe, expect, it } from 'vitest'
import { env } from '@/lib/config/env'
import {
  buildIssuerAllowlist,
  DEFAULT_LEGACY_ISSUER,
  parseAuthAcceptedIssuers,
} from '@/lib/oauth/accepted-issuers'
import { signAccessToken, verifyAccessToken } from '@/lib/oauth/jwt'

const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' }
const APP_ORIGIN = 'https://bpost.sonicrocket.app'

describe('parseAuthAcceptedIssuers', () => {
  it('defaults to the previous production host when unset', () => {
    expect(parseAuthAcceptedIssuers(undefined)).toEqual([DEFAULT_LEGACY_ISSUER])
    expect(env.AUTH_ACCEPTED_ISSUERS).toEqual([DEFAULT_LEGACY_ISSUER])
  })

  it('treats an empty value as no extra issuers', () => {
    expect(parseAuthAcceptedIssuers('')).toEqual([])
    expect(parseAuthAcceptedIssuers('  ')).toEqual([])
  })

  it('normalizes comma-separated origins and drops a trailing slash', () => {
    expect(
      parseAuthAcceptedIssuers(
        ' https://bpost.sonicrocket.io/ , https://preview.bpost.sonicrocket.io ',
      ),
    ).toEqual(['https://bpost.sonicrocket.io', 'https://preview.bpost.sonicrocket.io'])
  })

  it('rejects issuers that are not bare origins', () => {
    expect(() => parseAuthAcceptedIssuers('not-a-url')).toThrow(/invalid URL/)
    expect(() => parseAuthAcceptedIssuers('https://bpost.sonicrocket.io/api/mcp')).toThrow(/without a path/)
  })
})

describe('buildIssuerAllowlist', () => {
  it('rejects a legacy .io token when the extra list is empty', async () => {
    const bases = buildIssuerAllowlist(APP_ORIGIN, APP_ORIGIN, [])
    const token = await signAccessToken(payload, { issuerBaseUrl: DEFAULT_LEGACY_ISSUER })
    await expect(verifyAccessToken(token, bases)).rejects.toThrow()
  })
})
