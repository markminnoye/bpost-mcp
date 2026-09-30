// src/app/api/masspost/suggest-mapping/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { suggestColumnMapping } from '@/core/masspost/suggest-mapping'
import type { ColumnMapping } from '@/core/masspost/mapping'
import type { SuggestColumnMappingResult } from '@/core/masspost/suggest-mapping'
import { resolveRequestAuth, type AuthPolicy } from '@/lib/auth/resolve-request-auth'
import {
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  suggestColumnMappingWithAi,
} from '@/lib/masspost/suggest-mapping-ai'
import { SuggestMappingRequestSchema } from './schema'

const suggestMappingAuthPolicy: AuthPolicy = {
  allowBearer: true,
  allowSession: true,
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

export async function POST(request: NextRequest) {
  const authResult = await resolveRequestAuth(request, suggestMappingAuthPolicy)
  if (!authResult.success) {
    const messages: Record<typeof authResult.error.reason, string> = {
      missing_auth: 'No authentication provided. Supply a valid Bearer token or sign in first.',
      invalid_bearer: 'The provided Bearer token is invalid or expired.',
      invalid_session: 'Your session has expired. Please sign in again.',
      missing_tenant: 'Your account is not linked to a BPost tenant. Please configure your credentials first.',
    }
    const message = messages[authResult.error.reason] ?? 'Authentication failed.'
    return NextResponse.json({ error: message }, { status: authResult.error.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Ongeldige JSON.' }, { status: 400 })
  }

  const parsed = SuggestMappingRequestSchema.safeParse(body)
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
