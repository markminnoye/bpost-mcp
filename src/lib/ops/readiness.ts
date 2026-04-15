import { checkDatabaseConnection } from '@/lib/db/client'
import { env } from '@/lib/config/env'
import { checkRedisConnection } from '@/lib/kv/client'

type DependencyStatus = 'ok' | 'error' | 'skipped'

export type ReadinessResult = {
  allHealthy: boolean
  checks: {
    app: 'ok'
    db: DependencyStatus
    redis: DependencyStatus
  }
  failures: string[]
}

type RunReadinessChecksOptions = {
  timeoutMs?: number
}

function timeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Probe timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    timeoutId.unref?.()
  })
}

async function runProbe(
  name: string,
  probe: () => Promise<void | 'skipped'>,
  timeoutMs: number,
): Promise<[string, DependencyStatus]> {
  try {
    const outcome = await Promise.race([probe(), timeoutPromise(timeoutMs)])
    if (outcome === 'skipped') return [name, 'skipped']
    return [name, 'ok']
  } catch {
    return [name, 'error']
  }
}

export async function runReadinessChecks(options: RunReadinessChecksOptions = {}): Promise<ReadinessResult> {
  const timeoutMs = options.timeoutMs ?? env.READINESS_PROBE_TIMEOUT_MS

  const probeResults = await Promise.all([
    runProbe('db', checkDatabaseConnection, timeoutMs),
    runProbe('redis', checkRedisConnection, timeoutMs),
  ])

  const checks = {
    app: 'ok' as const,
    db: 'error' as DependencyStatus,
    redis: 'error' as DependencyStatus,
  }

  const failures: string[] = []
  for (const [name, status] of probeResults) {
    if (name === 'db') checks.db = status
    if (name === 'redis') checks.redis = status
    if (status === 'error') failures.push(name)
  }

  return {
    allHealthy: failures.length === 0,
    checks,
    failures,
  }
}
