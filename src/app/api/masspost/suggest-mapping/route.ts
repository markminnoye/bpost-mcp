// src/app/api/masspost/suggest-mapping/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestAuth, type AuthPolicy } from '@/lib/auth/resolve-request-auth'
import {
  SuggestMappingAiInvalidOutputError,
  SuggestMappingAiNotConfiguredError,
  suggestColumnRolesWithAi,
} from '@/lib/masspost/suggest-mapping-ai'
import { SuggestMappingRequestSchema } from './schema'

const suggestMappingAuthPolicy: AuthPolicy = {
  allowBearer: true,
  allowSession: true,
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/** AI proposal for the column mapping (ADR 0006). Thin: auth, parse, call, map errors to status codes. */
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

  try {
    // The AI module masks the examples again before anything reaches the model.
    return Response.json(await suggestColumnRolesWithAi(parsed.data))
  } catch (error) {
    if (error instanceof SuggestMappingAiNotConfiguredError) {
      return Response.json({ error: error.message, code: error.code }, { status: 503 })
    }
    if (error instanceof SuggestMappingAiInvalidOutputError) {
      return Response.json({ error: error.message, code: error.code }, { status: 422 })
    }
    // No error details: they may echo what was sent to the model.
    console.error('[masspost/suggest-mapping] AI call failed')
    return Response.json({ error: 'AI-kolommapping is mislukt.', code: 'ai_failed' }, { status: 502 })
  }
}
