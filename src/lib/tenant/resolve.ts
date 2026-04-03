// src/lib/tenant/resolve.ts
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { apiTokens, bpostCredentials } from '@/lib/db/schema'
import { decrypt, hashToken } from '@/lib/crypto'

export interface TenantContext {
  tenantId: string
  bpostUsername: string
  bpostPassword: string
  customerNumber: string
  accountId: string
  prsNumber?: string
}

export async function resolveTenant(bearerToken: string): Promise<TenantContext | null> {
  const hash = hashToken(bearerToken)

  const rows = await db
    .select({
      tenantId: apiTokens.tenantId,
      tokenId: apiTokens.id,
      username: bpostCredentials.username,
      passwordEncrypted: bpostCredentials.passwordEncrypted,
      passwordIv: bpostCredentials.passwordIv,
      customerNumber: bpostCredentials.customerNumber,
      accountId: bpostCredentials.accountId,
      prsNumber: bpostCredentials.prsNumber,
    })
    .from(apiTokens)
    .innerJoin(bpostCredentials, eq(bpostCredentials.tenantId, apiTokens.tenantId))
    .where(and(eq(apiTokens.tokenHash, hash), isNull(apiTokens.revokedAt)))
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  const password = decrypt(row.passwordEncrypted, row.passwordIv, process.env.ENCRYPTION_KEY!)

  // Non-critical: update last_used_at in the background
  db.update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, row.tokenId))
    .execute()
    .catch(() => {})

  return {
    tenantId: row.tenantId,
    bpostUsername: row.username,
    bpostPassword: password,
    customerNumber: row.customerNumber,
    accountId: row.accountId,
    prsNumber: row.prsNumber ?? undefined,
  }
}
