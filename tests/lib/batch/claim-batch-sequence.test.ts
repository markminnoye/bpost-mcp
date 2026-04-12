import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  db: {
    execute: vi.fn(),
  },
}))

describe('claimBatchSequence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns batch sequence from upsert result', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.execute).mockResolvedValue([{ batch_sequence: 0 }] as any)

    const { claimBatchSequence } = await import('@/lib/batch/claim-batch-sequence')
    const seq = await claimBatchSequence('tenant-123', 15)
    expect(seq).toBe(0)
  })

  it('passes tenantId and weekNumber to SQL', async () => {
    const { db } = await import('@/lib/db/client')
    vi.mocked(db.execute).mockResolvedValue([{ batch_sequence: 5 }] as any)

    const { claimBatchSequence } = await import('@/lib/batch/claim-batch-sequence')
    await claimBatchSequence('tenant-abc', 22)

    expect(db.execute).toHaveBeenCalledOnce()
  })

  it('returns incrementing values on successive calls', async () => {
    const { db } = await import('@/lib/db/client')
    let counter = 0
    vi.mocked(db.execute).mockImplementation(async () => {
      return [{ batch_sequence: counter++ }] as any
    })

    const { claimBatchSequence } = await import('@/lib/batch/claim-batch-sequence')
    expect(await claimBatchSequence('tenant-123', 15)).toBe(0)
    expect(await claimBatchSequence('tenant-123', 15)).toBe(1)
    expect(await claimBatchSequence('tenant-123', 15)).toBe(2)
  })
})