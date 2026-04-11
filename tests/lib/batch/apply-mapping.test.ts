import { describe, it, expect } from 'vitest'
import { applyMapping } from '@/lib/batch/apply-mapping'

describe('applyMapping', () => {
  it('maps flat fields directly (lang, priority, psCode)', () => {
    const raw = { Taal: 'nl', Prioriteit: 'NP' }
    const mapping = { Taal: 'lang', Prioriteit: 'priority' }
    const result = applyMapping(raw, mapping, 1)

    expect(result.lang).toBe('nl')
    expect(result.priority).toBe('NP')
  })

  it('auto-generates seq from rowIndex', () => {
    const raw = { Taal: 'nl', Prioriteit: 'NP' }
    const mapping = { Taal: 'lang', Prioriteit: 'priority' }

    expect(applyMapping(raw, mapping, 1).seq).toBe(1)
    expect(applyMapping(raw, mapping, 5).seq).toBe(5)
  })

  it('does not overwrite an explicitly mapped seq', () => {
    const raw = { SeqCol: '99', Taal: 'nl' }
    const mapping = { SeqCol: 'seq', Taal: 'lang' }
    const result = applyMapping(raw, mapping, 1)

    // Explicit mapping wins over auto-gen
    expect(result.seq).toBe('99')
  })

  it('aggregates Comps.<code> targets into nested Comps object', () => {
    const raw = {
      Voornaam: 'Jan',
      Familienaam: 'Janssen',
      Straatnaam: 'Kerkstraat',
      Huisnummer: '10',
      Postcode: '2000',
      Gemeente: 'Antwerpen',
    }
    const mapping = {
      Familienaam: 'Comps.1',
      Voornaam: 'Comps.2',
      Straatnaam: 'Comps.3',
      Huisnummer: 'Comps.4',
      Postcode: 'Comps.8',
      Gemeente: 'Comps.9',
    }
    const result = applyMapping(raw, mapping, 1)

    expect(result.Comps).toEqual({
      Comp: [
        { code: '1', value: 'Janssen' },
        { code: '2', value: 'Jan' },
        { code: '3', value: 'Kerkstraat' },
        { code: '4', value: '10' },
        { code: '8', value: '2000' },
        { code: '9', value: 'Antwerpen' },
      ],
    })
  })

  it('sorts Comp entries by numeric code', () => {
    const raw = { B: 'second', A: 'first' }
    const mapping = { B: 'Comps.10', A: 'Comps.2' }
    const result = applyMapping(raw, mapping, 1)

    expect(result.Comps.Comp[0].code).toBe('2')
    expect(result.Comps.Comp[1].code).toBe('10')
  })

  it('skips Comps entries with empty/undefined values', () => {
    const raw = { Naam: 'Jan', Bus: '' }
    const mapping = { Naam: 'Comps.1', Bus: 'Comps.5' }
    const result = applyMapping(raw, mapping, 1)

    expect(result.Comps.Comp).toHaveLength(1)
    expect(result.Comps.Comp[0]).toEqual({ code: '1', value: 'Jan' })
  })

  it('combines flat fields and Comps in one mapping', () => {
    const raw = { Taal: 'nl', Prioriteit: 'NP', Naam: 'Jan', Straat: 'Kerkstraat' }
    const mapping = {
      Taal: 'lang',
      Prioriteit: 'priority',
      Naam: 'Comps.1',
      Straat: 'Comps.3',
    }
    const result = applyMapping(raw, mapping, 1)

    expect(result.seq).toBe(1)
    expect(result.lang).toBe('nl')
    expect(result.priority).toBe('NP')
    expect(result.Comps.Comp).toEqual([
      { code: '1', value: 'Jan' },
      { code: '3', value: 'Kerkstraat' },
    ])
  })
})
