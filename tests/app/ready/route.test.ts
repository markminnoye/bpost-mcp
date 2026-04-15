import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/ops/readiness', () => ({
  runReadinessChecks: vi.fn(),
}))

import { GET } from '@/app/ready/route'
import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'
import { runReadinessChecks } from '@/lib/ops/readiness'

const readinessChecksMock = vi.mocked(runReadinessChecks)

function buildRequest() {
  return new Request('http://localhost:3000/ready', { method: 'GET' })
}

describe('GET /ready', () => {
  beforeEach(() => {
    readinessChecksMock.mockReset()
  })

  it('returns readiness payload', async () => {
    readinessChecksMock.mockResolvedValue({
      allHealthy: true,
      checks: {
        app: 'ok',
        db: 'ok',
        redis: 'ok',
      },
      failures: [],
    })

    const res = await GET(buildRequest())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const payload = await res.json()
    expect(payload).toEqual({
      status: 'ready',
      service: MCP_SERVER_DISPLAY_NAME,
      version: APP_VERSION,
      checks: {
        app: 'ok',
        db: 'ok',
        redis: 'ok',
      },
    })
  })

  it('returns 503 when a dependency check fails', async () => {
    readinessChecksMock.mockResolvedValue({
      allHealthy: false,
      checks: {
        app: 'ok',
        db: 'error',
        redis: 'ok',
      },
      failures: ['db'],
    })

    const res = await GET(buildRequest())
    expect(res.status).toBe(503)

    const payload = await res.json()
    expect(payload).toEqual({
      status: 'not_ready',
      service: MCP_SERVER_DISPLAY_NAME,
      version: APP_VERSION,
      checks: {
        app: 'ok',
        db: 'error',
        redis: 'ok',
      },
      failures: ['db'],
    })
  })

  it('surfaces skipped redis probe without failing readiness', async () => {
    readinessChecksMock.mockResolvedValue({
      allHealthy: true,
      checks: {
        app: 'ok',
        db: 'ok',
        redis: 'skipped',
      },
      failures: [],
    })

    const res = await GET(buildRequest())
    expect(res.status).toBe(200)

    const payload = await res.json()
    expect(payload).toEqual({
      status: 'ready',
      service: MCP_SERVER_DISPLAY_NAME,
      version: APP_VERSION,
      checks: {
        app: 'ok',
        db: 'ok',
        redis: 'skipped',
      },
    })
  })
})
