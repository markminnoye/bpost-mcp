import { z } from 'zod'

/**
 * Form body of `POST /oauth/token` (`application/x-www-form-urlencoded`).
 * Describes the handler. The route still reads `URLSearchParams` itself.
 */
export const TokenRequestSchema = z
  .discriminatedUnion('grant_type', [
    z.object({
      grant_type: z.literal('authorization_code'),
      code: z.string(),
      redirect_uri: z.string(),
      client_id: z.string(),
      code_verifier: z.string(),
      resource: z.string().optional(),
    }),
    z.object({
      grant_type: z.literal('refresh_token'),
      refresh_token: z.string(),
      client_id: z.string(),
    }),
  ])
  .meta({ id: 'TokenRequest' })

/** 200 body for both supported grant types. */
export const TokenResponseSchema = z
  .object({
    access_token: z.string(),
    token_type: z.literal('Bearer'),
    expires_in: z.literal(3600),
    refresh_token: z.string(),
  })
  .meta({ id: 'TokenResponse' })
