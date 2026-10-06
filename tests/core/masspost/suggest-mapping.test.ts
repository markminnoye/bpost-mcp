import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseExcelAddresses } from '@/core/masspost/excel'
import { mapRows } from '@/core/masspost/mapping'
import { CONTRAPUNT_SAMPLE_COLUMN_MAPPING, CONTRAPUNT_TEST_ADRESSEN_XLSX } from '@/core/masspost/fixtures/contrapunt-sample'
import { suggestColumnMapping } from '@/core/masspost/suggest-mapping'
import type { SuggestColumnMappingInput } from '@/core/masspost/suggest-mapping'

const CONTRAPUNT_HEADERS = [
  'Roepnaam',
  'Familienaam',
  'Correspondentieadres - Straat (Key)',
  'Correspondentieadres - Huisnummer (Key)',
  'Correspondentieadres - aanv. huisnr. (Key)',
  'Correspondentieadres - Postcode (Key)',
  'Correspondentieadres - Plaats (Key)',
]

describe('suggestColumnMapping', () => {
  it('maps the titles of the Contrapunt sample with synonyms, without a preset or AI', () => {
    const headers = [...CONTRAPUNT_HEADERS, 'Correspondentieadres - Land (Tekst)']
    const result = suggestColumnMapping({ headers })

    expect(result.mapping).toEqual({ ...CONTRAPUNT_SAMPLE_COLUMN_MAPPING, country: ['Correspondentieadres - Land (Tekst)'] })
    expect(result.preset).toBeUndefined()
    expect(result.confidence).toBe('high')
    expect(result.needsAi).toBe(false)
    expect(result.unmatchedHeaders).toEqual([])
    expect(result.rationale['90']).toContain('Roepnaam')
    expect(result.rationale['92']).toBeTruthy()
    expect(result.rationale['93']).toBeTruthy()
  })

  it('only uses columns that are in the file', () => {
    const headers = ['Naam', 'Straat', 'Postcode', 'Plaats']
    const result = suggestColumnMapping({ headers })
    const used = [
      ...result.mapping.name,
      ...result.mapping.streetHouseBox,
      ...result.mapping.postcodeCity,
    ]

    expect(used.every((column) => headers.includes(column))).toBe(true)
    expect(result.preset).toBeUndefined()
    expect(result.needsAi).toBe(false)
  })

  it('maps Dutch synonyms in name, street, postcode order', () => {
    const result = suggestColumnMapping({
      headers: ['Familienaam', 'Roepnaam', 'Huisnummer', 'Straat', 'Plaats', 'Postcode', 'Email'],
    })

    expect(result.mapping).toEqual({
      name: ['Roepnaam', 'Familienaam'],
      streetHouseBox: ['Straat', 'Huisnummer'],
      postcodeCity: ['Postcode', 'Plaats'],
    })
    expect(result.confidence).toBe('high')
    expect(result.needsAi).toBe(false)
    expect(result.unmatchedHeaders).toEqual(['Email'])
    expect(result.rationale['90']).toContain('Roepnaam')
  })

  it('maps English synonyms', () => {
    const result = suggestColumnMapping({
      headers: ['Last name', 'First name', 'House number', 'Street', 'City', 'Postal code'],
      localeHints: ['en'],
    })

    expect(result.mapping).toEqual({
      name: ['First name', 'Last name'],
      streetHouseBox: ['Street', 'House number'],
      postcodeCity: ['Postal code', 'City'],
    })
    expect(result.confidence).toBe('high')
    expect(result.needsAi).toBe(false)
  })

  it('maps French synonyms', () => {
    const result = suggestColumnMapping({
      headers: ['Nom', 'Prénom', 'Numéro', 'Rue', 'Ville', 'Code postal'],
      localeHints: ['fr'],
    })

    expect(result.mapping).toEqual({
      name: ['Prénom', 'Nom'],
      streetHouseBox: ['Rue', 'Numéro'],
      postcodeCity: ['Code postal', 'Ville'],
    })
    expect(result.confidence).toBe('high')
    expect(result.needsAi).toBe(false)
  })

  it('maps French box headers (boîte, bte) onto the street block (SR-83)', () => {
    const result = suggestColumnMapping({
      headers: ['Nom', 'Rue', 'Boîte', 'Code postal', 'Ville'],
      localeHints: ['fr'],
    })
    expect(result.mapping.streetHouseBox).toEqual(['Rue', 'Boîte'])

    const abbrev = suggestColumnMapping({
      headers: ['Nom', 'Rue', 'Bte', 'Code postal', 'Ville'],
      localeHints: ['fr'],
    })
    expect(abbrev.mapping.streetHouseBox).toEqual(['Rue', 'Bte'])
  })

  it('maps an optional company column without requiring it', () => {
    const result = suggestColumnMapping({
      headers: ['Naam', 'Bedrijf', 'Straat', 'Postcode', 'Plaats'],
    })

    expect(result.mapping.companyDepartment).toEqual(['Bedrijf'])
    expect(result.needsAi).toBe(false)
    expect(result.confidence).toBe('high')
    expect(result.rationale['91']).toContain('Bedrijf')
  })

  it('marks a fuzzy but complete mapping as medium and does not ask for AI', () => {
    const result = suggestColumnMapping({
      headers: ['Naam', 'Straat', 'Postcde', 'Plaats'],
    })

    expect(result.mapping.postcodeCity).toEqual(['Postcde', 'Plaats'])
    expect(result.confidence).toBe('medium')
    expect(result.needsAi).toBe(false)
  })

  it('asks for AI when a required target is missing', () => {
    const result = suggestColumnMapping({ headers: ['Naam', 'Straat'] })

    expect(result.mapping).toEqual({
      name: ['Naam'],
      streetHouseBox: ['Straat'],
      postcodeCity: [],
    })
    expect(result.confidence).toBe('low')
    expect(result.needsAi).toBe(true)
    expect(result.rationale['93']).toMatch(/Geen kolom/)
  })

  it('asks for AI when no header is recognized', () => {
    const headers = ['Kolom A', 'Kolom B', 'Kolom C']
    const result = suggestColumnMapping({ headers })

    expect(result.mapping).toEqual({ name: [], streetHouseBox: [], postcodeCity: [] })
    expect(result.unmatchedHeaders).toEqual(headers)
    expect(result.confidence).toBe('low')
    expect(result.needsAi).toBe(true)
  })

  it('does not mutate headers or row data passed alongside the suggestion', () => {
    const headers = [...CONTRAPUNT_HEADERS]
    const payload: SuggestColumnMappingInput & { rows: Record<string, string>[] } = {
      headers,
      rows: [{ Roepnaam: 'Anna', Familienaam: 'Vanderstappen' }],
    }
    const snapshot = structuredClone(payload)

    suggestColumnMapping(payload)

    expect(payload).toEqual(snapshot)
    expect(headers).toEqual(CONTRAPUNT_HEADERS)
  })

  it('leaves parsed sheet rows unchanged when the suggestion is later passed to mapRows', async () => {
    const buffer = readFileSync(CONTRAPUNT_TEST_ADRESSEN_XLSX)
    const parsed = await parseExcelAddresses(buffer)
    const before = structuredClone(parsed.rows[0])

    const result = suggestColumnMapping({ headers: parsed.headers })
    mapRows(parsed.rows.slice(0, 1), result.mapping)

    expect(result.mapping).toEqual({ ...CONTRAPUNT_SAMPLE_COLUMN_MAPPING, country: ['Correspondentieadres - Land (Tekst)'] })
    expect(result.needsAi).toBe(false)
    expect(result.unmatchedHeaders).toEqual([])
    expect(parsed.rows[0]).toEqual(before)
  })

  it('stays free of Next.js and AI imports in src/core/masspost', () => {
    const dir = path.join(process.cwd(), 'src/core/masspost')
    const files = readdirSync(dir).filter((file) => file.endsWith('.ts'))
    for (const file of files) {
      const source = readFileSync(path.join(dir, file), 'utf8')
      expect(source, file).not.toMatch(/from\s+['"]next/)
      expect(source, file).not.toMatch(/from\s+['"]ai['"]/)
      expect(source, file).not.toMatch(/@ai-sdk\//)
    }
  })

  it('maps a country column, by name or by code, never into the name', () => {
    const byName = suggestColumnMapping({ headers: ['Naam', 'Straat', 'Postcode', 'Gemeente', 'Land'] })
    expect(byName.mapping.country).toEqual(['Land'])
    expect(byName.mapping.name).toEqual(['Naam'])

    const both = suggestColumnMapping({ headers: ['Name', 'Street', 'Zip', 'City', 'ISO_COUNTRY_CODE', 'COUNTRY_NAME'] })
    expect(both.mapping.country).toEqual(['COUNTRY_NAME'])
    expect(both.mapping.name).toEqual(['Name'])

    const fr = suggestColumnMapping({ headers: ['Nom', 'Rue', 'Code postal', 'Localité', 'Pays'] })
    expect(fr.mapping.country).toEqual(['Pays'])
  })

  it('recognises the Address File Tool layout in both spellings bpost uses', () => {
    const template = ['SEQ', 'FIRST_NAME', 'LAST_NAME', 'ADDRESS_LINE_1', 'POSTAL_CODE', 'CITY', 'ISO_COUNTRY_CODE', 'COUNTRY_NAME',
      'UNSTRUCTURED_NAME', 'UNSTRUCTURED_COMPANY_DEPARTMENT', 'UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX', 'UNSTRUCTURED_POST_CODE_CITY', 'PRIORITY']
    const result = suggestColumnMapping({ headers: template })
    expect(result.preset).toBe('aft')
    expect(result.confidence).toBe('high')
    expect(result.mapping).toEqual({
      name: ['UNSTRUCTURED_NAME'],
      companyDepartment: ['UNSTRUCTURED_COMPANY_DEPARTMENT'],
      streetHouseBox: ['UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX'],
      postcodeCity: ['UNSTRUCTURED_POST_CODE_CITY'],
      country: ['COUNTRY_NAME'],
    })

    const guide = ['SEQ', 'NAME_UNSTRUCTURED', 'COMPANY_DEPARTMENT_BUILDING_UNSTRUCTURED', 'STREET_HOUSE_BUILDING_UNSTRUCTURED',
      'POSTCODE_CITY_UNSTRUCTURED', 'COUNTRYISOCODE', 'COUNTRYNAME', 'PRIORITY']
    expect(suggestColumnMapping({ headers: guide }).mapping).toEqual({
      name: ['NAME_UNSTRUCTURED'],
      companyDepartment: ['COMPANY_DEPARTMENT_BUILDING_UNSTRUCTURED'],
      streetHouseBox: ['STREET_HOUSE_BUILDING_UNSTRUCTURED'],
      postcodeCity: ['POSTCODE_CITY_UNSTRUCTURED'],
      country: ['COUNTRYNAME'],
    })
  })

  it('does not report a preset for an ordinary layout', () => {
    expect(suggestColumnMapping({ headers: ['Naam', 'Straat', 'Postcode'] }).preset).toBeUndefined()
  })
})

