import { z } from 'zod';

/**
 * JSON body of `POST /oauth/register`.
 * This is the contract the handler parses; the OpenAPI document is generated from it.
 */
export const RegisterRequestSchema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  grant_types: z.array(z.string()).optional().default(['authorization_code', 'refresh_token']),
  response_types: z.array(z.string()).optional().default(['code']),
});
