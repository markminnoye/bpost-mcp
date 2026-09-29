// src/core/masspost/excel.ts
import ExcelJS from 'exceljs'

export interface ParsedExcel {
  headers: string[]
  rows: Record<string, unknown>[]
}

export class ExcelParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExcelParseError'
  }
}

/**
 * Reads a raw customer address list (.xlsx). The first row must contain column titles;
 * every other row is one address. Blank rows are skipped.
 *
 * Deliberately does not attempt to split "street + number" or similar composite columns —
 * see docs/external/contrapunt-aft-converter/README.md point 1: Contrapunt's own tool maps
 * source columns straight into unstructured bpost fields, which is also this library's
 * default strategy (src/core/masspost/mapping.ts).
 */
export async function parseExcelAddresses(input: Buffer | ArrayBuffer): Promise<ParsedExcel> {
  const workbook = new ExcelJS.Workbook()
  const buffer = input instanceof ArrayBuffer ? Buffer.from(input) : input

  try {
    // exceljs's bundled types declare their own ambient `Buffer` shape that TypeScript treats
    // as distinct from @types/node's Buffer<ArrayBufferLike> — both describe the same runtime
    // object, so `any` sidesteps the structural mismatch rather than chasing type duplication.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any)
  } catch (err) {
    throw new ExcelParseError(`Kon het Excel-bestand niet lezen: ${(err as Error).message}`)
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new ExcelParseError('Het Excel-bestand bevat geen werkblad.')
  }

  const headers: string[] = []
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
    headers.push(String(cell.value ?? '').trim())
  })

  if (headers.length === 0) {
    throw new ExcelParseError('Geen kolomtitels gevonden op de eerste rij.')
  }

  const rows: Record<string, unknown>[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // header row

    const record: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      record[header] = cellToValue(row.getCell(idx + 1))
    })

    const hasContent = Object.values(record).some((v) => String(v ?? '').trim() !== '')
    if (hasContent) rows.push(record)
  })

  return { headers, rows }
}

function cellToValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    if ('text' in value) return (value as { text: unknown }).text // rich text
    if ('result' in value) return (value as { result: unknown }).result // formula
    if ('richText' in value) {
      return (value as { richText: { text: string }[] }).richText.map((r) => r.text).join('')
    }
  }
  return value
}
