// tests/lib/crypto.test.ts
import { describe, it, expect } from 'vitest'
import { randomBytes } from 'crypto'
import { encrypt, decrypt, hashToken } from '@/lib/crypto'

const TEST_KEY = randomBytes(32).toString('base64')

describe('encrypt / decrypt', () => {
  it('round-trips plaintext correctly', () => {
    const plaintext = 'my-secret-password-123'
    const { ciphertext, iv } = encrypt(plaintext, TEST_KEY)
    expect(decrypt(ciphertext, iv, TEST_KEY)).toBe(plaintext)
  })

  it('produces a different IV on each call', () => {
    const { iv: iv1 } = encrypt('hello', TEST_KEY)
    const { iv: iv2 } = encrypt('hello', TEST_KEY)
    expect(iv1).not.toBe(iv2)
  })

  it('throws when decrypting with wrong key', () => {
    const { ciphertext, iv } = encrypt('secret', TEST_KEY)
    const wrongKey = randomBytes(32).toString('base64')
    expect(() => decrypt(ciphertext, iv, wrongKey)).toThrow()
  })
})

describe('hashToken', () => {
  it('returns a deterministic hex string for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
  })

  it('returns different hashes for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('xyz'))
  })

  it('produces a 64-char hex string (SHA-256)', () => {
    expect(hashToken('token').length).toBe(64)
  })
})
