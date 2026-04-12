import { createClient } from 'redis'
import { env } from '@/lib/config/env'
import type { $ZodIssue } from 'zod/v4/core'

type RedisClient = ReturnType<typeof createClient>

/** TCP Redis (Vercel Marketplace "Redis" / redis-fulvous-house sets `REDIS_URL`). */
let redisClient: RedisClient | undefined
let connecting: Promise<RedisClient> | undefined

async function getRedis(): Promise<RedisClient> {
  const url = env.REDIS_URL
  if (!url) {
    throw new Error(
      'REDIS_URL is not set. Link a Redis database in Vercel Storage or set REDIS_URL in .env.local.',
    )
  }

  if (redisClient?.isOpen) return redisClient
  if (connecting) return connecting

  connecting = (async () => {
    const c = createClient({ url })
    c.on('error', (err) => console.error('[Redis]', err))
    await c.connect()
    redisClient = c
    return c
  })()

  try {
    return await connecting
  } finally {
    connecting = undefined
  }
}

export type BatchStatus = 'UNMAPPED' | 'MAPPED' | 'SUBMITTED'

export interface BatchRow {
  index: number
  raw: Record<string, unknown> // The original data exactly as provided in the CSV
  mapped?: Record<string, unknown> // The data transformed into BPost schema shape
  validationErrors?: $ZodIssue[] // Errors from Zod validation (if any)
}

export interface SubmissionRecord {
  mailingRef: string
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
  submittedAt: string
  submittedRowCount: number
  skippedRowCount: number
  userId?: string
  clientId: string
  bpostStatus?: string
  bpostErrors?: Array<{
    seq: number
    code: string
    message: string
  }>
}

export interface BatchState {
  batchId: string
  tenantId: string // Security isolation: only the owner tenant can access this batch
  status: BatchStatus
  headers: string[] // The raw CSV headers extracted from the file
  rows: BatchRow[]
  createdAt: string
  submission?: SubmissionRecord
}

// Ensure complete PII protection by enforcing a maximum time-to-live
const BATCH_TTL_SECONDS = 24 * 60 * 60 // 24 hours

/**
 * Saves or updates a transient batch state in Redis with an enforced 24-hour expiration.
 */
export async function saveBatchState(state: BatchState): Promise<void> {
  const key = `batch:${state.tenantId}:${state.batchId}`
  const redis = await getRedis()
  await redis.set(key, JSON.stringify(state), { EX: BATCH_TTL_SECONDS })
}

/**
 * Retrieves a transient batch state, strictly gated by tenantId.
 */
export async function getBatchState(tenantId: string, batchId: string): Promise<BatchState | null> {
  const key = `batch:${tenantId}:${batchId}`
  const redis = await getRedis()
  const raw = await redis.get(key)
  if (raw == null) return null
  return JSON.parse(raw) as BatchState
}

/**
 * Convenience method to quickly delete a batch once processing is entirely complete,
 * freeing up Redis memory before the 24-hour auto-expiration.
 */
export async function deleteBatchState(tenantId: string, batchId: string): Promise<void> {
  const key = `batch:${tenantId}:${batchId}`
  const redis = await getRedis()
  await redis.del(key)
}
