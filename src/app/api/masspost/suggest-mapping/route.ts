// src/app/api/masspost/suggest-mapping/route.ts
import { z } from 'zod'
import { suggestColumnMapping } from '@/core/masspost/suggest-mapping'
import type { ColumnMapping } from '@/core/masspost/mapping'
import type { SuggestColumnMappingResult } from '@/core/masspost/suggest-mapping'
import {
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  suggestColumnMappingWithAi,
} from '@/lib/masspost/suggest-mapping-ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const requestSchema = z
  .object({
    headers: z.array(z.string()).min(1).max(100),
    presetId: z.literal('contrapunt-export').optional(),
    localeHints: z.array(z.enum(['nl', 'fr', 'en'])).max(3).optional(),
  })
  .strict()

function aiSuggestion(headers: readonly string[], mapping: ColumnMapping): SuggestColumnMappingResult {
  const used = new Set([
    ...mapping.name,
    ...(mapping.companyDepartment ?? []),
    ...mapping.streetHouseBox,
    ...mapping.postcodeCity,
  ])
  const list = (columns: readonly string[]) => columns.join(', ')
  return {
    mapping,
    confidence: 'medium',
    rationale: {
      '90': `Voorstel voor naam: ${list(mapping.name)}. Bevestig dit voor je het gebruikt.`,
      '91': mapping.companyDepartment?.length
        ? `Voorstel voor bedrijf of afdeling: ${list(mapping.companyDepartment)}. Bevestig dit voor je het gebruikt.`
        : 'Geen kolom voor bedrijf of afdeling.',
      '92': `Voorstel voor straat, huisnummer en bus: ${list(mapping.streetHouseBox)}. Bevestig dit voor je het gebruikt.`,
      '93': `Voorstel voor postcode en plaats: ${list(mapping.postcodeCity)}. Bevestig dit voor je het gebruikt.`,
    },
    unmatchedHeaders: headers.filter((header) => !used.has(header)),
    needsAi: false,
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Ongeldige JSON.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Ongeldige invoer.' }, { status: 400 })
  }

  const headers = parsed.data.headers.map((header) => header.trim()).filter((header) => header.length > 0)
  if (headers.length === 0) {
    return Response.json({ error: 'Geen kolomkoppen.' }, { status: 400 })
  }

  const suggestion = suggestColumnMapping({
    headers,
    presetId: parsed.data.presetId,
    localeHints: parsed.data.localeHints,
  })

  if (!suggestion.needsAi) {
    return Response.json({ ...suggestion, source: 'heuristic' })
  }

  try {
    const mapping = await suggestColumnMappingWithAi({
      headers,
      localeHints: parsed.data.localeHints,
    })
    return Response.json({ ...aiSuggestion(headers, mapping), source: 'ai' })
  } catch (error) {
    if (error instanceof SuggestMappingAiNotConfiguredError) {
      return Response.json(
        { error: error.message, code: error.code, suggestion },
        { status: 503 },
      )
    }
    if (error instanceof SuggestMappingAiInvalidOutputError) {
      return Response.json(
        { error: error.message, code: error.code, suggestion },
        { status: 422 },
      )
    }
    console.error('[masspost/suggest-mapping] AI fallback failed')
    return Response.json(
      { error: 'AI-kolommapping is mislukt.', code: 'ai_failed', suggestion },
      { status: 502 },
    )
  }
}
