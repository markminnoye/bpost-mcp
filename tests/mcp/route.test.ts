// tests/mcp/route.test.ts
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/mcp/route'

// Minimal MCP list-tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
}

describe('MCP route', () => {
  it('responds to tools/list with the bpost tool names', async () => {
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(listToolsRequest),
    })
    const res = await POST(req)
    const body = await res.json()

    const toolNames = body.result?.tools?.map((t: { name: string }) => t.name) ?? []
    expect(toolNames).toContain('bpost_announce_deposit')
    expect(toolNames).toContain('bpost_announce_mailing')
  })
})
