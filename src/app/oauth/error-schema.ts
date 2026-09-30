import { z } from 'zod'

/** OAuth error JSON (`error` + `error_description`). */
export const OAuthErrorSchema = z
  .object({
    error: z.string(),
    error_description: z.string(),
  })
  .meta({ id: 'OAuthError' })
