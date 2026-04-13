import { describe, it, expect, vi } from 'vitest'
import { buildNewIssueUrl, reportIssueToGithub } from '@/lib/github/report-issue'

describe('buildNewIssueUrl', () => {
  it('builds a prefilled new-issue URL for the mcp repo', () => {
    const url = buildNewIssueUrl('Titel', 'Omschrijving')
    expect(url).toContain('https://github.com/markminnoye/bpost-mcp/issues/new?')
    // URLSearchParams encodes spaces as + in the query string
    expect(url).toMatch(/title=%5BAGENT%5D(\+|%20)Titel/)
    expect(url).toContain('Omschrijving')
  })
})

describe('reportIssueToGithub', () => {
  it('returns manual URL when token is missing', async () => {
    const fetchMock = vi.fn()
    const out = await reportIssueToGithub(undefined, { title: 'X', body: 'Y' }, fetchMock)
    expect(out.isError).toBe(false)
    expect(out.content[0]?.text).toContain('github.com/markminnoye/bpost-mcp/issues/new')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns manual URL when token is blank', async () => {
    const fetchMock = vi.fn()
    const out = await reportIssueToGithub('   ', { title: 'X', body: 'Y' }, fetchMock)
    expect(out.isError).toBe(false)
    expect(out.content[0]?.text).toContain('github.com/markminnoye/bpost-mcp/issues/new')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs to GitHub API when token is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/markminnoye/bpost-mcp/issues/99' }),
    })
    const out = await reportIssueToGithub('ghp_secret', { title: 'Bug', body: 'Details' }, fetchMock)
    expect(out.isError).toBe(false)
    expect(out.content[0]?.text).toContain('https://github.com/markminnoye/bpost-mcp/issues/99')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/markminnoye/bpost-mcp/issues',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer ghp_secret' }),
      }),
    )
  })

  it('includes manual URL when API returns error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Bad credentials',
    })
    const out = await reportIssueToGithub('bad', { title: 'T', body: 'B' }, fetchMock)
    expect(out.isError).toBe(true)
    expect(out.content[0]?.text).toContain('401')
    expect(out.content[0]?.text).toContain('github.com/markminnoye/bpost-mcp/issues/new')
  })

  it('sends labels to GitHub API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/markminnoye/bpost-mcp/issues/1' }),
    })
    await reportIssueToGithub('token', { title: 'T', body: 'B', labels: ['MCP'] }, fetchMock)
    const callBody = JSON.parse(fetchMock.mock.calls[0][1]?.body)
    expect(callBody.labels).toEqual(['MCP'])
  })

  it('includes tenant ID and name in issue body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/markminnoye/bpost-mcp/issues/1' }),
    })
    await reportIssueToGithub('token', {
      title: 'T',
      body: 'B',
      tenantMeta: { id: 'tenant-uuid-123', name: 'Acme Corp' },
    }, fetchMock)
    const callBody = JSON.parse(fetchMock.mock.calls[0][1]?.body)
    expect(callBody.body).toContain('**Tenant:** Acme Corp (tenant-uuid-123)')
  })

  it('includes tenant ID only when name is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/markminnoye/bpost-mcp/issues/1' }),
    })
    await reportIssueToGithub('token', {
      title: 'T',
      body: 'B',
      tenantMeta: { id: 'tenant-uuid-456' },
    }, fetchMock)
    const callBody = JSON.parse(fetchMock.mock.calls[0][1]?.body)
    expect(callBody.body).toContain('**Tenant ID:** tenant-uuid-456')
    expect(callBody.body).not.toContain('Tenant:')
  })
})
