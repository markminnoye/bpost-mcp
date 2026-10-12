import type { MailingSummary } from '@/core/masspost/store/mailing'
import type { MailingStore } from '@/core/masspost/store/mailing-store'
import { saveFile } from './save-file'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * The name of an export without the Excel extension, e.g. "Nieuwsbrief december".
 * @param fileName Name of the original file.
 * @returns The base name.
 */
export function exportBaseName(fileName: string): string {
  return fileName.replace(/\.xlsx?$/i, '')
}

/**
 * The file for the printer: the original file with "Meesturen" and "Volgnummer bpost" added
 * (`buildPrinterExport`). Used by step 4 and by the "…" menu in the list, so both give the same file.
 * @param source The original Excel file.
 * @param excludedRows The excluded rows, by row number.
 * @returns The .xlsx bytes.
 */
export async function printerFile(source: ArrayBuffer, excludedRows: readonly number[]): Promise<Uint8Array> {
  const [{ buildPrinterExport }, { parseExcelAddresses }] = await Promise.all([
    import('@/core/masspost/printer-export'),
    import('@/core/masspost/excel'),
  ])
  const parsed = await parseExcelAddresses(source)
  return buildPrinterExport({ source, parsed, excludedRowNumbers: new Set(excludedRows) })
}

/**
 * Whether the file for the printer may be made: only once the format is in order, as step 4 in the
 * flow (Mark, 12/10). Before that, rows that still have to be excluded would go to the printer.
 * @param m The row of the mailing.
 * @returns True when ready.
 */
export function printerReady(m: MailingSummary): boolean {
  return m.formatIssuesOpen === 0
}

/**
 * Saves the file for the printer of a stored mailing, from the Excel file and the exclusions in the
 * store. Nothing is uploaded.
 * @param store The mailing store.
 * @param id The mailing.
 */
export async function savePrinterFileForMailing(store: MailingStore, id: string): Promise<void> {
  const mailing = await store.get(id)
  const source = mailing && (await store.getSourceFile(id))
  if (!mailing || !source) throw new Error('Mailing or source file not found')
  const bytes = await printerFile(await source.arrayBuffer(), mailing.excludedRows)
  saveFile(bytes, { name: `${exportBaseName(mailing.source.name)} - voor de drukker.xlsx`, mime: XLSX_MIME })
}
