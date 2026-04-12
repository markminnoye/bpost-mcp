import { describe, it, expect } from 'vitest'
import { MCP_SERVER_INSTRUCTIONS } from '@/lib/mcp/server-instructions'

describe('MCP_SERVER_INSTRUCTIONS', () => {
  it('is non-empty and mentions Flemish end-user guidance', () => {
    expect(MCP_SERVER_INSTRUCTIONS.length).toBeGreaterThan(200)
    expect(MCP_SERVER_INSTRUCTIONS).toMatch(/Flemish|Belgian Dutch/i)
    expect(MCP_SERVER_INSTRUCTIONS).toMatch(/bpost|BPost/i)
    expect(MCP_SERVER_INSTRUCTIONS).toMatch(/alpha|alfa/i)
    expect(MCP_SERVER_INSTRUCTIONS).toMatch(/test mode|mode/i)
  })
})
