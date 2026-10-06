import { describe, it, expect } from 'vitest'
import { isBelgianCountry, mapRows, UNSTRUCTURED_MAX_LENGTH } from '@/core/masspost/mapping'
import type { ColumnMapping } from '@/core/masspost/mapping'

const mapping: ColumnMapping = {
  name: ['Voornaam', 'Achternaam'],
  streetHouseBox: ['Straat', 'Nummer'],
  postcodeCity: ['Postcode', 'Gemeente'],
}

describe('mapRows', () => {
  it('joins multiple source columns with a space, like Contrapunt\'s own tool', () => {
    const rows = [
      { Voornaam: 'Jan', Achternaam: 'Janssens', Straat: 'Kerkstraat', Nummer: '10', Postcode: '2000', Gemeente: 'Antwerpen' },
    ]
    const { rows: mapped, warnings } = mapRows(rows, mapping)

    expect(mapped[0].fields.name.value).toBe('Jan Janssens')
    expect(mapped[0].fields.streetHouseBox.value).toBe('Kerkstraat 10')
    expect(mapped[0].fields.postcodeCity.value).toBe('2000 Antwerpen')
    expect(warnings).toHaveLength(0)
  })

  it('assigns ascending seq starting at 1', () => {
    const rows = [
      { Voornaam: 'A', Achternaam: '', Straat: 'S', Nummer: '1', Postcode: '1000', Gemeente: 'G' },
      { Voornaam: 'B', Achternaam: '', Straat: 'S', Nummer: '2', Postcode: '1000', Gemeente: 'G' },
    ]
    const { rows: mapped } = mapRows(rows, mapping)
    expect(mapped.map((r) => r.seq)).toEqual([1, 2])
  })

  it('strips pipe characters and collapses line breaks (AFT field separator safety)', () => {
    const rows = [
      { Voornaam: 'Jan|Piet', Achternaam: 'De\nVries', Straat: 'S', Nummer: '1', Postcode: '1000', Gemeente: 'G' },
    ]
    const { rows: mapped } = mapRows(rows, mapping)
    expect(mapped[0].fields.name.value).toBe('JanPiet De Vries')
  })

  it('reports truncation instead of silently cutting text off (unlike the reference tool)', () => {
    const longName = 'A'.repeat(60)
    const rows = [
      { Voornaam: longName, Achternaam: '', Straat: 'S', Nummer: '1', Postcode: '1000', Gemeente: 'G' },
    ]
    const { rows: mapped, warnings } = mapRows(rows, mapping)

    expect(mapped[0].fields.name.value).toHaveLength(UNSTRUCTURED_MAX_LENGTH)
    expect(mapped[0].fields.name.truncated).toBe(true)
    expect(warnings.some((w) => w.field === 'name' && w.message.includes('ingekort'))).toBe(true)
  })

  it('keeps a 43 to 50 character name intact, without a warning (SR-82)', () => {
    const name = 'Vereniging Natuur- en Vogelbescherming Kortrijk'
    expect(name.length).toBeGreaterThan(42)
    expect(name.length).toBeLessThanOrEqual(50)
    const rows = [
      { Voornaam: name, Achternaam: '', Straat: 'S', Nummer: '1', Postcode: '1000', Gemeente: 'G' },
    ]
    const { rows: mapped, warnings } = mapRows(rows, mapping)

    expect(mapped[0].fields.name.value).toBe(name)
    expect(mapped[0].fields.name.truncated).toBe(false)
    expect(warnings.filter((w) => w.field === 'name')).toHaveLength(0)
  })

  it('warns on empty required fields instead of silently accepting them', () => {
    const rows = [
      { Voornaam: '', Achternaam: '', Straat: '', Nummer: '', Postcode: '1000', Gemeente: 'G' },
    ]
    const { warnings } = mapRows(rows, mapping)

    expect(warnings.some((w) => w.field === 'name' && w.message.includes('leeg'))).toBe(true)
    expect(warnings.some((w) => w.field === 'streetHouseBox' && w.message.includes('leeg'))).toBe(true)
  })

  it('maps companyDepartment onto a separate field only when configured', () => {
    const rows = [
      { Voornaam: 'Jan', Achternaam: '', Straat: 'S', Nummer: '1', Postcode: '1000', Gemeente: 'G', Bedrijf: 'Acme' },
    ]
    const withCompany: ColumnMapping = { ...mapping, companyDepartment: ['Bedrijf'] }

    const withoutResult = mapRows(rows, mapping)
    const withResult = mapRows(rows, withCompany)

    expect(withoutResult.rows[0].fields.companyDepartment).toBeUndefined()
    expect(withResult.rows[0].fields.companyDepartment?.value).toBe('Acme')
  })
})

describe('mapRows: country and row numbers', () => {
  const withCountry: ColumnMapping = { ...mapping, country: ['Land'] }
  const row = { Voornaam: 'Pieter', Achternaam: 'Bakker', Straat: 'Heirstraat', Nummer: '21', Postcode: '6129 PK', Gemeente: 'Urmond', Land: 'Nederland' }

  it('maps the country column into its own field', () => {
    const { rows: mapped } = mapRows([row], withCountry)
    expect(mapped[0].fields.country?.value).toBe('Nederland')
  })

  it('uses the spreadsheet row number as seq when given, so gaps stay gaps', () => {
    const { rows: mapped } = mapRows([row, row], mapping, { rowNumbers: [2, 5] })
    expect(mapped.map((r) => r.seq)).toEqual([2, 5])
  })
})

describe('isBelgianCountry', () => {
  it('recognises Belgium in Dutch, French, German, English and as a code', () => {
    for (const value of ['België', 'Belgie', 'BELGIQUE', 'Belgien', 'Belgium', 'BE', ' be ']) {
      expect(isBelgianCountry(value), value).toBe(true)
    }
    for (const value of ['Nederland', 'NL', 'France', '', 'Bel']) {
      expect(isBelgianCountry(value), value).toBe(false)
    }
  })
})
