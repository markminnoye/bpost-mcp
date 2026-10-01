import { z } from 'zod'

/** `GET /.well-known/oauth-authorization-server` body. */
export const AuthorizationServerMetadataSchema = z
  .object({
    issuer: z.string().url(),
    authorization_endpoint: z.string().url(),
    token_endpoint: z.string().url(),
    registration_endpoint: z.string().url(),
    response_types_supported: z.array(z.literal('code')),
    grant_types_supported: z.array(z.enum(['authorization_code', 'refresh_token'])),
    code_challenge_methods_supported: z.array(z.literal('S256')),
    token_endpoint_auth_methods_supported: z.array(z.enum(['client_secret_post', 'none'])),
    scopes_supported: z.array(z.literal('mcp:tools')),
    client_id_metadata_document_supported: z.literal(true),
  })
  .meta({ id: 'AuthorizationServerMetadata' })
