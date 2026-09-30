import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('MCP legacy rewrite', () => {
  it('rewrites /api/mcp to /mcp before the filesystem', async () => {
    const rewrites = await nextConfig.rewrites?.()
    expect(rewrites).toBeTruthy()
    expect(Array.isArray(rewrites)).toBe(false)
    const beforeFiles = (rewrites as { beforeFiles?: { source: string; destination: string }[] }).beforeFiles
    expect(beforeFiles).toEqual([{ source: '/api/mcp', destination: '/mcp' }])
  })
})