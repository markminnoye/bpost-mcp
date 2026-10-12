import { describe, it, expect } from 'vitest'
import { initialDraft, missingText, toDetails, withFile, withFormat } from '@/components/mailing-flow/import-draft'

const defaults = { format: 'Small', priority: 'NP', genMID: '7', genPSC: 'N', codePrefix: 'CP' } as const

describe('import draft', () => {
  it('starts from the tenant defaults and the proposed code', () => {
    expect(initialDraft(defaults, 'CP-2026-15')).toMatchObject({
      code: 'CP-2026-15',
      format: 'Small',
      genMID: '7',
      genPSC: 'N',
      title: '',
    })
  })

  it('takes the file name as title when the title is empty, but not over a typed title', () => {
    expect(withFile(initialDraft(defaults, 'X'), 'Nieuwsbrief december.xlsx', 800).title).toBe('Nieuwsbrief december')
    const typed = { ...initialDraft(defaults, 'X'), title: 'Mijn titel' }
    expect(withFile(typed, 'a.xlsx', 800).title).toBe('Mijn titel')
  })

  it('locks presort on for small format from 25,000 addresses', () => {
    expect(withFile(initialDraft(defaults, 'X'), 'a.xlsx', 25_000).genPSC).toBe('Y')
  })

  it('round and sequence: only large, default on from 10,000, until the user chooses', () => {
    const large = withFormat(initialDraft(defaults, 'X'), 'Large', null)
    expect(withFile(large, 'a.xlsx', 12_000).roundAndSequence).toBe(true)
    const chosen = { ...withFile(large, 'a.xlsx', 12_000), roundAndSequence: false, roundSequenceTouched: true }
    expect(withFile(chosen, 'b.xlsx', 20_000).roundAndSequence).toBe(false)
    expect(withFormat(chosen, 'Small', 20_000).roundAndSequence).toBe(false)
  })

  it('maps to the mailing details, trimming text', () => {
    const d = { ...initialDraft(defaults, 'CP-2026-1'), title: ' T ', customer: ' K ', expectedDeliveryDate: '2026-10-24' }
    expect(toDetails(d)).toEqual({
      code: 'CP-2026-1',
      title: 'T',
      customer: { name: 'K', crmId: null },
      expectedDeliveryDate: '2026-10-24',
      format: 'Small',
      priority: 'NP',
      genMID: '7',
      genPSC: 'N',
      roundAndSequence: false,
    })
  })

  it('says what is still missing in one sentence', () => {
    expect(missingText(['title', 'date', 'file'])).toBe('Nog nodig: een titel, een afgiftedatum, je adreslijst.')
    expect(missingText(['code'])).toBe('Nog nodig: een geldige code.')
    expect(missingText([])).toBe('')
  })
})
