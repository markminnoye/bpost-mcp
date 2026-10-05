import { NoObjectGeneratedError } from 'ai'
import { describe, expect, it, vi } from 'vitest'
import { env } from '@/lib/config/env'
import {
  SUGGEST_MAPPING_INSTRUCTIONS,
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  suggestColumnRolesWithAi,
  type SuggestColumnRolesInput,
  type SuggestMappingGenerateArgs,
  type SuggestMappingGenerateResult,
  type SuggestMappingLogEntry,
} from '@/lib/masspost/suggest-mapping-ai'

const MODEL = 'openai/gpt-4.1-mini'

// Raw values on purpose: the module must mask them again before anything reaches the model.
const INPUT: SuggestColumnRolesInput = {
  rowCount: 120,
  columns: [
    { header: 'Lidnr', filled: 120, examples: ['10234', '10871'] },
    { header: 'Naam', filled: 120, examples: ['Jan Peeters', 'An Claes'] },
    { header: 'Gemeente', filled: 120, examples: ['Gent', 'Lede'] },
    { header: 'Postcode', filled: 120, examples: ['9000', '9340'] },
    { header: 'Adres', filled: 120, examples: ['Kerkstraat 12 bus 3'] },
    { header: 'Telefoon', filled: 80, examples: ['0475 12 34 56'] },
    { header: 'Fax', filled: 0, examples: [] },
  ],
}

const GOOD_OUTPUT = {
  name: ['Naam'],
  companyDepartment: [],
  streetHouseBox: ['Adres'],
  postcodeCity: ['Postcode', 'Gemeente'],
  country: [],
  context: ['Lidnr', 'Telefoon'],
  ignore: ['Fax'],
}

function fakeGenerate(output: unknown) {
  return vi.fn<(args: SuggestMappingGenerateArgs) => Promise<SuggestMappingGenerateResult>>(async () => ({
    output,
    usage: { inputTokens: 900, outputTokens: 60 },
  }))
}

describe('suggestColumnRolesWithAi', () => {
  it('fails closed when no provider/model is configured and does not call the model', async () => {
    const generate = fakeGenerate(GOOD_OUTPUT)
    const previous = env.MASSPOST_SUGGEST_MAPPING_MODEL
    env.MASSPOST_SUGGEST_MAPPING_MODEL = undefined
    try {
      await expect(suggestColumnRolesWithAi(INPUT, { generate, log: () => {} })).rejects.toBeInstanceOf(
        SuggestMappingAiNotConfiguredError,
      )
      await expect(
        suggestColumnRolesWithAi(INPUT, { model: 'gpt-4.1-mini', generate, log: () => {} }),
      ).rejects.toBeInstanceOf(SuggestMappingAiNotConfiguredError)
      expect(generate).not.toHaveBeenCalled()
    } finally {
      env.MASSPOST_SUGGEST_MAPPING_MODEL = previous
    }
  })

  it('masks the examples again before they reach the model', async () => {
    const generate = fakeGenerate(GOOD_OUTPUT)
    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate, log: () => {} })

    const { prompt } = generate.mock.calls[0][0]
    expect(prompt).not.toContain('Peeters')
    expect(prompt).not.toContain('Kerkstraat')
    expect(prompt).not.toContain('0475')
    const payload = JSON.parse(prompt) as { rowCount: number; columns: { header: string; filled: number; examples: string[] }[] }
    expect(payload.rowCount).toBe(120)
    expect(payload.columns.find((c) => c.header === 'Naam')?.examples).toEqual(['Ax Cxxxx', 'Jxx Pxxxxxx'])
    expect(payload.columns.find((c) => c.header === 'Adres')?.examples).toEqual(['Kxxxstraat 12 bus 3'])
    expect(payload.columns.find((c) => c.header === 'Telefoon')?.examples).toEqual(['9999 99 99 99'])
    expect(payload.columns.find((c) => c.header === 'Fax')).toEqual({ header: 'Fax', filled: 0, examples: [] })
  })

  it('explains the mask, the roles and the envelope order in its instructions', async () => {
    const generate = fakeGenerate(GOOD_OUTPUT)
    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate, log: () => {} })

    const { instructions } = generate.mock.calls[0][0]
    expect(instructions).toBe(SUGGEST_MAPPING_INSTRUCTIONS)
    expect(instructions).toContain('gemaskeerd')
    expect(instructions).toContain('X (hoofdletter)')
    for (const role of ['name', 'companyDepartment', 'streetHouseBox', 'postcodeCity', 'country', 'context', 'ignore']) {
      expect(instructions).toContain(role)
    }
    expect(instructions).toContain('postcode vóór gemeente')
    expect(instructions).toContain('Voorbeeld')
  })

  it('limits retries, time and output size', async () => {
    const generate = fakeGenerate(GOOD_OUTPUT)
    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate, log: () => {} })

    const args = generate.mock.calls[0][0]
    expect(args.model).toBe(MODEL)
    expect(args.maxRetries).toBe(1)
    expect(args.timeout).toBe(20_000)
    expect(args.maxOutputTokens).toBeGreaterThan(0)
  })

  it('returns the roles in the order the model chose, which may differ from the file', async () => {
    const result = await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: fakeGenerate(GOOD_OUTPUT), log: () => {} })

    expect(result).toEqual({
      mapping: {
        name: ['Naam'],
        companyDepartment: [],
        streetHouseBox: ['Adres'],
        postcodeCity: ['Postcode', 'Gemeente'],
        country: [],
      },
      context: ['Lidnr', 'Telefoon'],
      ignore: ['Fax'],
    })
  })

  it('puts the columns the model left out under context, in file order', async () => {
    const output = { ...GOOD_OUTPUT, context: [], ignore: [] }
    const result = await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: fakeGenerate(output), log: () => {} })

    expect(result.context).toEqual(['Lidnr', 'Telefoon', 'Fax'])
    expect(result.ignore).toEqual([])
  })

  it('rejects a column that the model uses twice', async () => {
    const output = { ...GOOD_OUTPUT, context: ['Lidnr', 'Telefoon', 'Naam'] }
    await expect(
      suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: fakeGenerate(output), log: () => {} }),
    ).rejects.toBeInstanceOf(SuggestMappingAiInvalidOutputError)
  })

  it('rejects a column that is not in the file', async () => {
    const output = { ...GOOD_OUTPUT, name: ['Voornaam'] }
    await expect(
      suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: fakeGenerate(output), log: () => {} }),
    ).rejects.toBeInstanceOf(SuggestMappingAiInvalidOutputError)
  })

  it('turns an unparsable model answer into an invalid-output error', async () => {
    const generate = vi.fn(async () => {
      throw new NoObjectGeneratedError({
        response: { id: 'r', timestamp: new Date(), modelId: MODEL },
        usage: {
          inputTokens: 1,
          inputTokenDetails: { noCacheTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
          outputTokens: 1,
          outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
          totalTokens: 2,
        },
        finishReason: 'stop',
      })
    })
    await expect(suggestColumnRolesWithAi(INPUT, { model: MODEL, generate, log: () => {} })).rejects.toBeInstanceOf(
      SuggestMappingAiInvalidOutputError,
    )
  })

  it('logs one line per call with the model, duration, tokens and outcome, and no content', async () => {
    const log = vi.fn<(entry: SuggestMappingLogEntry) => void>()
    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: fakeGenerate(GOOD_OUTPUT), log })

    expect(log).toHaveBeenCalledTimes(1)
    const entry = log.mock.calls[0][0]
    expect(entry).toMatchObject({ model: MODEL, outcome: 'ok', columns: 7, inputTokens: 900, outputTokens: 60 })
    expect(entry.ms).toBeGreaterThanOrEqual(0)
    const line = JSON.stringify(entry)
    for (const text of ['Naam', 'Adres', 'Gemeente', 'Jxx', 'Kxxxstraat']) expect(line).not.toContain(text)
  })

  it('logs the outcome of a failed call: invalid output, timeout or failure', async () => {
    const outcomes: string[] = []
    const log = (entry: SuggestMappingLogEntry) => outcomes.push(entry.outcome)

    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: fakeGenerate({ name: [] }), log }).catch(() => {})
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' })
    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: vi.fn().mockRejectedValue(timeout), log }).catch(() => {})
    await suggestColumnRolesWithAi(INPUT, { model: MODEL, generate: vi.fn().mockRejectedValue(new Error('502')), log }).catch(
      () => {},
    )

    expect(outcomes).toEqual(['invalid_output', 'timeout', 'failed'])
  })

  it('logs an abort as a timeout: only the time limit aborts the call', async () => {
    const outcomes: string[] = []
    const abort = Object.assign(new Error('Delay was aborted'), { name: 'AbortError' })
    await suggestColumnRolesWithAi(INPUT, {
      model: MODEL,
      generate: vi.fn().mockRejectedValue(abort),
      log: (entry) => outcomes.push(entry.outcome),
    }).catch(() => {})

    expect(outcomes).toEqual(['timeout'])
  })
})
