import { describe, expect, it } from 'vitest'
import { getInstallPromptMarkdown } from '@/lib/install/load-install-prompt'

describe('checked-in install prompt', () => {
  it('fills {{BASE_URL}} from NEXT_PUBLIC_BASE_URL and drops stale hosts', async () => {
    const out = await getInstallPromptMarkdown()
    expect(out).toContain('http://localhost:3000/mcp')
    expect(out).not.toContain('http://localhost:3000/api/mcp')
    expect(out).toContain('http://localhost:3000/dashboard')
    expect(out).not.toContain('{{BASE_URL}}')
    expect(out).not.toContain('sonicrocket.io')
    expect(out).not.toContain('sonicrocket.be')
    expect(out).not.toContain('bpost-mcp.vercel.app')
  })
})