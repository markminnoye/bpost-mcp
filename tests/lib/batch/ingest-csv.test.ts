// tests/lib/batch/ingest-csv.test.ts
import { describe, it, expect } from 'vitest'
import { ingestCsv, MAX_ROWS } from '@/lib/batch/ingest-csv'

const TENANT = 'tenant_test'

function makeCsv(rows: number, headers = ['naam', 'postcode']): string {
  const lines = [headers.join(',')]
  for (let i = 0; i < rows; i++) {
    lines.push(headers.map(() => `val${i}`).join(','))
  }
  return lines.join('\n')
}

describe('ingestCsv — format guard', () => {
  it('rejects non-csv extensions', () => {
    const result = ingestCsv('col1\nval', 'batch.xlsx', TENANT)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('unsupported_format')
  })

  it('rejects files without an extension', () => {
    const result = ingestCsv('col1\nval', 'batch', TENANT)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('unsupported_format')
  })

  it('accepts lowercase .csv extension', () => {
    const result = ingestCsv(makeCsv(2), 'batch.csv', TENANT)
    expect(result.ok).toBe(true)
  })
})

describe('ingestCsv — empty file', () => {
  it('rejects a header-only CSV (no data rows)', () => {
    const result = ingestCsv('naam,postcode\n', 'batch.csv', TENANT)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('empty_file')
  })

  it('rejects a completely empty string', () => {
    const result = ingestCsv('', 'batch.csv', TENANT)
    expect(result.ok).toBe(false)
  })
})

describe('ingestCsv — row limit', () => {
  it(`rejects files with more than ${MAX_ROWS} rows`, () => {
    const result = ingestCsv(makeCsv(MAX_ROWS + 1), 'big.csv', TENANT)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('too_many_rows')
      expect(result.error.message).toContain(MAX_ROWS.toLocaleString())
    }
  })

  it(`accepts exactly ${MAX_ROWS} rows`, () => {
    const result = ingestCsv(makeCsv(MAX_ROWS), 'exact.csv', TENANT)
    expect(result.ok).toBe(true)
  })
})

describe('ingestCsv — happy path', () => {
  it('returns a BatchState with correct shape', () => {
    const csv = 'naam,postcode\nJan Janssen,2000\nPiet Peeters,9000'
    const result = ingestCsv(csv, 'test.csv', TENANT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { state } = result
    expect(state.tenantId).toBe(TENANT)
    expect(state.status).toBe('UNMAPPED')
    expect(state.headers).toEqual(['naam', 'postcode'])
    expect(state.rows).toHaveLength(2)
    expect(state.rows[0].index).toBe(0)
    expect(state.rows[0].raw).toEqual({ naam: 'Jan Janssen', postcode: '2000' })
    expect(state.batchId).toMatch(/^[0-9a-f-]{36}$/)
    expect(state.createdAt).toBeTruthy()
  })

  it('assigns consecutive 0-based indexes to rows', () => {
    const result = ingestCsv(makeCsv(5), 'five.csv', TENANT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.rows.map(r => r.index)).toEqual([0, 1, 2, 3, 4])
  })

  it('scopes batch to provided tenantId', () => {
    const result = ingestCsv(makeCsv(1), 'scoped.csv', 'other_tenant')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.tenantId).toBe('other_tenant')
  })
})

describe('ingestCsv — utf-8 and edge cases', () => {
  it('strips UTF-8 BOM if present', () => {
    const csv = '\uFEFFnaam,postcode\nJan Janssen,2000'
    const result = ingestCsv(csv, 'bom.csv', TENANT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.headers).toEqual(['naam', 'postcode']) // Should not include the BOM character
  })

  it('handles special characters correctly (e.g., ß, é)', () => {
    const csv = 'naam,postcode\nHauptstraße,2000\nCafé,3000'
    const result = ingestCsv(csv, 'special.csv', TENANT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.rows[0].raw).toEqual({ naam: 'Hauptstraße', postcode: '2000' })
    expect(result.state.rows[1].raw).toEqual({ naam: 'Café', postcode: '3000' })
  })

  it('normalizes CRLF to LF', () => {
    const csv = 'naam,postcode\r\nJan Janssen,2000\r\nPiet Peeters,9000'
    const result = ingestCsv(csv, 'crlf.csv', TENANT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.rows).toHaveLength(2)
  })

  it('provides a detailed error message when parsing fails', () => {
    // Generate a parser error by providing inconsistent quotes
    const csv = 'naam,postcode\n"Jan Janssen,2000\nPiet Peeters,9000'
    const result = ingestCsv(csv, 'error.csv', TENANT)
    expect(result.ok).toBe(false)
    if (result.ok) return
    
    expect(result.error.kind).toBe('parse_error')
    expect(result.error.message).toContain('Failed to parse CSV file')
    expect(result.error.message).toContain('Check if the file is correctly encoded')
    // Verify row info and non-boilerplate message length without coupling to PapaParse internals
    expect(result.error.message).toContain('at row')
    expect(result.error.message.length).toBeGreaterThan(60)
  })
})
