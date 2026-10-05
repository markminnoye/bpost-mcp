import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTRAPUNT_SAMPLE_COLUMN_MAPPING } from '@/core/masspost/fixtures/contrapunt-sample'

vi.mock('@/lib/auth/resolve-request-auth', () => ({
  resolveRequestAuth: vi.fn(),
}))

vi.mock('@/lib/masspost/suggest-mapping-ai', async () => {
  const actual = await vi.importActual<typeof import('@/lib/masspost/suggest-mapping-ai')>(
    '@/lib/masspost/suggest-mapping-ai',
  )
  return {
    ...actual,
    suggestColumnMappingWithAi: vi.fn(),
  }
})

import { POST } from '@/app/api/masspost/suggest-mapping/route'
import { resolveRequestAuth } from '@/lib/auth/resolve-request-auth'
import {
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  suggestColumnMappingWithAi,
} from '@/lib/masspost/suggest-mapping-ai'

const CONTRAPUNT_HEADERS = [
  'Roepnaam',
  'Familienaam',
  'Correspondentieadres - Straat (Key)',
  'Correspondentieadres - Huisnummer (Key)',
  'Correspondentieadres - aanv. huisnr. (Key)',
  'Correspondentieadres - Postcode (Key)',
  'Correspondentieadres - Plaats (Key)',
]

function post(body: unknown): NextRequest {
  return new Request('http://localhost/api/masspost/suggest-mapping', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe('POST /api/masspost/suggest-mapping', () => {
  beforeEach(() => {
    vi.mocked(suggestColumnMappingWithAi).mockReset()
    vi.mocked(resolveRequestAuth).mockReset()
    vi.mocked(resolveRequestAuth).mockResolvedValue({
      success: true,
      context: { tenantId: 'tenant_a', authMethod: 'oauth-bearer' },
    })
  })

  it('returns 401 when no valid auth is provided and does not suggest a mapping', async () => {
    vi.mocked(resolveRequestAuth).mockResolvedValue({
      success: false,
      error: { status: 401, reason: 'missing_auth' },
    })

    const response = await POST(post({ headers: CONTRAPUNT_HEADERS }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toContain('Bearer token')
    expect(suggestColumnMappingWithAi).not.toHaveBeenCalled()
  })

  it('maps the Contrapunt sample titles with the heuristic and does not call AI', async () => {
    const response = await POST(post({ headers: CONTRAPUNT_HEADERS }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.source).toBe('heuristic')
    expect(body.mapping).toEqual(CONTRAPUNT_SAMPLE_COLUMN_MAPPING)
    expect(body.needsAi).toBe(false)
    expect(suggestColumnMappingWithAi).not.toHaveBeenCalled()
  })

  it('calls AI with headers only when the heuristic is incomplete', async () => {
    vi.mocked(suggestColumnMappingWithAi).mockResolvedValue({
      name: ['Kolom A'],
      streetHouseBox: ['Kolom B'],
      postcodeCity: ['Kolom C'],
    })

    const response = await POST(post({ headers: ['Kolom A', 'Kolom B', 'Kolom C'], localeHints: ['nl'] }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.source).toBe('ai')
    expect(body.needsAi).toBe(false)
    expect(body.mapping).toEqual({
      name: ['Kolom A'],
      streetHouseBox: ['Kolom B'],
      postcodeCity: ['Kolom C'],
    })
    expect(suggestColumnMappingWithAi).toHaveBeenCalledTimes(1)
    expect(suggestColumnMappingWithAi).toHaveBeenCalledWith({
      headers: ['Kolom A', 'Kolom B', 'Kolom C'],
      localeHints: ['nl'],
    })
  })

  it('fails closed when AI is required and not configured', async () => {
    vi.mocked(suggestColumnMappingWithAi).mockRejectedValue(new SuggestMappingAiNotConfiguredError())

    const response = await POST(post({ headers: ['Kolom A', 'Kolom B'] }))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.code).toBe('ai_not_configured')
    expect(body.mapping).toBeUndefined()
    expect(body.suggestion.needsAi).toBe(true)
    expect(body.suggestion.mapping.name).toEqual([])
  })

  it('returns the local suggestion when the model output is rejected', async () => {
    vi.mocked(suggestColumnMappingWithAi).mockRejectedValue(new SuggestMappingAiInvalidOutputError())

    const response = await POST(post({ headers: ['Kolom A'] }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.code).toBe('ai_invalid_output')
    expect(body.suggestion.needsAi).toBe(true)
  })

  it('refuses a body that includes sheet rows', async () => {
    const response = await POST(
      post({
        headers: ['Kolom A'],
        rows: [{ 'Kolom A': 'Anna Vanderstappen' }],
      }),
    )

    expect(response.status).toBe(400)
    expect(suggestColumnMappingWithAi).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/masspost/suggest-mapping', {
        method: 'POST',
        body: '{',
      }) as NextRequest,
    )
    expect(response.status).toBe(400)
  })
})
