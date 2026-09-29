import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseExcelAddresses } from '@/core/masspost/excel'
import { mapRows } from '@/core/masspost/mapping'
import { CONTRAPUNT_EXPORT_COLUMN_MAPPING } from '@/core/masspost/presets/contrapunt-export'
import { CONTRAPUNT_TEST_ADRESSEN_XLSX } from '@/core/masspost/fixtures/contrapunt-sample'
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
  it('returns the Contrapunt fixture mapping for those headers, without AI', () => {
    const headers = [...CONTRAPUNT_HEADERS, 'Correspondentieadres - Land (Tekst)']
    const result = suggestColumnMapping({ headers })

    expect(result.mapping).toEqual(CONTRAPUNT_EXPORT_COLUMN_MAPPING)
    expect(result.confidence).toBe('high')
    expect(result.needsAi).toBe(false)
    expect(result.unmatchedHeaders).toEqual(['Correspondentieadres - Land (Tekst)'])
    expect(result.rationale['90']).toMatch(/Contrapunt/)
    expect(result.rationale['92']).toBeTruthy()
    expect(result.rationale['93']).toBeTruthy()
  })

  it('returns the same preset when presetId is contrapunt-export', () => {
    const result = suggestColumnMapping({
      headers: CONTRAPUNT_HEADERS,
      presetId: 'contrapunt-export',
    })

    expect(result.mapping).toEqual(CONTRAPUNT_EXPORT_COLUMN_MAPPING)
    expect(result.confidence).toBe('high')
    expect(result.needsAi).toBe(false)
    expect(result.unmatchedHeaders).toEqual([])
  })

  it('does not invent Contrapunt columns when the preset titles are absent', () => {
    const headers = ['Naam', 'Straat', 'Postcode', 'Plaats']
    const result = suggestColumnMapping({ headers, presetId: 'contrapunt-export' })
    const used = [
      ...result.mapping.name,
      ...result.mapping.streetHouseBox,
      ...result.mapping.postcodeCity,
    ]

    expect(used.every((column) => headers.includes(column))).toBe(true)
    expect(result.mapping).not.toEqual(CONTRAPUNT_EXPORT_COLUMN_MAPPING)
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

  it('does not mutate headers, the fixture, or row data passed alongside the suggestion', () => {
    const headers = [...CONTRAPUNT_HEADERS]
    const payload: SuggestColumnMappingInput & { rows: Record<string, string>[] } = {
      headers,
      rows: [{ Roepnaam: 'Anna', Familienaam: 'Vanderstappen' }],
    }
    const snapshot = structuredClone(payload)
    const fixtureBefore = structuredClone(CONTRAPUNT_EXPORT_COLUMN_MAPPING)

    const result = suggestColumnMapping(payload)
    result.mapping.name.push('Extra')

    expect(payload).toEqual(snapshot)
    expect(headers).toEqual(CONTRAPUNT_HEADERS)
    expect(CONTRAPUNT_EXPORT_COLUMN_MAPPING).toEqual(fixtureBefore)
  })

  it('leaves parsed sheet rows unchanged when the suggestion is later passed to mapRows', async () => {
    const buffer = readFileSync(CONTRAPUNT_TEST_ADRESSEN_XLSX)
    const parsed = await parseExcelAddresses(buffer)
    const before = structuredClone(parsed.rows[0])

    const result = suggestColumnMapping({ headers: parsed.headers })
    mapRows(parsed.rows.slice(0, 1), result.mapping)

    expect(result.mapping).toEqual(CONTRAPUNT_EXPORT_COLUMN_MAPPING)
    expect(result.needsAi).toBe(false)
    expect(result.unmatchedHeaders).toEqual(['Correspondentieadres - Land (Tekst)'])
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
})
