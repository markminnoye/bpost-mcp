// src/lib/masspost/suggest-mapping-ai.ts
import { createGateway, generateObject } from 'ai'
import { z } from 'zod'
import type { ColumnMapping } from '@/core/masspost/mapping'
import { env } from '@/lib/config/env'

/**
 * Optional AI fallback for column mapping. Lives outside `src/core/masspost`.
 * Sends column titles only — never sheet rows.
 */

export class SuggestMappingAiNotConfiguredError extends Error {
  readonly code = 'ai_not_configured' as const

  constructor(message = 'AI-kolommapping is niet ingesteld.') {
    super(message)
    this.name = 'SuggestMappingAiNotConfiguredError'
  }
}

export class SuggestMappingAiInvalidOutputError extends Error {
  readonly code = 'ai_invalid_output' as const

  constructor(message = 'Het model koos een kolom die niet in het bestand staat.') {
    super(message)
    this.name = 'SuggestMappingAiInvalidOutputError'
  }
}

export const SUGGEST_MAPPING_SYSTEM_PROMPT = [
  'Kies Excel-kolomkoppen voor bpost unstructured Comp-velden.',
  'Gebruik alleen kolomkoppen uit de lijst van de gebruiker. Verzin geen kolommen.',
  'Vraag geen celwaarden en verwacht geen adressen.',
  'Comp 90 name: naam van de persoon. Meerdere kolommen mogen, eerst voornaam dan familienaam.',
  'Comp 91 companyDepartment: bedrijf of afdeling. Optioneel. Laat weg als er geen kolom is.',
  'Comp 92 streetHouseBox: straat, huisnummer en bus. Geen aparte straat/huisnummer-split buiten dit veld.',
  'Comp 93 postcodeCity: postcode en plaats.',
  'Zet elke kolom hoogstens in één veld.',
].join('\n')

const PROVIDER_MODEL = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i

export function isProviderModel(value: string | undefined): value is string {
  return typeof value === 'string' && PROVIDER_MODEL.test(value.trim())
}

/** User prompt is a JSON object with column titles only. */
export function buildSuggestMappingUserPrompt(
  headers: readonly string[],
  localeHints?: readonly string[],
): string {
  return JSON.stringify({
    headers,
    localeHints: localeHints ?? [],
  })
}

function columnSchema(headers: readonly string[]) {
  const unique = [...new Set(headers)]
  if (unique.length === 0) {
    throw new SuggestMappingAiInvalidOutputError('Geen kolomkoppen om te beoordelen.')
  }
  const column = z.enum(unique as [string, ...string[]])
  return z.object({
    name: z.array(column).min(1),
    companyDepartment: z.array(column).optional(),
    streetHouseBox: z.array(column).min(1),
    postcodeCity: z.array(column).min(1),
  })
}

export function columnMappingFromModelOutput(output: unknown, headers: readonly string[]): ColumnMapping {
  const allowed = new Set(headers)
  const parsed = columnSchema(headers).safeParse(output)
  if (!parsed.success) {
    throw new SuggestMappingAiInvalidOutputError()
  }

  const company = parsed.data.companyDepartment ?? []
  const flat = [
    ...parsed.data.name,
    ...company,
    ...parsed.data.streetHouseBox,
    ...parsed.data.postcodeCity,
  ]
  if (flat.some((column) => !allowed.has(column)) || new Set(flat).size !== flat.length) {
    throw new SuggestMappingAiInvalidOutputError()
  }

  return {
    name: [...parsed.data.name],
    streetHouseBox: [...parsed.data.streetHouseBox],
    postcodeCity: [...parsed.data.postcodeCity],
    ...(company.length > 0 ? { companyDepartment: [...company] } : {}),
  }
}

export interface SuggestMappingGenerateArgs {
  model: string
  schema: z.ZodType
  system: string
  prompt: string
}

export interface SuggestMappingAiDeps {
  /** When set (including ''), overrides `MASSPOST_SUGGEST_MAPPING_MODEL`. */
  model?: string
  generateObject?: (args: SuggestMappingGenerateArgs) => Promise<{ object: unknown }>
}

function resolveModel(deps: SuggestMappingAiDeps | undefined): string | undefined {
  const raw = deps && 'model' in deps ? deps.model : env.MASSPOST_SUGGEST_MAPPING_MODEL
  const trimmed = raw?.trim()
  return isProviderModel(trimmed) ? trimmed : undefined
}

export async function suggestColumnMappingWithAi(
  input: { headers: readonly string[]; localeHints?: readonly string[] },
  deps?: SuggestMappingAiDeps,
): Promise<ColumnMapping> {
  const modelId = resolveModel(deps)
  if (!modelId) {
    throw new SuggestMappingAiNotConfiguredError()
  }

  const headers = input.headers.map((header) => header.trim()).filter((header) => header.length > 0)
  const schema = columnSchema(headers)
  const system = SUGGEST_MAPPING_SYSTEM_PROMPT
  const prompt = buildSuggestMappingUserPrompt(headers, input.localeHints)

  const object = deps?.generateObject
    ? (await deps.generateObject({ model: modelId, schema, system, prompt })).object
    : (
        await generateObject({
          model: env.AI_GATEWAY_API_KEY
            ? createGateway({ apiKey: env.AI_GATEWAY_API_KEY })(modelId)
            : modelId,
          schema,
          system,
          prompt,
        })
      ).object

  return columnMappingFromModelOutput(object, headers)
}
