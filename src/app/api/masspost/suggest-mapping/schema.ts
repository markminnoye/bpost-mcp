import { z } from 'zod'

/** `POST /api/masspost/suggest-mapping` body. The handler parses it with this schema. */
export const SuggestMappingRequestSchema = z
  .object({
    headers: z.array(z.string()).min(1).max(100),
    presetId: z.literal('contrapunt-export').optional(),
    localeHints: z.array(z.enum(['nl', 'fr', 'en'])).max(3).optional(),
  })
  .strict()
  .meta({ id: 'SuggestMappingRequest' })

const SuggestionShape = z.object({
  mapping: z.object({
    name: z.array(z.string()),
    companyDepartment: z.array(z.string()).optional(),
    streetHouseBox: z.array(z.string()),
    postcodeCity: z.array(z.string()),
    country: z.array(z.string()).optional().meta({
      description: 'Country column (name or two-letter code). Sent to bpost as Comp 18 or 17, never for Belgium.',
    }),
  }),
  confidence: z.enum(['high', 'medium', 'low']),
  rationale: z.record(z.string(), z.string()).meta({
    description: 'Why each Comp target was chosen. Keys are `90`, `91`, `92`, `93` and, for the heuristic and presets, `18` (country).',
  }),
  unmatchedHeaders: z.array(z.string()),
  needsAi: z.boolean(),
  preset: z.enum(['contrapunt-export', 'aft']).optional().meta({
    description: "Known layout recognised from the titles: Contrapunt's export or bpost's Address File Tool.",
  }),
})

/** 200 body. Describes the handler; it does not parse it. `source` says who produced the mapping. */
export const SuggestMappingResponseSchema = SuggestionShape.extend({
  source: z.enum(['heuristic', 'ai']),
}).meta({ id: 'SuggestMappingResponse' })

/**
 * Error JSON for 400, 401, 403, 422, 502 and 503.
 * `code` and `suggestion` (heuristic result, without `source`) are only set when the AI fallback fails.
 */
export const SuggestMappingErrorSchema = z
  .object({
    error: z.string(),
    code: z.enum(['ai_not_configured', 'ai_invalid_output', 'ai_failed']).optional(),
    suggestion: SuggestionShape.optional(),
  })
  .meta({ id: 'SuggestMappingError' })
