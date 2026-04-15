import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'

export function GET(_request?: Request) {
  void _request
  return Response.json({
    status: 'ok',
    service: MCP_SERVER_DISPLAY_NAME,
    version: APP_VERSION,
  })
}
