// tests/app/api/batches/upload/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/resolve-request-auth', () => ({
  resolveRequestAuth: vi.fn(),
}))

vi.mock('@/lib/kv/client', () => ({
  saveBatchState: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/batches/upload/route'
import { resolveRequestAuth } from '@/lib/auth/resolve-request-auth'

const VALID_CSV = 'name,postalCode\nJan Janssen,2000\nPiet Peeters,9000'

function makeAuthSuccess(tenantId = 'tenant_a') {
  vi.mocked(resolveRequestAuth).mockResolvedValue({
    success: true,
    context: { tenantId, authMethod: 'oauth-bearer' },
  })
}

function makeAuthFailure(reason: string, status: 401 | 403) {
  vi.mocked(resolveRequestAuth).mockResolvedValue({
    success: false,
    error: { status, reason } as any,
  })
}

function makeCsvRequest(csv = VALID_CSV): Request {
  const formData = new FormData()
  formData.append('file', new File([csv], 'test.csv', { type: 'text/csv' }))
  return new Request('http://localhost:3000/api/batches/upload', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/batches/upload — auth gate', () => {
  beforeEach(() => {
    vi.mocked(resolveRequestAuth).mockReset()
  })

  it('returns 401 for missing_auth', async () => {
    makeAuthFailure('missing_auth', 401)
    const res = await POST(makeCsvRequest() as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('Bearer token')
  })

  it('returns 401 for invalid_bearer', async () => {
    makeAuthFailure('invalid_bearer', 401)
    const res = await POST(makeCsvRequest() as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('invalid or expired')
  })

  it('returns 401 for invalid_session', async () => {
    makeAuthFailure('invalid_session', 401)
    const res = await POST(makeCsvRequest() as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toContain('session')
  })

  it('returns 403 for missing_tenant', async () => {
    makeAuthFailure('missing_tenant', 403)
    const res = await POST(makeCsvRequest() as any)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain('tenant')
  })

  it('returns 201 with valid session (no bearer)', async () => {
    vi.mocked(resolveRequestAuth).mockResolvedValue({
      success: true,
      context: { tenantId: 'tenant_session', authMethod: 'session-cookie' },
    })
    const res = await POST(makeCsvRequest() as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.totalRows).toBe(2)
  })

  it('returns 201 with valid bearer token', async () => {
    makeAuthSuccess('tenant_bearer')
    const res = await POST(makeCsvRequest() as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.batchId).toBeTruthy()
    expect(body.totalRows).toBe(2)
  })
})
