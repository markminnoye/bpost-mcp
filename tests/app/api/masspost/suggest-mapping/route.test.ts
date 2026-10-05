import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/resolve-request-auth', () => ({
  resolveRequestAuth: vi.fn(),
}))

vi.mock('@/lib/masspost/suggest-mapping-ai', async () => {
  const actual = await vi.importActual<typeof import('@/lib/masspost/suggest-mapping-ai')>(
    '@/lib/masspost/suggest-mapping-ai',
  )
  return {
    ...actual,
    suggestColumnRolesWithAi: vi.fn(),
  }
})

import { POST } from '@/app/api/masspost/suggest-mapping/route'
import { resolveRequestAuth } from '@/lib/auth/resolve-request-auth'
import {
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  suggestColumnRolesWithAi,
  type ColumnRolesSuggestion,
} from '@/lib/masspost/suggest-mapping-ai'

const BODY = {
  rowCount: 120,
  columns: [
    { header: 'Naam', filled: 120, examples: ['Jxx Pxxxxxx'] },
    { header: 'Adres', filled: 120, examples: ['Kxxxstraat 12'] },
    { header: 'Gemeente', filled: 120, examples: ['9000 Gent'] },
    { header: 'Fax', filled: 0, examples: [] },
  ],
}

const SUGGESTION: ColumnRolesSuggestion = {
  mapping: { name: ['Naam'], companyDepartment: [], streetHouseBox: ['Adres'], postcodeCity: ['Gemeente'], country: [] },
  context: [],
  ignore: ['Fax'],
}

function post(body: unknown): NextRequest {
  return new Request('http://localhost/api/masspost/suggest-mapping', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe('POST /api/masspost/suggest-mapping', () => {
  beforeEach(() => {
    vi.mocked(suggestColumnRolesWithAi).mockReset()
    vi.mocked(resolveRequestAuth).mockReset()
    vi.mocked(resolveRequestAuth).mockResolvedValue({
      success: true,
      context: { tenantId: 'tenant_a', authMethod: 'oauth-bearer' },
    })
  })

  it('returns 401 without valid auth and does not call the model', async () => {
    vi.mocked(resolveRequestAuth).mockResolvedValue({
      success: false,
      error: { status: 401, reason: 'missing_auth' },
    })

    const response = await POST(post(BODY))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toContain('Bearer token')
    expect(suggestColumnRolesWithAi).not.toHaveBeenCalled()
  })

  it('passes the columns to the model and returns its proposal', async () => {
    vi.mocked(suggestColumnRolesWithAi).mockResolvedValue(SUGGESTION)

    const response = await POST(post({ ...BODY, localeHints: ['nl'] }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(SUGGESTION)
    expect(suggestColumnRolesWithAi).toHaveBeenCalledTimes(1)
    expect(suggestColumnRolesWithAi).toHaveBeenCalledWith({ ...BODY, localeHints: ['nl'] })
  })

  it.each([
    ['sheet rows next to the columns', { ...BODY, rows: [{ Naam: 'Anna Vanderstappen' }] }],
    ['the old contract with headers only', { headers: ['Naam', 'Adres'] }],
    ['the same column title twice', { ...BODY, columns: [BODY.columns[0], BODY.columns[0]] }],
    ['more than 5 examples', { ...BODY, columns: [{ header: 'Naam', filled: 6, examples: ['a', 'b', 'c', 'd', 'e', 'f'] }] }],
    ['no columns', { rowCount: 0, columns: [] }],
  ])('refuses %s with 400', async (_case, body) => {
    const response = await POST(post(body))

    expect(response.status).toBe(400)
    expect(suggestColumnRolesWithAi).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/masspost/suggest-mapping', { method: 'POST', body: '{' }) as NextRequest,
    )
    expect(response.status).toBe(400)
  })

  it('answers 503 when no model is configured', async () => {
    vi.mocked(suggestColumnRolesWithAi).mockRejectedValue(new SuggestMappingAiNotConfiguredError())

    const response = await POST(post(BODY))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ error: 'AI-kolommapping is niet ingesteld.', code: 'ai_not_configured' })
  })

  it('answers 422 when the model gives no valid proposal', async () => {
    vi.mocked(suggestColumnRolesWithAi).mockRejectedValue(new SuggestMappingAiInvalidOutputError())

    const response = await POST(post(BODY))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.code).toBe('ai_invalid_output')
  })

  it('answers 502 when the model call fails, without passing on its details', async () => {
    vi.mocked(suggestColumnRolesWithAi).mockRejectedValue(new Error('upstream said: Naam=Jan Peeters'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(post(BODY))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toEqual({ error: 'AI-kolommapping is mislukt.', code: 'ai_failed' })
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('Jan Peeters')
    consoleError.mockRestore()
  })
})
