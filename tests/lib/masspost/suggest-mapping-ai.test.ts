import { describe, expect, it, vi } from 'vitest'
import { env } from '@/lib/config/env'
import {
  SUGGEST_MAPPING_SYSTEM_PROMPT,
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  buildSuggestMappingUserPrompt,
  suggestColumnMappingWithAi,
} from '@/lib/masspost/suggest-mapping-ai'

const HEADERS = ['Roepnaam', 'Familienaam', 'Straat', 'Postcode', 'Plaats']

describe('suggestColumnMappingWithAi', () => {
  it('fails closed when no provider/model is configured and does not call the model', async () => {
    const generateObject = vi.fn()
    const previous = env.MASSPOST_SUGGEST_MAPPING_MODEL
    env.MASSPOST_SUGGEST_MAPPING_MODEL = undefined

    try {
      await expect(suggestColumnMappingWithAi({ headers: HEADERS })).rejects.toBeInstanceOf(
        SuggestMappingAiNotConfiguredError,
      )
      await expect(
        suggestColumnMappingWithAi({ headers: HEADERS }, { model: 'gpt-4.1-mini', generateObject }),
      ).rejects.toBeInstanceOf(SuggestMappingAiNotConfiguredError)
      expect(generateObject).not.toHaveBeenCalled()
    } finally {
      env.MASSPOST_SUGGEST_MAPPING_MODEL = previous
    }
  })

  it('sends only headers and the Comp 90-93 explanation', async () => {
    const secret = 'Anna Vanderstappen, Molenbeeksestraat 184, 1020 Brussel'
    let prompt = ''
    let system = ''

    await expect(
      suggestColumnMappingWithAi(
        { headers: HEADERS, localeHints: ['nl'] },
        {
          model: 'openai/gpt-4.1-mini',
          generateObject: async (args) => {
            prompt = args.prompt
            system = args.system
            return { object: { name: ['NietInHetBestand'], streetHouseBox: ['Straat'], postcodeCity: ['Plaats'] } }
          },
        },
      ),
    ).rejects.toBeInstanceOf(SuggestMappingAiInvalidOutputError)

    const payload = JSON.parse(prompt) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual(['headers', 'localeHints'])
    expect(payload.headers).toEqual(HEADERS)
    expect(prompt).not.toContain(secret)
    expect(system).toBe(SUGGEST_MAPPING_SYSTEM_PROMPT)
    expect(system).toContain('Comp 90')
    expect(system).toContain('Comp 93')
    expect(system).not.toContain(secret)
    expect(buildSuggestMappingUserPrompt(HEADERS)).not.toContain('rows')
  })

  it('accepts a model mapping whose columns are a subset of the headers', async () => {
    const mapping = await suggestColumnMappingWithAi(
      { headers: HEADERS },
      {
        model: 'openai/gpt-4.1-mini',
        generateObject: async () => ({
          object: {
            name: ['Roepnaam', 'Familienaam'],
            streetHouseBox: ['Straat'],
            postcodeCity: ['Postcode', 'Plaats'],
          },
        }),
      },
    )

    expect(mapping).toEqual({
      name: ['Roepnaam', 'Familienaam'],
      streetHouseBox: ['Straat'],
      postcodeCity: ['Postcode', 'Plaats'],
    })
  })

  it('rejects a model mapping that reuses one column for two targets', async () => {
    await expect(
      suggestColumnMappingWithAi(
        { headers: HEADERS },
        {
          model: 'openai/gpt-4.1-mini',
          generateObject: async () => ({
            object: {
              name: ['Roepnaam'],
              streetHouseBox: ['Straat'],
              postcodeCity: ['Straat'],
            },
          }),
        },
      ),
    ).rejects.toBeInstanceOf(SuggestMappingAiInvalidOutputError)
  })
})
