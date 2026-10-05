import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseExcelAddresses, ExcelParseError } from '@/core/masspost/excel'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { CONTRAPUNT_AFT_200_XLS, CONTRAPUNT_TEST_ADRESSEN_XLSX } from '@/core/masspost/fixtures/contrapunt-sample'

describe('parseExcelAddresses', () => {
  it('reads headers and rows from the first worksheet', async () => {
    const buffer = xlsxBuffer([
      ['Naam', 'Adres', 'Postcode'],
      ['Jan Janssens', 'Kerkstraat 10', '2000 Antwerpen'],
      ['Marie Peeters', 'Dorpsstraat 3', '9000 Gent'],
    ])

    const { headers, rows } = await parseExcelAddresses(buffer)

    expect(headers).toEqual(['Naam', 'Adres', 'Postcode'])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ Naam: 'Jan Janssens', Adres: 'Kerkstraat 10', Postcode: '2000 Antwerpen' })
  })

  it('keeps numbers as numbers and empty cells as empty strings', async () => {
    const buffer = xlsxBuffer([
      ['Naam', 'Nummer', 'Bus', 'Postcode'],
      ['Jan', 12, '', 9340],
    ])

    const { rows } = await parseExcelAddresses(buffer)

    expect(rows[0]).toEqual({ Naam: 'Jan', Nummer: 12, Bus: '', Postcode: 9340 })
  })

  it('returns dates as ISO strings', async () => {
    const buffer = xlsxBuffer([
      ['Naam', 'Lid sinds'],
      ['Jan', new Date(Date.UTC(2024, 0, 15))],
    ])

    const { rows } = await parseExcelAddresses(buffer)

    expect(String(rows[0]['Lid sinds'])).toMatch(/^2024-01-1[45]T/)
  })

  it('maps each value to its own column when a header cell is empty', async () => {
    const buffer = xlsxBuffer([
      ['Naam', '', 'Straat'],
      ['Jan', 'genegeerd', 'Kerkstraat 1'],
    ])

    const { headers, rows } = await parseExcelAddresses(buffer)

    expect(headers).toEqual(['Naam', 'Straat'])
    expect(rows[0]).toEqual({ Naam: 'Jan', Straat: 'Kerkstraat 1' })
  })

  it('skips fully blank rows', async () => {
    const buffer = xlsxBuffer([['Naam', 'Adres'], ['Jan', 'Straat 1'], [], ['Marie', 'Straat 2']])

    const { rows } = await parseExcelAddresses(buffer)
    expect(rows).toHaveLength(2)
  })

  it('accepts an ArrayBuffer, as a browser File gives it', async () => {
    const buffer = xlsxBuffer([['Naam', 'Adres'], ['Jan', 'Straat 1']])
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

    const { headers, rows } = await parseExcelAddresses(arrayBuffer)

    expect(headers).toEqual(['Naam', 'Adres'])
    expect(rows).toEqual([{ Naam: 'Jan', Adres: 'Straat 1' }])
  })

  it('returns the spreadsheet row number of every address, skipping blank rows', async () => {
    const buffer = xlsxBuffer([['Naam', 'Adres'], ['Jan', 'Straat 1'], ['Piet', 'Straat 2'], [], ['Marie', 'Straat 3']])

    const { rows, rowNumbers } = await parseExcelAddresses(buffer)

    expect(rows).toHaveLength(3)
    expect(rowNumbers).toEqual([2, 3, 5])
  })

  it('reads an Excel 97-2003 (.xls) workbook', async () => {
    const buffer = xlsxBuffer([['Naam', 'Adres'], ['Jan', 'Straat 1']], 'Blad1', 'xls')

    const { headers, rows } = await parseExcelAddresses(buffer)

    expect(headers).toEqual(['Naam', 'Adres'])
    expect(rows).toEqual([{ Naam: 'Jan', Adres: 'Straat 1' }])
  })

  it('reads the Address File Tool sample (.xls) and the Contrapunt export (.xlsx)', async () => {
    const aft = await parseExcelAddresses(readFileSync(CONTRAPUNT_AFT_200_XLS))
    expect(aft.headers.slice(0, 3)).toEqual(['SEQ', 'GREETING', 'FIRST_NAME'])
    expect(aft.rows).toHaveLength(200)

    const crm = await parseExcelAddresses(readFileSync(CONTRAPUNT_TEST_ADRESSEN_XLSX))
    expect(crm.headers[0]).toBe('Roepnaam')
    expect(crm.rows).toHaveLength(789)
  })

  it('rejects a file with no header row content', async () => {
    const buffer = xlsxBuffer([[], ['', 'Jan']], 'Leeg')

    await expect(parseExcelAddresses(buffer)).rejects.toThrow(ExcelParseError)
  })

  it('rejects a file that is not an Excel workbook, such as plain text or CSV', async () => {
    await expect(parseExcelAddresses(Buffer.from('dit is geen excel-bestand'))).rejects.toThrow(ExcelParseError)
    await expect(parseExcelAddresses(Buffer.from('Naam;Straat\nJan;Kerkstraat 1'))).rejects.toThrow(
      ExcelParseError,
    )
  })

  it('rejects a zip file that is not a workbook', async () => {
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00])
    await expect(parseExcelAddresses(zip)).rejects.toThrow(ExcelParseError)
  })
})
