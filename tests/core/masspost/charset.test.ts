import { describe, it, expect } from 'vitest'
import {
  CHARACTER_REPLACEMENTS,
  findUnsupportedChars,
  normalizeForBpost,
  isBpostSafeCodePoint,
} from '@/core/masspost/charset'
import { mapRows } from '@/core/masspost/mapping'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
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
  it('transliterates letters without a decomposition (ł, đ, œ, ı)', () => {
    // ó is Latin-1 and stays, ź loses its accent, Ł has no decomposition and comes from the table.
    expect(normalizeForBpost('Łódź').text).toBe('Lódz')
    expect(normalizeForBpost('Đorđe Œuvre ılık').text).toBe('Dorde OEuvre ilik')
  })
  it('turns a bullet into a space', () => {
    expect(normalizeForBpost('Grote Markt 1 • 3de verdieping').text).toBe('Grote Markt 1   3de verdieping')
  })
  it('leaves characters it cannot fix so validation can report them', () => {
    expect(normalizeForBpost('Ωmega 😀').text).toBe('Ωmega 😀')
    expect(findUnsupportedChars(normalizeForBpost('Ωmega 😀').text)).toEqual(['Ω', '😀'])
  })
  it('exports every replacement so the documentation can list them', () => {
    expect(CHARACTER_REPLACEMENTS['ł']).toBe('l')
    expect(CHARACTER_REPLACEMENTS['’']).toBe("'")
    expect(CHARACTER_REPLACEMENTS['•']).toBe(' ')
  })
})

describe('mapRows charset handling', () => {
  const mapping = { name: ['N'], streetHouseBox: ['S'], postcodeCity: ['P'] }
  it('warns when characters were replaced or cannot be sent', () => {
    const { rows, warnings } = mapRows([{ N: 'D’Hooge', S: 'Ωmegastraat 1', P: '2000 Antwerpen' }], mapping)
    expect(rows[0].fields.name.value).toBe("D'Hooge")
    expect(warnings.some((w) => w.field === 'name' && w.message.includes('vervangen'))).toBe(true)
    expect(warnings.some((w) => w.field === 'streetHouseBox' && w.message.includes('niet aanvaardt'))).toBe(true)
  })
})

describe('pipeline charset guard', () => {
  async function xlsx(name: string) {
    return xlsxBuffer([['Naam', 'Straat', 'Postcode'], [name, 'Kerkstraat 10', '2000 Antwerpen']], 'A')
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
    const r = await convertExcelToMailingRequest(await xlsx('Ωukasz'), map, params, creds)
    expect(r.validation.valid).toBe(false)
    expect(r.xml).toBeUndefined()
    expect(r.validation.issues[0].message).toContain('Ω')
  })
})
