import { describe, expect, it, vi } from 'vitest'
import { modelLabel, requestAiSuggestion, suggestionRequestBody } from '@/app/(tools)/masspost/poc/ai-suggestion'
import type { LoadedList } from '@/app/(tools)/masspost/poc/columns'

const LIST: LoadedList = {
  fileName: 'lijst.xlsx',
  headers: ['Naam', 'Adres', 'Fax'],
  rows: [
    { Naam: 'Jan Peeters', Adres: 'Kerkstraat 12', Fax: '' },
    { Naam: 'An Claes', Adres: 'Molenweg 3', Fax: '' },
  ],
  rowNumbers: [2, 3],
}

const SUGGESTION = {
  mapping: { name: ['Naam'], companyDepartment: [], streetHouseBox: ['Adres'], postcodeCity: [], country: [] },
  context: [],
  ignore: ['Fax'],
}

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('modelLabel', () => {
  it('turns a gateway model id into a readable name', () => {
    expect(modelLabel('mistral/mistral-small')).toBe('Mistral Small')
    expect(modelLabel('openai/gpt-4.1-mini')).toBe('Gpt 4.1 Mini')
  })
})

describe('suggestionRequestBody', () => {
  it('sends every column in file order, with fill counts and masked examples', () => {
    const body = suggestionRequestBody(LIST, { Naam: ['Jan Peeters', 'An Claes'], Adres: ['Kerkstraat 12'], Fax: [] }, {
      Naam: 2,
      Adres: 2,
      Fax: 0,
    })

    expect(body).toEqual({
      rowCount: 2,
      columns: [
        { header: 'Naam', filled: 2, examples: ['Ax Cxxxx', 'Jxx Pxxxxxx'] },
        { header: 'Adres', filled: 2, examples: ['Kxxxstraat 12'] },
        { header: 'Fax', filled: 0, examples: [] },
      ],
    })
  })
})

describe('requestAiSuggestion', () => {
  const body = { rowCount: 2, columns: [{ header: 'Naam', filled: 2, examples: ['Jxx Pxxxxxx'] }] }

  it('posts the body as JSON to the suggest-mapping route and returns the proposal', async () => {
    const fetchImpl = vi.fn(async () => response(200, SUGGESTION))

    const result = await requestAiSuggestion(body, fetchImpl)

    expect(result).toEqual({ ok: true, suggestion: SUGGESTION })
    expect(fetchImpl).toHaveBeenCalledWith('/api/masspost/suggest-mapping', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  })

  it.each([
    [401, 'login'],
    [403, 'not_linked'],
    [503, 'not_configured'],
    [422, 'failed'],
    [502, 'failed'],
  ] as const)('maps status %i to %s', async (status, reason) => {
    const result = await requestAiSuggestion(body, async () => response(status, { error: 'x' }))
    expect(result).toEqual({ ok: false, reason })
  })

  it('reports a network error or an unexpected answer as failed', async () => {
    expect(await requestAiSuggestion(body, async () => Promise.reject(new TypeError('offline')))).toEqual({
      ok: false,
      reason: 'failed',
    })
    expect(await requestAiSuggestion(body, async () => response(200, { mapping: {} }))).toEqual({
      ok: false,
      reason: 'failed',
    })
  })
})
