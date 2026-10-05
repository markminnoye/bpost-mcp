// The AI proposal for the mapping step: request body, call and readable model name.
// Browser-safe: deep imports only, never the masspost barrel.
import { maskExamples } from '@/core/masspost/mask'
import { ADDRESS_FIELDS, type AiSuggestion, type LoadedList } from './columns'

/** Body of `POST /api/masspost/suggest-mapping` (contract in `src/app/api/masspost/suggest-mapping/schema.ts`). */
export interface SuggestionRequestBody {
  rowCount: number
  columns: { header: string; filled: number; examples: string[] }[]
}

/** The proposal, or why there is none: not signed in, account not linked, not set up, or failed. */
export type AiSuggestionResult =
  | { ok: true; suggestion: AiSuggestion }
  | { ok: false; reason: 'login' | 'not_linked' | 'not_configured' | 'failed' }

/** Readable name of a gateway model id: `mistral/mistral-small` becomes "Mistral Small". */
export function modelLabel(id: string): string {
  const name = id.split('/').pop() ?? id
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Every column in file order, with its fill count and the examples on screen, masked. */
export function suggestionRequestBody(
  list: LoadedList,
  examples: Record<string, string[]>,
  filled: Record<string, number>,
): SuggestionRequestBody {
  return {
    rowCount: list.rows.length,
    columns: list.headers.map((header) => ({
      header,
      filled: filled[header] ?? 0,
      examples: maskExamples(examples[header] ?? []),
    })),
  }
}

function isSuggestion(value: unknown): value is AiSuggestion {
  const v = value as Partial<AiSuggestion> | null
  return (
    !!v &&
    Array.isArray(v.context) &&
    Array.isArray(v.ignore) &&
    !!v.mapping &&
    ADDRESS_FIELDS.every((field) => Array.isArray(v.mapping?.[field]))
  )
}

const REASONS: Record<number, Exclude<AiSuggestionResult, { ok: true }>['reason']> = {
  401: 'login',
  403: 'not_linked',
  503: 'not_configured',
}

/** Asks the route for a proposal. Same origin, so the session cookie goes along. */
export async function requestAiSuggestion(
  body: SuggestionRequestBody,
  fetchImpl: typeof fetch = fetch,
): Promise<AiSuggestionResult> {
  try {
    const response = await fetchImpl('/api/masspost/suggest-mapping', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) return { ok: false, reason: REASONS[response.status] ?? 'failed' }
    const json: unknown = await response.json()
    return isSuggestion(json) ? { ok: true, suggestion: json } : { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
