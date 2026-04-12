import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

/**
 * Atomically claims the next batch sequence number for a tenant + week.
 * Returns the claimed sequence (0-based).
 * One DB write per batch submission.
 */
export async function claimBatchSequence(
  tenantId: string,
  weekNumber: number,
): Promise<number> {
  const result = await db.execute(sql`
    INSERT INTO barcode_sequences (tenant_id, week, next_value)
    VALUES (${tenantId}, ${weekNumber}, 1)
    ON CONFLICT (tenant_id, week)
    DO UPDATE SET next_value = barcode_sequences.next_value + 1
    RETURNING next_value - 1 AS batch_sequence
  `)

  const row = (result as unknown as Array<{ batch_sequence: number }>)[0]
  return row.batch_sequence
}