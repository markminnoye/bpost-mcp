import { Redis } from '@upstash/redis'
import type { $ZodIssue } from 'zod/v4/core'

// Automatically initializes using UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// Alternatively, if you manually connect it to a Vercel project, KV_REST_API_URL works via fromEnv().
export const redis = Redis.fromEnv()

export type BatchStatus = 'UNMAPPED' | 'MAPPED' | 'SUBMITTED'

export interface BatchRow {
  index: number
  raw: Record<string, unknown> // The original data exactly as provided in the CSV
  mapped?: Record<string, unknown> // The data transformed into BPost schema shape
  validationErrors?: $ZodIssue[] // Errors from Zod validation (if any)
}

export interface BatchState {
  batchId: string
  tenantId: string // Security isolation: only the owner tenant can access this batch
  status: BatchStatus
  headers: string[] // The raw CSV headers extracted from the file
  rows: BatchRow[]
  createdAt: string
}

// Ensure complete PII protection by enforcing a maximum time-to-live
const BATCH_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Saves or updates a transient batch state in Redis with an enforced 24-hour expiration.
 */
export async function saveBatchState(state: BatchState): Promise<void> {
  const key = `batch:${state.tenantId}:${state.batchId}`
  // set object directly, @upstash/redis auto-serializes to JSON
  await redis.set(key, state, { ex: BATCH_TTL_SECONDS })
}

/**
 * Retrieves a transient batch state, strictly gated by tenantId.
 */
export async function getBatchState(tenantId: string, batchId: string): Promise<BatchState | null> {
  const key = `batch:${tenantId}:${batchId}`
  return await redis.get<BatchState>(key)
}

/**
 * Convenience method to quickly delete a batch once processing is entirely complete,
 * freeing up Redis memory before the 24-hour auto-expiration.
 */
export async function deleteBatchState(tenantId: string, batchId: string): Promise<void> {
  const key = `batch:${tenantId}:${batchId}`
  await redis.del(key)
}
