import Papa from 'papaparse'
import { randomUUID } from 'crypto'
import type { BatchState, BatchRow } from '@/lib/kv/client'

export const MAX_ROWS = 1_000

export type IngestError =
  | { kind: 'unsupported_format'; message: string }
  | { kind: 'parse_error'; message: string; details: unknown }
  | { kind: 'empty_file'; message: string }
  | { kind: 'too_many_rows'; message: string; rowCount: number }

export type IngestResult =
  | { ok: true; state: BatchState }
  | { ok: false; error: IngestError }

/**
 * Parses a raw CSV string into an initial BatchState (status UNMAPPED).
 * Used by both the REST upload endpoint and the `upload_batch_file` MCP tool.
 */
export function ingestCsv(csvText: string, fileName: string, tenantId: string): IngestResult {
  if (!fileName.endsWith('.csv')) {
    return {
      ok: false,
      error: {
        kind: 'unsupported_format',
        message: 'Currently only .csv files are supported. Please convert your file to CSV and try again.',
      },
    }
  }

  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      error: {
        kind: 'parse_error',
        message: 'Failed to parse CSV file.',
        details: parsed.errors,
      },
    }
  }

  const rawRows = parsed.data
  if (rawRows.length === 0) {
    return {
      ok: false,
      error: { kind: 'empty_file', message: 'The provided CSV file contains no data rows.' },
    }
  }

  // Hard cap at 1,000 rows — stays within Upstash's 1 MB per-key limit.
  // Resolution for larger batches tracked in: https://github.com/markminnoye/bpost-mcp/issues/4
  if (rawRows.length > MAX_ROWS) {
    return {
      ok: false,
      error: {
        kind: 'too_many_rows',
        message: `Files exceeding ${MAX_ROWS.toLocaleString()} rows are not supported in this tier. Please split your file and upload in batches.`,
        rowCount: rawRows.length,
      },
    }
  }

  const headers = Object.keys(rawRows[0] || {})
  const rows: BatchRow[] = rawRows.map((rawRow, index) => ({ index, raw: rawRow }))

  const state: BatchState = {
    batchId: randomUUID(),
    tenantId,
    status: 'UNMAPPED',
    headers,
    rows,
    createdAt: new Date().toISOString(),
  }

  return { ok: true, state }
}
