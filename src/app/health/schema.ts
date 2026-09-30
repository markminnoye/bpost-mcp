import { z } from 'zod'

/** `GET /health` body. */
export const HealthResponseSchema = z
  .object({
    status: z.literal('ok'),
    service: z.string(),
    version: z.string(),
  })
  .meta({ id: 'HealthResponse' })
