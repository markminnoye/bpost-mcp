import { describe, it, expect } from 'vitest'
import { arrTone, filterMailings, statusLabel } from '@/components/mailings/labels'
import { summarize, type MailingSummary } from '@/core/masspost/store/mailing'
import { sampleMailing } from '../../core/masspost/store/fixtures'

const row = (over: Partial<MailingSummary> = {}): MailingSummary => ({ ...summarize(sampleMailing()), ...over })

describe('filterMailings', () => {
  it('matches code, title and customer, ignoring case and accents', () => {
    const items = [
      row({ id: '1', title: 'Nieuwsbrief café' }),
      row({ id: '2', code: 'CP-2026-2', title: 'Uitnodiging', customer: 'Harmonie' }),
    ]
    expect(filterMailings(items, 'CAFE').map((m) => m.id)).toEqual(['1'])
    expect(filterMailings(items, 'harm').map((m) => m.id)).toEqual(['2'])
    expect(filterMailings(items, 'cp-2026-2').map((m) => m.id)).toEqual(['2'])
    expect(filterMailings(items, '  ')).toHaveLength(2)
  })
})

describe('statusLabel and arrTone', () => {
  it('names the status, and a validated format', () => {
    expect(statusLabel(row({ status: 'uploaded' }))).toBe('Opgeladen · kolommen koppelen')
    expect(statusLabel(row({ status: 'format', formatIssuesOpen: 0 }))).toBe(
      'Formaatvalidatie · in orde, klaar voor adrescontrole',
    )
  })
  it('colours the ARR as in decision 21', () => {
    expect(arrTone(95.9)).toBe('red')
    expect(arrTone(96)).toBe('orange')
    expect(arrTone(97.99)).toBe('orange')
    expect(arrTone(98)).toBe('green')
  })
})

describe('dates and percentages', () => {
  it('formats a delivery date short and long, in Flemish', async () => {
    const { shortDate, longDate, formatPercent } = await import('@/components/mailings/labels')
    expect(shortDate('2026-10-04')).toBe('4 okt')
    expect(longDate('2026-10-04')).toBe('4 oktober 2026')
    expect(formatPercent(97.24)).toBe('97,2 %')
  })
})
