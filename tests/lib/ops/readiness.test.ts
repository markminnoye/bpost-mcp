import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db/client', () => ({
  checkDatabaseConnection: vi.fn(),
}))

vi.mock('@/lib/kv/client', () => ({
  checkRedisConnection: vi.fn(),
}))

import { checkDatabaseConnection } from '@/lib/db/client'
import { checkRedisConnection } from '@/lib/kv/client'
import { runReadinessChecks } from '@/lib/ops/readiness'

const checkDbMock = vi.mocked(checkDatabaseConnection)
const checkRedisMock = vi.mocked(checkRedisConnection)

describe('runReadinessChecks', () => {
  beforeEach(() => {
    checkDbMock.mockReset()
    checkRedisMock.mockReset()
  })

  it('marks service ready when all dependency checks pass', async () => {
    checkDbMock.mockResolvedValue(undefined)
    checkRedisMock.mockResolvedValue(undefined)

    const result = await runReadinessChecks({ timeoutMs: 25 })

    expect(result).toEqual({
      allHealthy: true,
      checks: {
        app: 'ok',
        db: 'ok',
        redis: 'ok',
      },
      failures: [],
    })
  })

  it('marks dependency as failed when a probe throws', async () => {
    checkDbMock.mockRejectedValue(new Error('db offline'))
    checkRedisMock.mockResolvedValue(undefined)

    const result = await runReadinessChecks({ timeoutMs: 25 })

    expect(result).toEqual({
      allHealthy: false,
      checks: {
        app: 'ok',
        db: 'error',
        redis: 'ok',
      },
      failures: ['db'],
    })
  })

  it('marks dependency as failed when a probe times out', async () => {
    checkDbMock.mockImplementation(
      () =>
        new Promise<void>(() => {
          // Intentionally never resolves to simulate a hanging dependency.
        }),
    )
    checkRedisMock.mockResolvedValue(undefined)

    const result = await runReadinessChecks({ timeoutMs: 15 })

    expect(result).toEqual({
      allHealthy: false,
      checks: {
        app: 'ok',
        db: 'error',
        redis: 'ok',
      },
      failures: ['db'],
    })
  })

  it('marks redis as skipped when not configured', async () => {
    checkDbMock.mockResolvedValue(undefined)
    checkRedisMock.mockResolvedValue('skipped')

    const result = await runReadinessChecks({ timeoutMs: 25 })

    expect(result).toEqual({
      allHealthy: true,
      checks: {
        app: 'ok',
        db: 'ok',
        redis: 'skipped',
      },
      failures: [],
    })
  })
})
