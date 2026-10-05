// src/core/masspost/excel.ts
// Reads address workbooks with SheetJS (ADR 0005): .xlsx and the older .xls, in Node and in the browser.
import * as XLSX from 'xlsx'

/** First worksheet of an address workbook: header titles and one record per data row. */
export interface ParsedExcel {
  headers: string[]
  rows: Record<string, unknown>[]
  /** Spreadsheet row number of each entry in `rows` (the header is row 1, blank rows are skipped). */
  rowNumbers: number[]
}

/** Thrown when the workbook cannot be read, has no sheet, or has no header row. */
export class ExcelParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExcelParseError'
  }
}

/** Office Open XML (.xlsx) is a zip file; Excel 97-2003 (.xls) is a Compound File. */
const SIGNATURES: readonly (readonly number[])[] = [
  [0x50, 0x4b, 0x03, 0x04],
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
]

function isWorkbook(bytes: Uint8Array): boolean {
  return SIGNATURES.some((signature) => signature.every((byte, i) => bytes[i] === byte))
}

function cellValue(cell: XLSX.CellObject | undefined): unknown {
  if (!cell || cell.t === 'z') return ''
  if (cell.t === 'd') return (cell.v as Date).toISOString()
  if (cell.t === 'e') return XLSX.utils.format_cell(cell) // e.g. "#N/A"
  return cell.v ?? '' // string, number or boolean; formulas give their last computed value
}

/**
 * Reads a raw customer address list (.xlsx, or .xls from Excel 97-2003). The first row must
 * contain column titles; every other row is one address. Blank rows are skipped. A column with
 * an empty title is ignored. Other formats (such as CSV) are refused rather than guessed at.
 *
 * Deliberately does not attempt to split "street + number" or similar composite columns —
 * see docs/external/contrapunt-aft-converter/README.md point 1: Contrapunt's own tool maps
 * source columns straight into unstructured bpost fields, which is also this library's
 * default strategy (src/core/masspost/mapping.ts).
 *
 * Runs in Node and in the browser. Values come back as strings, numbers or booleans; dates as
 * ISO strings; empty cells as `''`.
 *
 * @param input Workbook bytes (`Buffer`, or the `ArrayBuffer` of a browser `File`).
 * @returns Column titles from row 1, the non-empty data rows and their spreadsheet row numbers.
 * @example
 * const { headers, rows } = await parseExcelAddresses(fileBuffer)
 */
export async function parseExcelAddresses(input: Buffer | ArrayBuffer | Uint8Array): Promise<ParsedExcel> {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input
  if (!isWorkbook(bytes)) {
    throw new ExcelParseError('Dit is geen Excel-bestand (.xlsx of .xls).')
  }

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(bytes, { type: 'array', dense: true, cellDates: true, cellText: false, cellHTML: false })
  } catch (err) {
    throw new ExcelParseError(`Kon het Excel-bestand niet lezen: ${(err as Error).message}`)
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) {
    throw new ExcelParseError('Het Excel-bestand bevat geen werkblad.')
  }

  const data = sheet['!data'] ?? []
  const columns: { index: number; header: string }[] = []
  ;(data[0] ?? []).forEach((cell, index) => {
    const header = String(cellValue(cell)).trim()
    if (header) columns.push({ index, header })
  })

  if (columns.length === 0) {
    throw new ExcelParseError('Geen kolomtitels gevonden op de eerste rij.')
  }

  const rows: Record<string, unknown>[] = []
  const rowNumbers: number[] = []
  for (let r = 1; r < data.length; r++) {
    const cells = data[r]
    if (!cells) continue // blank row

    const record: Record<string, unknown> = {}
    for (const { index, header } of columns) record[header] = cellValue(cells[index])

    const hasContent = Object.values(record).some((v) => String(v).trim() !== '')
    if (hasContent) {
      rows.push(record)
      rowNumbers.push(r + 1)
    }
  }

  return { headers: columns.map((c) => c.header), rows, rowNumbers }
}
