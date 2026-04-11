import { describe, it, expect } from 'vitest'
import { requireTenantId } from '@/lib/mcp/require-tenant'

describe('requireTenantId', () => {
  it('returns tenantId string when authInfo.extra.tenantId is set', () => {
    const extra = { authInfo: { extra: { tenantId: 'tenant_abc' }, token: 'tok', clientId: 'c', scopes: [] } } as any
    const result = requireTenantId(extra)
    expect(result).toBe('tenant_abc')
  })

  it('returns error object when authInfo is undefined', () => {
    const extra = { authInfo: undefined } as any
    const result = requireTenantId(extra)
    expect(typeof result).toBe('object')
    expect((result as any).isError).toBe(true)
    expect((result as any).content[0].text).toContain('Unauthorized')
  })

  it('returns error object when tenantId is missing from extra', () => {
    const extra = { authInfo: { extra: {}, token: 'tok', clientId: 'c', scopes: [] } } as any
    const result = requireTenantId(extra)
    expect(typeof result).toBe('object')
    expect((result as any).isError).toBe(true)
  })

  it('returns tenantId from extra.extra.tenantId (withMcpAuth direct path)', () => {
    const extra = { extra: { tenantId: 'tenant_direct' } }
    expect(requireTenantId(extra)).toBe('tenant_direct')
  })

  it('prefers extra.extra.tenantId over authInfo path when both exist', () => {
    const extra = {
      extra: { tenantId: 'preferred' },
      authInfo: { extra: { tenantId: 'fallback' } },
    }
    expect(requireTenantId(extra)).toBe('preferred')
  })
})
