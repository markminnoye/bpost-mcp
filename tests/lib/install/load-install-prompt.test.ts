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

  it('replaces {{BASE_URL}} with NEXT_PUBLIC_BASE_URL (no trailing slash)', async () => {
    readFile.mockResolvedValue(
      'npx {{BASE_URL}}/api/mcp\n{{BASE_URL}}/dashboard\n',
    )
    const out = await getInstallPromptMarkdown()
    expect(out).toContain('https://client.example/api/mcp')
    expect(out).toContain('https://client.example/dashboard')
    expect(out).not.toContain('{{BASE_URL}}')
  })

  it('still rewrites the older vercel.app placeholder', async () => {
    readFile.mockResolvedValue('https://bpost-mcp.vercel.app/api/mcp\n')
    const out = await getInstallPromptMarkdown()
    expect(out).toBe('https://client.example/api/mcp\n')
  })
})
