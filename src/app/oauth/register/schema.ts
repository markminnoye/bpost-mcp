import { z } from 'zod';

/**
 * JSON body of `POST /oauth/register`.
 * This is the contract the handler parses; the OpenAPI document is generated from it.
 */
export const RegisterRequestSchema = z
  .object({
    client_name: z.string().optional(),
    redirect_uris: z.array(z.string().url()).min(1),
    grant_types: z.array(z.string()).optional().default(['authorization_code', 'refresh_token']),
    response_types: z.array(z.string()).optional().default(['code']),
  })
  .meta({ id: 'RegisterRequest' });

/** 201 body of `POST /oauth/register`. `client_secret` is returned only here. */
export const RegisterResponseSchema = z
  .object({
    client_id: z.string(),
    client_secret: z.string(),
    client_name: z.string().nullable(),
    redirect_uris: z.array(z.string().url()),
    grant_types: z.array(z.string()),
    response_types: z.array(z.string()),
  })
  .meta({ id: 'RegisterResponse' });
