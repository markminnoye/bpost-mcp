import { z } from 'zod'

/** `GET /version` body. */
export const VersionResponseSchema = z
  .object({
    service: z.string(),
    version: z.string(),
  })
  .meta({ id: 'VersionResponse' })
