import { describe, it, expect } from 'vitest'
import { findUnsupportedChars, normalizeForBpost, isBpostSafeCodePoint } from '@/core/masspost/charset'
import { mapRows } from '@/core/masspost/mapping'
import ExcelJS from 'exceljs'
import { convertExcelToMailingRequest } from '@/core/masspost/pipeline'

describe('isBpostSafeCodePoint', () => {
  it('accepts ASCII, Latin-1 letters, HT/LF/CR', () => {
    for (const ch of ['A', 'z', '0', 'é', 'ü', 'ß', 'ÿ', ' ', '\t', '\n', '\r']) {
      expect(isBpostSafeCodePoint(ch.codePointAt(0)!)).toBe(true)
    }
  })
  it('rejects control characters, DEL, C1 range and anything above 0xFF', () => {
    for (const cp of [0x00, 0x08, 0x1f, 0x7f, 0x80, 0x9f, 0x100, 0x2019, 0x20ac]) {
      expect(isBpostSafeCodePoint(cp)).toBe(false)
    }
  })
})

describe('findUnsupportedChars', () => {
  it('returns distinct unsupported characters only', () => {
    expect(findUnsupportedChars('Kerkstraat 10 é ł ł Ω')).toEqual(['ł', 'Ω'])
    expect(findUnsupportedChars('Café Müller')).toEqual([])
  })
})

describe('normalizeForBpost', () => {
  it('swaps typographic characters and reports them', () => {
    const r = normalizeForBpost('D’Hooge – “Bakker” …')
    expect(r.text).toBe('D\'Hooge - "Bakker" ...')
    expect(r.replaced).toEqual(['’', '–', '“', '”', '…'])
  })
  it('drops accents on letters outside Latin-1 but keeps Latin-1 letters intact', () => {
    expect(normalizeForBpost('Kőrösi Zoë').text).toBe('Korösi Zoë')
  })
  it('leaves characters it cannot fix so validation can report them', () => {
    // ó is Latin-1 and stays, ź loses its accent, Ł has no decomposition and is left for validation.
    expect(normalizeForBpost('Łódź').text).toBe('Łódz')
    expect(findUnsupportedChars(normalizeForBpost('Łódź').text)).toEqual(['Ł'])
  })
})

describe('mapRows charset handling', () => {
  const mapping = { name: ['N'], streetHouseBox: ['S'], postcodeCity: ['P'] }
  it('warns when characters were replaced or cannot be sent', () => {
    const { rows, warnings } = mapRows([{ N: 'D’Hooge', S: 'Łódźstraat 1', P: '2000 Antwerpen' }], mapping)
    expect(rows[0].fields.name.value).toBe("D'Hooge")
    expect(warnings.some((w) => w.field === 'name' && w.message.includes('vervangen'))).toBe(true)
    expect(warnings.some((w) => w.field === 'streetHouseBox' && w.message.includes('niet aanvaardt'))).toBe(true)
  })
})

describe('pipeline charset guard', () => {
  async function xlsx(name: string) {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('A')
    ws.addRow(['Naam', 'Straat', 'Postcode'])
    ws.addRow([name, 'Kerkstraat 10', '2000 Antwerpen'])
    return Buffer.from(await wb.xlsx.writeBuffer())
  }
  const map = { name: ['Naam'], streetHouseBox: ['Straat'], postcodeCity: ['Postcode'] }
  const params = {
    mailingRef: 'TESTMAILING1', expectedDeliveryDate: '2026-10-01', format: 'Large' as const,
    priority: 'NP' as const, mode: 'T' as const, customerFileRef: 'CF1234', genMID: 'N' as const, genPSC: 'N' as const,
  }
  const creds = { customerId: '123456', accountId: '789', midVersion: '0100' as const }

  it('sends normalized text and produces XML that survives latin1 encoding', async () => {
    const r = await convertExcelToMailingRequest(await xlsx('D’Hooge'), map, params, creds)
    expect(r.validation.valid).toBe(true)
    expect(Buffer.from(r.xml!, 'latin1').toString('latin1')).toBe(r.xml)
    expect(r.xml).toContain('D&apos;Hooge')
  })

  it('refuses to build XML when a character cannot be represented in ISO-8859-1', async () => {
    const r = await convertExcelToMailingRequest(await xlsx('Łukasz'), map, params, creds)
    expect(r.validation.valid).toBe(false)
    expect(r.xml).toBeUndefined()
    expect(r.validation.issues[0].message).toContain('Ł')
  })
})
