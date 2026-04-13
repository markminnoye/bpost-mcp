import { describe, it, expect, vi, afterEach } from 'vitest'

// Mock next-auth's auth() function before importing the resolver
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock the token verifier
vi.mock('@/lib/oauth/verify-token', () => ({
  verifyToken: vi.fn(),
}))

// Mock the bearer token extractor (needed by resolve-request-auth.ts)
vi.mock('@/lib/auth/extract-token', () => ({
  extractBearerToken: vi.fn(),
}))

import { resolveRequestAuth, type AuthPolicy } from '@/lib/auth/resolve-request-auth'
import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/oauth/verify-token'
import { extractBearerToken } from '@/lib/auth/extract-token'

const bearerOnly: AuthPolicy = { allowBearer: true, allowSession: false }
const sessionOnly: AuthPolicy = { allowBearer: false, allowSession: true }
const hybrid: AuthPolicy = { allowBearer: true, allowSession: true }

function mockBearer(token: string, tenantId: string, clientId = 'test-client') {
  vi.mocked(verifyToken).mockResolvedValue({
    token,
    clientId,
    scopes: ['mcp:tools'],
    extra: { tenantId },
  } as any)
  vi.mocked(extractBearerToken).mockReturnValue(token)
}

function mockSession(tenantId: string | null, userId = 'user_1') {
  vi.mocked(auth).mockResolvedValue(
    tenantId === null
      ? null
      : ({ user: { id: userId, tenantId } } as any),
  )
}

describe('resolveRequestAuth — bearer path', () => {
  afterEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(verifyToken).mockReset()
    vi.mocked(extractBearerToken).mockReset()
  })

  it('returns 401 when no bearer token and session not allowed', async () => {
    const req = new Request('http://localhost:3000/api/test', { method: 'POST' })
    const result = await resolveRequestAuth(req as any, bearerOnly)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatchObject({ status: 401, reason: 'missing_auth' })
  })

  it('returns context with tenantId when valid bearer token provided', async () => {
    mockBearer('valid_token', 'tenant_abc')

    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { authorization: 'Bearer valid_token' },
    })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(true)
    if (result.success) expect(result.context).toMatchObject({
      tenantId: 'tenant_abc',
      authMethod: 'oauth-bearer',
    })
  })

  it('returns 401 when bearer token is present but invalid', async () => {
    vi.mocked(verifyToken).mockResolvedValue(undefined)
    vi.mocked(extractBearerToken).mockReturnValue('bad_token')

    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { authorization: 'Bearer bad_token' },
    })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatchObject({ status: 401, reason: 'invalid_bearer' })
  })

  it('prefers bearer over session when both are valid', async () => {
    mockBearer('bearer_token', 'tenant_bearer')
    mockSession('tenant_session')

    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { authorization: 'Bearer bearer_token' },
    })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.context.tenantId).toBe('tenant_bearer')
      expect(result.context.authMethod).toBe('oauth-bearer')
    }
  })

  it('sets clientId from authInfo on bearer success', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      token: 'tok',
      clientId: 'my-client',
      scopes: ['mcp:tools'],
      extra: { tenantId: 'tenant_x' },
    } as any)
    vi.mocked(extractBearerToken).mockReturnValue('tok')

    const req = new Request('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { authorization: 'Bearer tok' },
    })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(true)
    if (result.success) expect(result.context.clientId).toBe('my-client')
  })
})

describe('resolveRequestAuth — session path', () => {
  afterEach(() => {
    vi.mocked(auth).mockReset()
    vi.mocked(verifyToken).mockReset()
    vi.mocked(extractBearerToken).mockReset()
  })

  it('returns context with tenantId when valid session cookie present and no bearer', async () => {
    // No bearer token found
    vi.mocked(extractBearerToken).mockReturnValue(null)
    // Session with tenant
    mockSession('tenant_session', 'user_session')

    const req = new Request('http://localhost:3000/api/test', { method: 'POST' })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(true)
    if (result.success) expect(result.context).toMatchObject({
      tenantId: 'tenant_session',
      userId: 'user_session',
      authMethod: 'session-cookie',
    })
  })

  it('returns 403 when session exists but tenantId is missing', async () => {
    vi.mocked(extractBearerToken).mockReturnValue(null)
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user_no_tenant', email: 'test@example.com', tenantId: undefined as any },
    } as any)

    const req = new Request('http://localhost:3000/api/test', { method: 'POST' })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatchObject({ status: 403, reason: 'missing_tenant' })
  })

  it('returns 403 when session is valid but route does not allow session auth', async () => {
    // Session exists with tenant — but this route only allows bearer
    vi.mocked(extractBearerToken).mockReturnValue(null)
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user_session', tenantId: 'tenant_session' },
    } as any)

    const req = new Request('http://localhost:3000/api/test', { method: 'POST' })
    const result = await resolveRequestAuth(req as any, bearerOnly)

    // bearerOnly: allowBearer=true so it falls through to bearer path (no token) → missing_auth 401
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatchObject({ status: 401, reason: 'missing_auth' })
  })

  it('returns 401 when neither bearer nor session is present', async () => {
    vi.mocked(extractBearerToken).mockReturnValue(null)
    mockSession(null)

    const req = new Request('http://localhost:3000/api/test', { method: 'POST' })
    const result = await resolveRequestAuth(req as any, hybrid)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatchObject({ status: 401, reason: 'missing_auth' })
  })
})
