// tests/lib/tenant/resolve.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { randomBytes } from 'crypto'
import { hashToken, encrypt } from '@/lib/crypto'

// Mock the db module before importing resolve
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}))

import { resolveTenant } from '@/lib/tenant/resolve'
import { db } from '@/lib/db/client'

const ENCRYPTION_KEY = randomBytes(32).toString('base64')
const RAW_TOKEN = 'bpost_test_token_abc123'
const TENANT_ID = 'tenant-uuid-1'
const TOKEN_ID = 'token-uuid-1'

function makeDbChain(result: unknown[]) {
  // Drizzle fluent chain: .select().from().innerJoin().where().where().limit()
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  }
  vi.mocked(db.select).mockReturnValue(chain as never)
  return chain
}

function makeUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue(undefined),
  }
  vi.mocked(db.update).mockReturnValue(chain as never)
  return chain
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.stubEnv('ENCRYPTION_KEY', ENCRYPTION_KEY)
  vi.clearAllMocks()
})

describe('resolveTenant', () => {
  it('returns TenantContext for a valid non-revoked token', async () => {
    const { ciphertext, iv } = encrypt('secret-pass', ENCRYPTION_KEY)
    makeDbChain([
      {
        tenantId: TENANT_ID,
        tokenId: TOKEN_ID,
        username: 'demo-user',
        passwordEncrypted: ciphertext,
        passwordIv: iv,
        prsNumber: null,
      },
    ])
    makeUpdateChain()

    const ctx = await resolveTenant(RAW_TOKEN)

    expect(ctx).not.toBeNull()
    expect(ctx!.tenantId).toBe(TENANT_ID)
    expect(ctx!.bpostUsername).toBe('demo-user')
    expect(ctx!.bpostPassword).toBe('secret-pass')
    expect(ctx!.prsNumber).toBeUndefined()
  })

  it('returns null for an unknown token hash', async () => {
    makeDbChain([])
    // db.update is NOT called when rows is empty — no makeUpdateChain() needed

    const ctx = await resolveTenant('bpost_unknown_token')
    expect(ctx).toBeNull()
    expect(vi.mocked(db.update)).not.toHaveBeenCalled()
  })

  it('returns null when db returns empty (token revoked — filtered by query)', async () => {
    // Revoked tokens are excluded by WHERE revokedAt IS NULL in the query
    // So the db returns an empty array — same as unknown token
    makeDbChain([])

    const ctx = await resolveTenant(RAW_TOKEN)
    expect(ctx).toBeNull()
    expect(vi.mocked(db.update)).not.toHaveBeenCalled()
  })
})
