import { describe, it, expect } from 'vitest'
import { getHttpCredentials, getFtpCredentials, MissingCredentialsError } from '@/core/masspost/credentials'

// vitest.config.ts does not set any BPOST_* env vars, so these should fail fast with a
// readable error rather than silently sending undefined credentials to bpost.
describe('credentials (no BPOST_* env vars set)', () => {
  it('getHttpCredentials throws a readable error listing the missing vars', () => {
    expect(() => getHttpCredentials()).toThrow(MissingCredentialsError)
    try {
      getHttpCredentials()
      expect.unreachable()
    } catch (err) {
      expect((err as Error).message).toContain('BPOST_TEST_USERNAME')
    }
  })

  it('getFtpCredentials throws a readable error listing the missing vars', () => {
    expect(() => getFtpCredentials()).toThrow(MissingCredentialsError)
  })
})
