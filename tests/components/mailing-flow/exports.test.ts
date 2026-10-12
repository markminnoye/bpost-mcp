import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { summarize } from '@/core/masspost/store/mailing'
import { exportBaseName, printerFile, printerReady } from '@/components/mailing-flow/exports'
import { sampleMailing } from '../../core/masspost/store/fixtures'

function sheetRows(bytes: Uint8Array): unknown[][] {
  const workbook = XLSX.read(bytes, { type: 'array' })
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', blankrows: true })
}

describe('printerFile', () => {
  it('marks the excluded rows of the mailing, from the stored Excel file', async () => {
    const source = new Uint8Array(
      xlsxBuffer([
        ['Naam', 'Straat', 'Postcode'],
        ['Jan', 'Kerkstraat 1', '9340 Lede'],
        ['Els', 'Dorp 4', '9300 Aalst'],
      ]),
    ).buffer
    const rows = sheetRows(await printerFile(source, [3]))
    expect(rows[1].slice(-2)).toEqual(['ja', 2])
    expect(rows[2].slice(-2)).toEqual(['nee, uitgesloten', ''])
  })
})

describe('printerReady', () => {
  it('only once the format is in order, as step 4 in the flow', () => {
    const row = (over: Parameters<typeof sampleMailing>[0]) => summarize(sampleMailing(over))
    expect(printerReady(row({ status: 'uploaded', counts: { addresses: 10, formatIssuesOpen: null } }))).toBe(false)
    expect(printerReady(row({ status: 'format', counts: { addresses: 10, formatIssuesOpen: 3 } }))).toBe(false)
    expect(printerReady(row({ status: 'format', counts: { addresses: 10, formatIssuesOpen: 0 } }))).toBe(true)
  })
})

describe('exportBaseName', () => {
  it('drops the Excel extension', () => {
    expect(exportBaseName('Nieuwsbrief december.xlsx')).toBe('Nieuwsbrief december')
    expect(exportBaseName('oud.XLS')).toBe('oud')
  })
})
