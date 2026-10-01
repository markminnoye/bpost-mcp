import { z } from 'zod'

/**
 * `GET /.well-known/oauth-protected-resource` body, as produced by `mcp-handler`.
 * Describes that JSON. The handler is not changed.
 */
export const ProtectedResourceMetadataSchema = z
  .object({
    resource: z.string().url(),
    authorization_servers: z.array(z.string().url()),
  })
  .meta({ id: 'ProtectedResourceMetadata' })
