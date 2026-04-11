import { describe, it, expect, vi, beforeEach } from 'vitest'

const { readFile } = vi.hoisted(() => ({
  readFile: vi.fn(),
}))

vi.mock('@/lib/config/env', () => ({
  env: { NEXT_PUBLIC_BASE_URL: 'https://client.example/' },
}))

vi.mock('fs/promises', () => ({
  default: { readFile },
}))

import { getInstallPromptMarkdown } from '@/lib/install/load-install-prompt'

describe('getInstallPromptMarkdown', () => {
  beforeEach(() => {
    readFile.mockReset()
  })

  it('replaces legacy public host with NEXT_PUBLIC_BASE_URL (no trailing slash)', async () => {
    readFile.mockResolvedValue(
      'npx https://bpost-mcp.vercel.app/api/mcp\nhttps://bpost-mcp.vercel.app/dashboard\n',
    )
    const out = await getInstallPromptMarkdown()
    expect(out).toContain('https://client.example/api/mcp')
    expect(out).toContain('https://client.example/dashboard')
    expect(out).not.toContain('bpost-mcp.vercel.app')
  })
})
