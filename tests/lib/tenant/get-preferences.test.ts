import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}))

describe('getTenantPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns stored preferences when row exists', async () => {
    const { db } = await import('@/lib/db/client')
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            barcodeStrategy: 'mcp-generates',
            barcodeLength: '11',
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect

    const { getTenantPreferences } = await import('@/lib/tenant/get-preferences')
    const prefs = await getTenantPreferences('tenant_with_prefs')
    expect(prefs).toEqual({
      barcodeStrategy: 'mcp-generates',
      barcodeLength: '11',
    })
  })

  it('returns defaults when no row exists', async () => {
    const { db } = await import('@/lib/db/client')
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db as any).select = mockSelect

    const { getTenantPreferences } = await import('@/lib/tenant/get-preferences')
    const prefs = await getTenantPreferences('tenant_no_prefs')
    expect(prefs).toEqual({
      barcodeStrategy: 'bpost-generates',
      barcodeLength: '7',
    })
  })
})