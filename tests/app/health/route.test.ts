import { describe, expect, it } from 'vitest'

import { GET } from '@/app/health/route'
import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'

function buildRequest() {
  return new Request('http://localhost:3000/health', { method: 'GET' })
}

describe('GET /health', () => {
  it('returns operational health payload', async () => {
    const res = await GET(buildRequest())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const payload = await res.json()
    expect(payload).toEqual({
      status: 'ok',
      service: MCP_SERVER_DISPLAY_NAME,
      version: APP_VERSION,
    })
  })
})
