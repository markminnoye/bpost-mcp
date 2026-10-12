import { describe, it, expect, vi, beforeEach } from 'vitest'

const { authMock, written } = vi.hoisted(() => ({ authMock: vi.fn(), written: vi.fn() }))

vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    update: () => ({ set: (v: unknown) => ({ where: () => written('tenants', v) }) }),
    insert: () => ({ values: (v: unknown) => ({ onConflictDoUpdate: () => written('insert', v) }) }),
  },
}))

import { saveDefaults, saveOrganisation } from '@/app/(app)/instellingen/actions'

const form = (o: Record<string, string>) => {
  const f = new FormData()
  Object.entries(o).forEach(([k, v]) => f.set(k, v))
  return f
}

describe('instellingen actions', () => {
  beforeEach(() => {
    authMock.mockReset()
    written.mockReset()
  })

  it('refuses without a session', async () => {
    authMock.mockResolvedValue(null)
    expect(await saveOrganisation(null, form({ name: 'X' }))).toEqual({
      ok: false,
      error: 'Je sessie is verlopen. Meld je opnieuw aan.',
    })
    expect(written).not.toHaveBeenCalled()
  })

  it('saves the organisation name', async () => {
    authMock.mockResolvedValue({ user: { tenantId: 't1' } })
    expect(await saveOrganisation(null, form({ name: ' Contrapunt ' }))).toEqual({ ok: true, message: 'Bewaard.' })
    expect(written).toHaveBeenCalledWith('tenants', { name: 'Contrapunt' })
  })

  it('explains a wrong prefix in plain words', async () => {
    authMock.mockResolvedValue({ user: { tenantId: 't1' } })
    const r = await saveDefaults(null, form({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'C P' }))
    expect(r).toEqual({ ok: false, error: 'Het voorvoegsel mag enkel letters en cijfers bevatten, maximaal 8.' })
    expect(written).not.toHaveBeenCalled()
  })

  it('saves the defaults', async () => {
    authMock.mockResolvedValue({ user: { tenantId: 't1' } })
    expect(
      await saveDefaults(null, form({ format: 'Large', priority: 'P', genMID: 'N', genPSC: 'Y', codePrefix: 'cp' })),
    ).toEqual({ ok: true, message: 'Bewaard.' })
    expect(written).toHaveBeenCalledWith(
      'insert',
      expect.objectContaining({ tenantId: 't1', defaultFormat: 'Large', defaultGenMid: 'N', defaultPresort: 'Y', codePrefix: 'CP' }),
    )
  })
})
