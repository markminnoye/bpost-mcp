import { z } from 'zod'

/**
 * Query of `GET /oauth/authorize`.
 * Describes the handler. Validation stays in the route so redirect and error codes do not change.
 */
export const AuthorizeQuerySchema = z
  .object({
    response_type: z.literal('code'),
    client_id: z.string(),
    redirect_uri: z.string().url(),
    code_challenge: z.string(),
    code_challenge_method: z.literal('S256').optional(),
    scope: z.string().optional(),
    state: z.string().optional(),
    resource: z.string().optional(),
  })
  .meta({ id: 'AuthorizeQuery' })
