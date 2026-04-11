import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/install/load-install-prompt', () => ({
  getInstallPromptMarkdown: vi.fn().mockResolvedValue('# Install prompt\n'),
}))

import { GET } from '@/app/api/install/prompt/route'

describe('GET /api/install/prompt', () => {
  it('returns markdown with cache header', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
    expect(res.headers.get('Cache-Control')).toContain('max-age=300')
    expect(await res.text()).toBe('# Install prompt\n')
  })
})
