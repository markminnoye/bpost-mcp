import { z } from 'zod'

/** One column of the file: its title, how many rows have a value, and up to 5 masked examples. */
const ColumnSampleSchema = z
  .object({
    header: z.string().min(1).max(200),
    filled: z.number().int().min(0).meta({ description: 'Rows with a value in this column.' }),
    examples: z.array(z.string().max(200)).max(5).meta({
      description: 'Sample values masked with `maskValue` (src/core/masspost/mask.ts). The server masks them again.',
    }),
  })
  .strict()

/** `POST /api/masspost/suggest-mapping` body. The handler parses it with this schema. */
export const SuggestMappingRequestSchema = z
  .object({
    columns: z
      .array(ColumnSampleSchema)
      .min(1)
      .max(100)
      .refine((columns) => new Set(columns.map((column) => column.header)).size === columns.length, {
        message: 'Column titles must be unique.',
      })
      .meta({ description: 'Every column of the file, in file order.' }),
    rowCount: z.number().int().min(0),
    localeHints: z.array(z.enum(['nl', 'fr', 'en'])).max(3).optional(),
  })
  .strict()
  .meta({ id: 'SuggestMappingRequest' })

const columns = z.array(z.string())

/** 200 body. Describes the handler; it does not parse it. Every column appears exactly once. */
export const SuggestMappingResponseSchema = z
  .object({
    mapping: z
      .object({
        name: columns,
        companyDepartment: columns,
        streetHouseBox: columns,
        postcodeCity: columns,
        country: columns.meta({
          description: 'Country column (name or two-letter code). Sent to bpost as Comp 18 or 17, never for Belgium.',
        }),
      })
      .meta({ description: 'Columns per address block. Within a block, the list order is the order on the envelope.' }),
    context: columns.meta({ description: 'Not on the envelope; shown while correcting. Columns the model left out end up here.' }),
    ignore: columns.meta({ description: 'Empty, technical or duplicate columns.' }),
  })
  .meta({ id: 'SuggestMappingResponse' })

/** Error JSON for 400, 401, 403, 422, 502 and 503. `code` is set when the AI call fails. */
export const SuggestMappingErrorSchema = z
  .object({
    error: z.string(),
    code: z.enum(['ai_not_configured', 'ai_invalid_output', 'ai_failed']).optional(),
  })
  .meta({ id: 'SuggestMappingError' })
