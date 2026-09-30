import { z } from 'zod'

const dependencyStatus = z.enum(['ok', 'error', 'skipped'])

/** `GET /ready` body. `failures` is present only when status is `not_ready`. */
export const ReadyResponseSchema = z
  .object({
    status: z.enum(['ready', 'not_ready']),
    service: z.string(),
    version: z.string(),
    checks: z.object({
      app: z.literal('ok'),
      db: dependencyStatus,
      redis: dependencyStatus,
    }),
    failures: z.array(z.string()).optional(),
  })
  .meta({ id: 'ReadyResponse' })
