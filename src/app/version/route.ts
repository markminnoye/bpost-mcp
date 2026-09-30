import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'
import { VersionResponseSchema } from './schema'

export function GET(_request?: Request) {
  void _request
  return Response.json(
    VersionResponseSchema.parse({
      service: MCP_SERVER_DISPLAY_NAME,
      version: APP_VERSION,
    }),
  )
}
