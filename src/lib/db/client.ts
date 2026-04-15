// src/lib/db/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.BPOST_DB_DATABASE_URL || process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema })

/** Lightweight readiness probe for Neon connectivity. */
export async function checkDatabaseConnection(): Promise<void> {
  await sql`SELECT 1`
}
