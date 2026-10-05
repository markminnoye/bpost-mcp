import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildAftExport } from '@/core/masspost/aft-export'
import { parseExcelAddresses } from '@/core/masspost/excel'
import type { ColumnMapping } from '@/core/masspost/mapping'
import { AFT_TEMPLATE_COLUMNS } from '@/core/masspost/presets/aft'
import { suggestColumnMapping } from '@/core/masspost/suggest-mapping'

const mapping: ColumnMapping = {
  name: ['Voornaam', 'Naam'],
  streetHouseBox: ['Straat', 'Nr'],
  postcodeCity: ['Postcode', 'Gemeente'],
  country: ['Land'],
}

const rows = [
  { Voornaam: 'An', Naam: 'Peeters', Straat: 'Kerkstraat', Nr: '4', Postcode: 9340, Gemeente: 'Lede', Land: 'België' },
  { Voornaam: 'Jan', Naam: '’t Hooft', Straat: 'Dorpsstraat', Nr: '12', Postcode: 9000, Gemeente: 'Gent', Land: '' },
  { Voornaam: 'Piet', Naam: 'Bakker', Straat: 'Prinsengracht', Nr: '263', Postcode: '1016 GV', Gemeente: 'Amsterdam', Land: 'Nederland' },
  { Voornaam: 'Eva', Naam: 'Claes', Straat: 'Markt', Nr: '1', Postcode: 1000, Gemeente: 'Brussel', Land: 'FR' },
]

function readBack(bytes: Uint8Array) {
  const workbook = XLSX.read(bytes, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return { names: workbook.SheetNames, table: XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) }
}

describe('buildAftExport', () => {
  it('writes Excel 97-2003 with the template columns in their order', () => {
    const bytes = buildAftExport({ rows, rowNumbers: [2, 3, 4, 5], mapping })
    // Compound File signature: an .xls, which the portal needs (it refuses .xlsx).
    expect([...bytes.slice(0, 4)]).toEqual([0xd0, 0xcf, 0x11, 0xe0])
    const workbook = XLSX.read(bytes, { type: 'array' })
    const [header] = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Sheet0, { header: 1 })
    expect(header).toEqual(AFT_TEMPLATE_COLUMNS)
  })

  it('fills SEQ with the row number, the unstructured blocks, the country abroad and PRIORITY', () => {
    const { table } = readBack(buildAftExport({ rows, rowNumbers: [2, 3, 4, 5], mapping }))
    expect(table.map((r) => r.SEQ)).toEqual([2, 3, 4, 5])
    expect(table[0]).toMatchObject({
      UNSTRUCTURED_NAME: 'An Peeters',
      UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX: 'Kerkstraat 4',
      UNSTRUCTURED_POST_CODE_CITY: '9340 Lede',
      COUNTRY_NAME: '',
      ISO_COUNTRY_CODE: '',
      PRIORITY: 'NP',
      FIRST_NAME: '',
    })
    expect(table[2].COUNTRY_NAME).toBe('Nederland')
    expect(table[3].ISO_COUNTRY_CODE).toBe('FR')
  })

  it('applies corrections, leaves excluded rows out and takes the priority', () => {
    const { table } = readBack(
      buildAftExport({
        rows,
        rowNumbers: [2, 3, 4, 5],
        mapping,
        corrections: new Map([[3, { name: "Jan 't Hooft" }]]),
        excludedRowNumbers: new Set([4]),
        priority: 'P',
      }),
    )
    expect(table.map((r) => r.SEQ)).toEqual([2, 3, 5])
    expect(table[1].UNSTRUCTURED_NAME).toBe("Jan 't Hooft")
    expect(table.every((r) => r.PRIORITY === 'P')).toBe(true)
  })

  it('is read back as an AFT file by the library itself', async () => {
    const parsed = await parseExcelAddresses(buildAftExport({ rows, rowNumbers: [2, 3, 4, 5], mapping }))
    expect(suggestColumnMapping({ headers: parsed.headers }).preset).toBe('aft')
    expect(parsed.rows).toHaveLength(4)
  })
})
