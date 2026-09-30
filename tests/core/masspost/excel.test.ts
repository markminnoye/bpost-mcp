import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { parseExcelAddresses, ExcelParseError } from '@/core/masspost/excel'

async function buildFixture(headers: string[], rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Adressen')
  sheet.addRow(headers)
  rows.forEach((row) => sheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

describe('parseExcelAddresses', () => {
  it('reads headers and rows from the first worksheet', async () => {
    const buffer = await buildFixture(
      ['Naam', 'Adres', 'Postcode'],
      [
        ['Jan Janssens', 'Kerkstraat 10', '2000 Antwerpen'],
        ['Marie Peeters', 'Dorpsstraat 3', '9000 Gent'],
      ],
    )

    const { headers, rows } = await parseExcelAddresses(buffer)

    expect(headers).toEqual(['Naam', 'Adres', 'Postcode'])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ Naam: 'Jan Janssens', Adres: 'Kerkstraat 10', Postcode: '2000 Antwerpen' })
  })

  it('skips fully blank rows', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Adressen')
    sheet.addRow(['Naam', 'Adres'])
    sheet.addRow(['Jan', 'Straat 1'])
    sheet.addRow([]) // blank
    sheet.addRow(['Marie', 'Straat 2'])
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    const { rows } = await parseExcelAddresses(buffer)
    expect(rows).toHaveLength(2)
  })

  it('rejects a file with no header row content', async () => {
    const workbook = new ExcelJS.Workbook()
    workbook.addWorksheet('Leeg')
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer())

    await expect(parseExcelAddresses(buffer)).rejects.toThrow(ExcelParseError)
  })

  it('rejects a file that is not a valid xlsx', async () => {
    const buffer = Buffer.from('dit is geen excel-bestand')
    await expect(parseExcelAddresses(buffer)).rejects.toThrow(ExcelParseError)
  })
})
