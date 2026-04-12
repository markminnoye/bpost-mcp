import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { tenantPreferences } from '@/lib/db/schema'

export interface TenantPreferences {
  barcodeStrategy: 'bpost-generates' | 'customer-provides' | 'mcp-generates'
  barcodeLength: '7' | '9' | '11'
}

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

  const row = rows[0]
  return {
    barcodeStrategy: row.barcodeStrategy as TenantPreferences['barcodeStrategy'],
    barcodeLength: row.barcodeLength as TenantPreferences['barcodeLength'],
  }
}