import type { Mailing, MailingSummary } from '@/core/masspost/store/mailing'
import type { MailingStore } from '@/core/masspost/store/mailing-store'
import { MAILING_FILES_DIR } from '@/core/masspost/store/mailing-store'
import { addressFileBaseName } from '@/core/masspost/address-file'
import type { Announced } from '@/core/masspost/printer-export'
import { saveFile } from './save-file'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * The name of an export without the extension of the address list, e.g. "Nieuwsbrief december".
 * @param fileName Name of the original file.
 * @returns The base name.
 */
export function exportBaseName(fileName: string): string {
  return addressFileBaseName(fileName)
}

/**
 * The Mail IDs and announced addresses of the last accepted submission, from its files in the store.
 * @param store The mailing store.
 * @param mailing The mailing.
 * @returns Per row number, and whether it was a test; undefined without an accepted submission.
 */
export async function announcedForMailing(
  store: MailingStore,
  mailing: Mailing,
): Promise<{ announced: Map<number, Announced>; testMode: boolean } | undefined> {
  const last = (mailing.exchanges ?? []).findLast((e) => e.kind === 'create' && e.state === 'processed')
  if (!last?.responseFile) return undefined
  const [request, response] = await Promise.all([
    store.getFile(mailing.id, MAILING_FILES_DIR + last.fileName),
    store.getFile(mailing.id, MAILING_FILES_DIR + last.responseFile),
  ])
  if (!request || !response) return undefined
  const [{ decodeLatin1, readRequestItems }, { parseBpostResponse }] = await Promise.all([
    import('@/core/masspost/request-file'),
    import('@/core/masspost/parse-response'),
  ])
  const read = async (b: Blob) => decodeLatin1(new Uint8Array(await b.arrayBuffer()))
  const items = readRequestItems(await read(request))
  const result = parseBpostResponse(await read(response))
  const mids = new Map(result.kind === 'ack' ? [] : result.items.map((i) => [i.seq, i.midNum]))
  const announced = new Map<number, Announced>()
  for (const [seq, f] of items) {
    announced.set(seq, {
      midNum: mids.get(seq),
      address: [f.name, f.companyDepartment, f.streetHouseBox, f.postcodeCity, f.country].filter(Boolean).join(', '),
    })
  }
  return { announced, testMode: last.mode !== 'P' }
}

/**
 * The file for the printer: the original file with "Meesturen" and "Volgnummer bpost" added
 * (`buildPrinterExport`), and after a submission also Mail ID and address as announced.
 * @param source The original Excel file.
 * @param excludedRows The excluded rows, by row number.
 * @param announce Optional announcement from the last accepted submission.
 * @returns The .xlsx bytes.
 */
export async function printerFile(
  source: ArrayBuffer,
  excludedRows: readonly number[],
  announce?: { announced: ReadonlyMap<number, Announced>; testMode: boolean },
): Promise<Uint8Array> {
  const [{ buildPrinterExport }, { parseExcelAddresses }] = await Promise.all([
    import('@/core/masspost/printer-export'),
    import('@/core/masspost/excel'),
  ])
  const parsed = await parseExcelAddresses(source)
  return buildPrinterExport({
    source,
    parsed,
    excludedRowNumbers: new Set(excludedRows),
    ...(announce ? { announced: announce.announced, testMode: announce.testMode } : {}),
  })
}

/**
 * Whether the file for the printer may be made: only after a successful submission (design 13/10,
 * decision 18), so Mail ID and address as announced are available.
 * @param m The row of the mailing.
 * @returns True when ready.
 */
export function printerReady(m: MailingSummary): boolean {
  return m.status === 'submitted'
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
  const announce = await announcedForMailing(store, mailing)
  const bytes = await printerFile(await source.arrayBuffer(), mailing.excludedRows, announce)
  saveFile(bytes, { name: `${exportBaseName(mailing.source.name)} - voor de drukker.xlsx`, mime: XLSX_MIME })
}
