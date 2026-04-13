import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { tenantPreferences } from '@/lib/db/schema'

export interface TenantPreferences {
  barcodeStrategy: 'bpost-generates' | 'customer-provides' | 'mcp-generates'
  barcodeLength: '7' | '9' | '11'
}

const TenantPreferencesSchema = z.object({
  barcodeStrategy: z.enum(['bpost-generates', 'customer-provides', 'mcp-generates']),
  barcodeLength: z.enum(['7', '9', '11']),
})

const DEFAULTS: TenantPreferences = {
  barcodeStrategy: 'bpost-generates',
  barcodeLength: '7',
}

export async function getTenantPreferences(
  tenantId: string,
): Promise<TenantPreferences> {
  const rows = await db
    .select()
    .from(tenantPreferences)
    .where(eq(tenantPreferences.tenantId, tenantId))
    .limit(1)

  if (rows.length === 0) return DEFAULTS

  const parsed = TenantPreferencesSchema.safeParse(rows[0])
  if (!parsed.success) {
    console.error('[getTenantPreferences] Invalid preferences in DB, using defaults:', parsed.error.issues)
    return DEFAULTS
  }

  return parsed.data
}