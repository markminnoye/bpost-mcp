import { describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('redis', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/config/env', () => ({
  env: {
    REDIS_URL: undefined,
  },
}))

import { checkRedisConnection } from '@/lib/kv/client'

describe('checkRedisConnection', () => {
  it('returns skipped when REDIS_URL is intentionally unset', async () => {
    await expect(checkRedisConnection()).resolves.toBe('skipped')
    expect(createClientMock).not.toHaveBeenCalled()
  })
})
