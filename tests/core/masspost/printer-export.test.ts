import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcelAddresses } from '@/core/masspost/excel'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { buildPrinterExport, PRINTER_EXPORT_COLUMNS } from '@/core/masspost/printer-export'

function sheetRows(bytes: Uint8Array): unknown[][] {
  const workbook = XLSX.read(bytes, { type: 'array' })
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', blankrows: true })
}

describe('buildPrinterExport', () => {
  const source = xlsxBuffer([
    ['Naam', 'Straat', 'Postcode'],
    ['Jan', 'Kerkstraat 1', '9340 Lede'],
    [],
    ['Els', 'Dorp 4', '9300 Aalst'],
    ['Piet', 'Markt 2', '9000 Gent'],
  ])

  it('keeps every row of the original file in place and adds the export columns', async () => {
    const parsed = await parseExcelAddresses(source)
    const rows = sheetRows(buildPrinterExport({ source, parsed, excludedRowNumbers: new Set([4]) }))

    expect(rows[0]).toEqual(['Naam', 'Straat', 'Postcode', PRINTER_EXPORT_COLUMNS.include, PRINTER_EXPORT_COLUMNS.seq])
    expect(rows[1]).toEqual(['Jan', 'Kerkstraat 1', '9340 Lede', 'ja', 2])
    expect(rows[2]).toEqual(['', '', '', '', ''])
    expect(rows[3]).toEqual(['Els', 'Dorp 4', '9300 Aalst', 'nee, uitgesloten', ''])
    expect(rows[4]).toEqual(['Piet', 'Markt 2', '9000 Gent', 'ja', 5])
  })

  it('rebuilds the sheet from the parsed rows when there is no original file', async () => {
    const parsed = await parseExcelAddresses(source)
    const rows = sheetRows(buildPrinterExport({ parsed, excludedRowNumbers: new Set() }))

    expect(rows).toHaveLength(5)
    expect(rows[3]).toEqual(['Els', 'Dorp 4', '9300 Aalst', 'ja', 4])
  })

  it('does not overwrite a column that already has the same title', async () => {
    const own = xlsxBuffer([['Naam', 'Meesturen'], ['Jan', 'x']])
    const parsed = await parseExcelAddresses(own)
    const rows = sheetRows(buildPrinterExport({ source: own, parsed, excludedRowNumbers: new Set() }))

    expect(rows[0]).toEqual(['Naam', 'Meesturen', `${PRINTER_EXPORT_COLUMNS.include} (2)`, PRINTER_EXPORT_COLUMNS.seq])
    expect(rows[1]).toEqual(['Jan', 'x', 'ja', 2])
  })
})
