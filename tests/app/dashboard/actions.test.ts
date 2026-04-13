import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockAuth, mockDbSelect, mockDbDelete } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbDelete: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/db/client', () => ({
  db: {
    select: () => mockDbSelect(),
    delete: () => mockDbDelete(),
  },
}))

import { revokeToken } from '@/app/dashboard/actions'

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const TENANT_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

beforeEach(() => vi.clearAllMocks())

describe('revokeToken', () => {
  it('returns VALIDATION_ERROR for a non-UUID id', async () => {
    const result = await revokeToken('not-a-uuid')
    expect(result).toEqual({ ok: false, code: 'VALIDATION_ERROR', error: 'Ongeldige aanvraag.' })
  })

  it('returns AUTH_ERROR when session is absent', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' })
  })

  it('returns AUTH_ERROR when session has no tenantId', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' })
  })

  it('returns AUTH_ERROR when token is not found', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({ from: () => ({ where: () => ({ limit: () => [] }) }) })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' })
  })

  it('returns AUTH_ERROR when token belongs to a different tenant', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ id: VALID_UUID, tenantId: 'other-tenant' }] }) }),
    })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' })
  })

  it('returns TRANSIENT_ERROR on DB delete failure', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ id: VALID_UUID, tenantId: TENANT_ID }] }) }),
    })
    mockDbDelete.mockReturnValue({ where: () => { throw new Error('db down') } })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: false, code: 'TRANSIENT_ERROR', error: 'App-token verwijderen is mislukt. Probeer opnieuw.' })
  })

  it('returns ok:true with redirect on success', async () => {
    mockAuth.mockResolvedValue({ user: { tenantId: TENANT_ID } })
    mockDbSelect.mockReturnValue({
      from: () => ({ where: () => ({ limit: () => [{ id: VALID_UUID, tenantId: TENANT_ID }] }) }),
    })
    mockDbDelete.mockReturnValue({ where: () => Promise.resolve() })
    const result = await revokeToken(VALID_UUID)
    expect(result).toEqual({ ok: true, redirect: '/dashboard' })
  })
})
