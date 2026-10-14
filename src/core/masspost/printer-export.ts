// src/core/masspost/printer-export.ts
// Export for the printer (web-flow decisions 48 and 49): every row of the customer's file stays
// where it was, with the customer's columns unchanged, plus columns at the end that say whether
// the row is mailed and which number bpost knows it by. Browser-safe (SheetJS, no Node APIs).
import * as XLSX from 'xlsx'
import type { ParsedExcel } from './excel'

/** Titles of the columns added at the end of the first sheet. */
export const PRINTER_EXPORT_COLUMNS = {
  /** "ja", or "nee, uitgesloten" for a row the user left out of the mailing: do not print. */
  include: 'Meesturen',
  /** The `seq` sent to bpost for this row (its row number); empty for a row that is not mailed. */
  seq: 'Volgnummer bpost',
  /** Mail ID from a submission (`MID-4030`); title may become "Mail ID (TEST, niet drukken)". */
  mid: 'Mail ID',
  /** Address as sent to bpost in the last accepted submission. */
  announced: 'Adres zoals aangekondigd',
} as const

/** Mail ID and address as announced to bpost, for one row of the printer file. */
export interface Announced {
  midNum?: string
  address: string
}

/** Input for `buildPrinterExport`. */
export interface PrinterExportInput {
  /** The customer's original workbook. Without it, the sheet is rebuilt from `parsed`. */
  source?: ArrayBuffer | Uint8Array
  /** The same workbook as read by `parseExcelAddresses`: which rows hold an address. */
  parsed: ParsedExcel
  /** Row numbers of the rows left out of the mailing. */
  excludedRowNumbers: ReadonlySet<number>
  /** After a submission: the Mail ID and the address as announced to bpost, per row number. */
  announced?: ReadonlyMap<number, Announced>
  /** The submission was Test or Certification: the Mail ID column says "TEST, niet drukken". */
  testMode?: boolean
}

function uniqueTitle(title: string, taken: ReadonlySet<string>): string {
  if (!taken.has(title)) return title
  let n = 2
  while (taken.has(`${title} (${n})`)) n++
  return `${title} (${n})`
}

function sheetFromParsed(parsed: ParsedExcel): XLSX.WorkSheet {
  const rows: unknown[][] = [parsed.headers]
  parsed.rows.forEach((record, i) => {
    rows[parsed.rowNumbers[i] - 1] = parsed.headers.map((header) => record[header] ?? '')
  })
  for (let r = 0; r < rows.length; r++) rows[r] ??= []
  return XLSX.utils.aoa_to_sheet(rows, { dense: true })
}

/**
 * Builds the export for the printer: the original first sheet with columns added at the end
 * ("Meesturen", "Volgnummer bpost", and after a submission also Mail ID and address as announced).
 * No row is removed or moved, blank rows included, so the original file, our data, the XML for
 * bpost and bpost's answer stay linked row by row. Other sheets are kept. Cell styling is not
 * (SheetJS Community Edition writes data only).
 *
 * @param input The original workbook (optional), the parsed rows, exclusions and optional announcement.
 * @returns The .xlsx bytes.
 * @example
 * const bytes = buildPrinterExport({ source: fileBytes, parsed, excludedRowNumbers: new Set([977]) })
 */
export function buildPrinterExport(input: PrinterExportInput): Uint8Array {
  const { parsed, excludedRowNumbers } = input
  let workbook: XLSX.WorkBook
  if (input.source) {
    const bytes = input.source instanceof ArrayBuffer ? new Uint8Array(input.source) : input.source
    workbook = XLSX.read(bytes, { type: 'array', dense: true, cellNF: true })
  } else {
    workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheetFromParsed(parsed), 'Blad1')
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = (sheet['!data'] ??= [])
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1')
  const includeCol = range.e.c + 1
  const seqCol = range.e.c + 2
  const withAnnounce = !!input.announced
  const midCol = withAnnounce ? seqCol + 1 : -1
  const announcedCol = withAnnounce ? seqCol + 2 : -1

  const taken = new Set((data[0] ?? []).map((cell) => String(cell?.v ?? '').trim()))
  const includeTitle = uniqueTitle(PRINTER_EXPORT_COLUMNS.include, taken)
  const seqTitle = uniqueTitle(PRINTER_EXPORT_COLUMNS.seq, new Set([...taken, includeTitle]))
  data[0] ??= []
  data[0][includeCol] = { t: 's', v: includeTitle }
  data[0][seqCol] = { t: 's', v: seqTitle }
  if (withAnnounce) {
    const midLabel = input.testMode ? 'Mail ID (TEST, niet drukken)' : PRINTER_EXPORT_COLUMNS.mid
    const midTitle = uniqueTitle(midLabel, new Set([...taken, includeTitle, seqTitle]))
    const announcedTitle = uniqueTitle(
      PRINTER_EXPORT_COLUMNS.announced,
      new Set([...taken, includeTitle, seqTitle, midTitle]),
    )
    data[0][midCol] = { t: 's', v: midTitle }
    data[0][announcedCol] = { t: 's', v: announcedTitle }
  }

  for (const rowNumber of parsed.rowNumbers) {
    const r = rowNumber - 1
    data[r] ??= []
    const excluded = excludedRowNumbers.has(rowNumber)
    data[r][includeCol] = { t: 's', v: excluded ? 'nee, uitgesloten' : 'ja' }
    if (!excluded) data[r][seqCol] = { t: 'n', v: rowNumber }
    if (withAnnounce) {
      const announced = !excluded ? input.announced!.get(rowNumber) : undefined
      data[r][midCol] = { t: 's', v: announced?.midNum ?? '' }
      data[r][announcedCol] = { t: 's', v: announced?.address ?? '' }
    }
  }

  range.e.c = withAnnounce ? announcedCol : seqCol
  range.e.r = Math.max(range.e.r, data.length - 1)
  sheet['!ref'] = XLSX.utils.encode_range(range)
  // The writer walks every row of the range: a blank row must be an empty array, not a hole.
  for (let r = 0; r <= range.e.r; r++) data[r] ??= []

  const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer
  return new Uint8Array(out)
}
