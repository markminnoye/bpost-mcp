import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bpostCredentials } from '@/lib/db/schema';
import { decrypt } from '@/lib/crypto';

export interface BpostCredentials {
  bpostUsername: string;
  bpostPassword: string;
  customerNumber: string;
  accountId: string;
  prsNumber?: string;
  barcodeCustomerId?: string;
}

export async function getCredentialsByTenantId(
  tenantId: string,
): Promise<BpostCredentials | null> {
  const rows = await db
    .select()
    .from(bpostCredentials)
    .where(eq(bpostCredentials.tenantId, tenantId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY is not set');

  const password = decrypt(row.passwordEncrypted, row.passwordIv, encryptionKey);

  return {
    bpostUsername: row.username,
    bpostPassword: password,
    customerNumber: row.customerNumber,
    accountId: row.accountId,
    prsNumber: row.prsNumber ?? undefined,
    barcodeCustomerId: row.barcodeCustomerId ?? undefined,
  };
}
