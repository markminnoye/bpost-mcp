import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'
import { runReadinessChecks } from '@/lib/ops/readiness'
import { ReadyResponseSchema } from './schema'

export async function GET(_request?: Request) {
  void _request
  const readiness = await runReadinessChecks()
  const statusCode = readiness.allHealthy ? 200 : 503

  return Response.json(
    ReadyResponseSchema.parse({
      status: readiness.allHealthy ? 'ready' : 'not_ready',
      service: MCP_SERVER_DISPLAY_NAME,
      version: APP_VERSION,
      checks: readiness.checks,
      ...(readiness.allHealthy ? {} : { failures: readiness.failures }),
    }),
    { status: statusCode },
  )
}
