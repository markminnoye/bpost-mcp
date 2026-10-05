import { describe, it, expect } from 'vitest'
import {
  ABBREVIATIONS,
  checkFieldValue,
  findFormatIssues,
  missingTargets,
  proposeFieldValue,
} from '@/core/masspost/format-check'
import { UNSTRUCTURED_MAX_LENGTH } from '@/core/masspost/mapping'

describe('checkFieldValue', () => {
  it('accepts a normal address value', () => {
    expect(checkFieldValue('Kerkstraat 12 bus 3', 'streetHouseBox')).toEqual({ ok: true })
    expect(checkFieldValue('Café Müller', 'name')).toEqual({ ok: true })
  })

  it('flags an empty required field, but not an empty optional one', () => {
    expect(checkFieldValue('', 'name')).toMatchObject({ ok: false, kind: 'empty' })
    expect(checkFieldValue('   ', 'postcodeCity')).toMatchObject({ ok: false, kind: 'empty' })
    expect(checkFieldValue('', 'companyDepartment')).toEqual({ ok: true })
  })

  it('names the character bpost does not know', () => {
    const r = checkFieldValue('Jan ’t Hooft', 'name')
    expect(r).toMatchObject({ ok: false, kind: 'charset' })
    expect(!r.ok && r.message).toContain('’')
  })

  it('flags a pipe, a tab and a line break as charset problems', () => {
    expect(checkFieldValue('Kerkstraat 1|2', 'streetHouseBox')).toMatchObject({ kind: 'charset' })
    expect(checkFieldValue('Kerkstraat 1\tbus 2', 'streetHouseBox')).toMatchObject({ kind: 'charset' })
    expect(checkFieldValue('Kerkstraat 1\nbus 2', 'streetHouseBox')).toMatchObject({ kind: 'charset' })
  })

  it('flags a slash only in the street and postcode fields', () => {
    expect(checkFieldValue('Kerkstraat 12/3', 'streetHouseBox')).toMatchObject({ kind: 'slash' })
    expect(checkFieldValue('9000/Gent', 'postcodeCity')).toMatchObject({ kind: 'slash' })
    expect(checkFieldValue('Peeters/Janssens', 'name')).toEqual({ ok: true })
  })

  it('flags a value longer than 50 characters', () => {
    const r = checkFieldValue('x'.repeat(51), 'name')
    expect(r).toMatchObject({ ok: false, kind: 'tooLong' })
    expect(!r.ok && r.message).toContain('51')
    expect(checkFieldValue('x'.repeat(50), 'name')).toEqual({ ok: true })
  })
})

describe('checkFieldValue: country', () => {
  it('is optional, allows at most 42 characters and no slash rule', () => {
    expect(checkFieldValue('', 'country')).toEqual({ ok: true })
    expect(checkFieldValue('Nederland', 'country')).toEqual({ ok: true })
    expect(checkFieldValue('x'.repeat(43), 'country')).toMatchObject({ ok: false, kind: 'tooLong' })
    expect(checkFieldValue('Côte d’Ivoire', 'country')).toMatchObject({ ok: false, kind: 'charset' })
    expect(proposeFieldValue('Côte d’Ivoire', 'country')).toBe("Côte d'Ivoire")
  })
})

describe('proposeFieldValue', () => {
  it('swaps typographic characters', () => {
    expect(proposeFieldValue('Jan ’t Hooft', 'name')).toBe("Jan 't Hooft")
    expect(proposeFieldValue('Kerkstraat 12–14', 'streetHouseBox')).toBe('Kerkstraat 12-14')
    expect(proposeFieldValue('Ann‑Sofie Claes', 'name')).toBe('Ann-Sofie Claes')
  })

  it('removes a bullet and collapses the spaces around it', () => {
    expect(proposeFieldValue('Grote Markt 1 • 3de verdieping', 'streetHouseBox')).toBe(
      'Grote Markt 1 3de verdieping',
    )
  })

  it('transliterates ł and keeps Latin-1 letters', () => {
    expect(proposeFieldValue('Łukasz Wójcik', 'name')).toBe('Lukasz Wójcik')
  })

  it('has no proposal for a character without a safe equivalent', () => {
    expect(proposeFieldValue('Ωmega', 'name')).toBeUndefined()
  })

  it('replaces a pipe, a tab and a line break with a space', () => {
    expect(proposeFieldValue('Kerkstraat 1\nbus 2', 'streetHouseBox')).toBe('Kerkstraat 1 bus 2')
    expect(proposeFieldValue('Kerkstraat 1|2', 'streetHouseBox')).toBe('Kerkstraat 1 2')
  })

  it('writes a house number with a slash as "bus"', () => {
    expect(proposeFieldValue('Kerkstraat 12/3', 'streetHouseBox')).toBe('Kerkstraat 12 bus 3')
    expect(proposeFieldValue('Kerkstraat 12 / 3A', 'streetHouseBox')).toBe('Kerkstraat 12 bus 3A')
    expect(proposeFieldValue('9000/Gent', 'postcodeCity')).toBe('9000 Gent')
  })

  it('abbreviates until the value fits', () => {
    const name = proposeFieldValue('Vereniging voor Natuur- en Vogelbescherming Kortrijk vzw', 'name')
    expect(name).toBe('Ver. voor Natuur- en Vogelbescherming Kortrijk vzw')
    expect(name!.length).toBeLessThanOrEqual(UNSTRUCTURED_MAX_LENGTH)
    expect(
      proposeFieldValue('Burgemeester Edgard Van Hoorebekestraat 112 bus 0201', 'streetHouseBox'),
    ).toBe('Burg. Edgard Van Hoorebekestraat 112 bus 0201')
  })

  it('keeps the case style of the abbreviated word', () => {
    expect(
      proposeFieldValue('BURGEMEESTER EDGARD VAN HOOREBEKESTRAAT 112 BUS 0201', 'streetHouseBox'),
    ).toBe('BURG. EDGARD VAN HOOREBEKESTRAAT 112 BUS 0201')
  })

  it('only abbreviates whole words in the fields the abbreviation is meant for', () => {
    // "Koning" is a street prefix, not something to shorten in a family name.
    expect(proposeFieldValue('Familie De Koning-Vandenberghe met kinderen Lotte M.', 'name')).toBe(
      'Fam. De Koning-Vandenberghe met kinderen Lotte M.',
    )
  })

  it('has no proposal when the value is still too long after abbreviating', () => {
    expect(proposeFieldValue('x'.repeat(60), 'name')).toBeUndefined()
  })

  it('never abbreviates the postcode and municipality', () => {
    expect(proposeFieldValue('9100 Sint-Niklaas ' + 'Belsele '.repeat(5), 'postcodeCity')).toBeUndefined()
  })

  it('combines fixes and only returns a value that passes the check', () => {
    const p = proposeFieldValue('Burgemeester Edgard Van Hoorebekestraat 112/0201 – A', 'streetHouseBox')
    expect(p).toBe('Burg. Edgard Van Hoorebekestraat 112 bus 0201 - A')
    expect(checkFieldValue(p!, 'streetHouseBox')).toEqual({ ok: true })
  })

  it('has no proposal for an empty field', () => {
    expect(proposeFieldValue('', 'name')).toBeUndefined()
  })

  it('lists abbreviations as whole words with the fields they apply to', () => {
    for (const a of ABBREVIATIONS) {
      expect(a.full).toMatch(/^\p{L}[\p{L}-]*$/u)
      expect(a.short.length).toBeLessThan(a.full.length)
      expect(a.fields.length).toBeGreaterThan(0)
    }
  })
})

describe('findFormatIssues', () => {
  const mapping = {
    name: ['Voornaam', 'Achternaam'],
    streetHouseBox: ['Straat', 'Nr'],
    postcodeCity: ['Postcode', 'Gemeente'],
  }
  const rows = [
    { Voornaam: 'Jan', Achternaam: 'Peeters', Straat: 'Kerkstraat', Nr: 1, Postcode: 9340, Gemeente: 'Lede', Lid: 'A1' },
    { Voornaam: 'Lieve', Achternaam: 'D’Hondt', Straat: 'Kouterstraat', Nr: '12/3', Postcode: '', Gemeente: '', Lid: 'A2' },
    { Voornaam: 'Els', Achternaam: 'Martens', Straat: 'Dorp', Nr: 4, Postcode: 9300, Gemeente: 'Aalst', Lid: '' },
  ]

  it('reports one issue per field with the raw value, the proposal and the row context', () => {
    const issues = findFormatIssues(rows, mapping, { rowNumbers: [2, 3, 5], contextColumns: ['Lid'] })
    expect(issues.map((i) => [i.seq, i.rowNumber, i.field, i.kind])).toEqual([
      [3, 3, 'name', 'charset'],
      [3, 3, 'streetHouseBox', 'slash'],
      [3, 3, 'postcodeCity', 'empty'],
    ])
    expect(issues[0]).toMatchObject({
      original: 'Lieve D’Hondt',
      proposal: "Lieve D'Hondt",
      fields: { name: 'Lieve D’Hondt', streetHouseBox: 'Kouterstraat 12/3', postcodeCity: '' },
      context: { Lid: 'A2' },
    })
    expect(issues[2].proposal).toBeUndefined()
  })

  it('numbers rows from the second spreadsheet row when no row numbers are given', () => {
    const issues = findFormatIssues(rows, mapping)
    expect(issues[0].rowNumber).toBe(3)
    expect(issues[0].context).toEqual({})
  })

  it('checks the country field when a column is mapped to it', () => {
    const withCountry = { ...mapping, country: ['Lid'] }
    const issues = findFormatIssues([{ ...rows[0], Lid: 'x'.repeat(43) }], withCountry)
    expect(issues.map((i) => [i.field, i.kind])).toEqual([['country', 'tooLong']])
  })

  it('uses the row number as seq when row numbers are given', () => {
    const issues = findFormatIssues(rows, mapping, { rowNumbers: [2, 3, 5] })
    expect(issues.every((i) => i.seq === i.rowNumber)).toBe(true)
  })

  it('checks the optional company field only when a column is mapped to it', () => {
    const withCompany = { ...mapping, companyDepartment: ['Lid'] }
    const issues = findFormatIssues([{ ...rows[0], Lid: 'Afdeling ’t Veld' }], withCompany)
    expect(issues.map((i) => i.field)).toEqual(['companyDepartment'])
  })
})

describe('missingTargets', () => {
  it('lists the required blocks without a column', () => {
    expect(missingTargets({ name: ['N'], streetHouseBox: [], postcodeCity: ['P'] })).toEqual(['streetHouseBox'])
    expect(missingTargets({ name: ['N'], streetHouseBox: ['S'], postcodeCity: ['P'] })).toEqual([])
  })
})
