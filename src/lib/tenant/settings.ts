import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bpostCredentials, tenantPreferences, tenants } from '@/lib/db/schema'
import { defaultCodePrefix } from '@/core/masspost/store/mailing'
import type { TenantDefaults } from './settings-schema'

export type { TenantDefaults } from './settings-schema'

/** What Instellingen and step 1 need. The bpost password never leaves the server. */
export interface TenantSettings {
  tenantId: string
  name: string
  defaults: TenantDefaults
  /** The stored prefix, empty when none is set (the form shows the fallback as placeholder). */
  storedCodePrefix: string
  bpost: {
    username: string
    customerNumber: string
    accountId: string
    barcodeCustomerId: string | null
    hasPassword: boolean
  } | null
}

const pick = <T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/**
 * Reads the settings of a tenant.
 * @param tenantId The tenant.
 * @returns The settings, or null when the tenant does not exist.
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) return null
  const [prefs] = await db.select().from(tenantPreferences).where(eq(tenantPreferences.tenantId, tenantId)).limit(1)
  const [creds] = await db.select().from(bpostCredentials).where(eq(bpostCredentials.tenantId, tenantId)).limit(1)
  const stored = prefs?.codePrefix?.trim() ?? ''
  return {
    tenantId,
    name: tenant.name,
    storedCodePrefix: stored,
    defaults: {
      format: pick(prefs?.defaultFormat, ['Small', 'Large'] as const, 'Small'),
      priority: pick(prefs?.defaultPriority, ['NP', 'P'] as const, 'NP'),
      genMID: pick(prefs?.defaultGenMid, ['N', '7', '9', '11'] as const, '7'),
      genPSC: pick(prefs?.defaultPresort, ['Y', 'N'] as const, 'N'),
      codePrefix: stored || defaultCodePrefix(tenant.name),
    },
    bpost: creds
      ? {
          username: creds.username,
          customerNumber: creds.customerNumber,
          accountId: creds.accountId,
          barcodeCustomerId: creds.barcodeCustomerId,
          hasPassword: !!creds.passwordEncrypted,
        }
      : null,
  }
}
