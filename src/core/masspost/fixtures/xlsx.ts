// src/core/masspost/fixtures/xlsx.ts
// Writes a plain workbook (one sheet, rows as arrays) with SheetJS, for tests and scripts.
// No cell styling: SheetJS Community Edition writes data, number formats and widths only.
import { writeFile } from 'node:fs/promises'
import * as XLSX from 'xlsx'

/**
 * One-sheet workbook from rows of cell values. The first row is usually the header.
 *
 * @param rows Cell values per row; `[]` gives a blank row.
 * @param sheetName Worksheet name. Default `Blad1`, as in Contrapunt's export.
 * @param bookType `xlsx` (default) or `xls` (Excel 97-2003).
 * @returns The workbook bytes.
 */
export function xlsxBuffer(rows: unknown[][], sheetName = 'Blad1', bookType: 'xlsx' | 'xls' = 'xlsx'): Buffer {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows, { dense: true }), sheetName)
  return XLSX.write(workbook, { type: 'buffer', bookType, compression: true })
}

/** Writes `xlsxBuffer(rows, sheetName)` to `filePath`. */
export async function writeXlsxFile(filePath: string, rows: unknown[][], sheetName = 'Blad1'): Promise<void> {
  await writeFile(filePath, xlsxBuffer(rows, sheetName))
}
