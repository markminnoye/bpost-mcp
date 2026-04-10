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
})
