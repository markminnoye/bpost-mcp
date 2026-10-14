import { describe, it, expect } from 'vitest'
import {
  mailingSchema,
  summarize,
  sortMailings,
  isValidMailingCode,
  defaultCodePrefix,
  nextMailingCode,
  presortLocked,
  roundSequenceAllowed,
  defaultRoundSequence,
  missingDetails,
  keepCorrections,
  belgianPublicHolidays,
  isBpostWorkingDay,
  type MailingSummary,
} from '@/core/masspost/store/mailing'
import { sampleMailing } from './fixtures'
import { isWaiting, modeOf, notifyEmailOf, type Exchange } from '@/core/masspost/store/mailing'

function row(over: Partial<MailingSummary>): MailingSummary {
  return { ...summarize(sampleMailing()), ...over }
}

describe('notifyEmailOf', () => {
  it('uses the mailing address when set (also when empty), otherwise the tenant default', () => {
    expect(notifyEmailOf({}, 'a@x.be')).toBe('a@x.be')
    expect(notifyEmailOf({ notifyEmail: ' b@y.be ' }, 'a@x.be')).toBe('b@y.be')
    expect(notifyEmailOf({ notifyEmail: '' }, 'a@x.be')).toBe('')
    expect(notifyEmailOf({ notifyEmail: undefined }, 'a@x.be')).toBe('a@x.be')
  })
})

describe('summarize', () => {
  it('keeps a mailing "mapped" while format errors are open, and "format" once validated', () => {
    const at = (formatIssuesOpen: number | null) =>
      summarize(sampleMailing({ status: 'format', counts: { addresses: 100, formatIssuesOpen } })).status
    expect(at(3)).toBe('mapped')
    expect(at(0)).toBe('format')
    expect(at(null)).toBe('format')
  })
})

describe('summarize, counts of the pills', () => {
  it('gives the rows left out and the addresses abroad (null while not counted)', () => {
    const m = sampleMailing({ excludedRows: [3, 9], counts: { addresses: 100, formatIssuesOpen: 0, foreign: 4 } })
    expect(summarize(m)).toMatchObject({ addresses: 100, excluded: 2, foreign: 4, genPSC: 'N', roundAndSequence: false })
    expect(summarize(sampleMailing()).foreign).toBeNull()
    expect(summarize(sampleMailing({ genPSC: 'Y', roundAndSequence: true }))).toMatchObject({
      genPSC: 'Y',
      roundAndSequence: true,
    })
  })
})

describe('sortMailings by status', () => {
  it('puts a mapped mailing with format errors open with those that need action', () => {
    const waiting = row({ id: 'a', status: 'mapped', formatIssuesOpen: null, expectedDeliveryDate: '2026-10-01' })
    const open = row({ id: 'b', status: 'mapped', formatIssuesOpen: 3, expectedDeliveryDate: '2026-11-01' })
    expect(sortMailings([waiting, open], 'status').map((r) => r.id)).toEqual(['b', 'a'])
  })
})

describe('sortMailings by status, within a group', () => {
  it('keeps the same status together and then goes by date', () => {
    const r = (id: string, status: MailingSummary['status'], date: string, open: number | null = 0) =>
      row({ id, status, formatIssuesOpen: open, expectedDeliveryDate: date })
    const rows = [
      r('f1', 'format', '2026-10-01'),
      r('m2', 'mapped', '2026-10-09', 4),
      r('f2', 'format', '2026-10-03'),
      r('m1', 'mapped', '2026-10-05', 4),
    ]
    expect(sortMailings(rows, 'status').map((x) => x.id)).toEqual(['m1', 'm2', 'f1', 'f2'])
  })
})

describe('mailingSchema', () => {
  it('accepts a complete mailing', () => {
    expect(mailingSchema.safeParse(sampleMailing()).success).toBe(true)
  })
  it('rejects an unknown schema version and a bad code', () => {
    expect(mailingSchema.safeParse({ ...sampleMailing(), schemaVersion: 2 }).success).toBe(false)
    expect(mailingSchema.safeParse(sampleMailing({ code: 'CP 2026/15' })).success).toBe(false)
  })
})

describe('sortMailings', () => {
  const a = row({ id: 'a', status: 'format', expectedDeliveryDate: '2026-11-01', code: 'CP-2026-3', title: 'b' })
  const b = row({ id: 'b', status: 'mapped', expectedDeliveryDate: '2026-10-20', code: 'CP-2026-12', title: 'a' })
  const c = row({ id: 'c', status: 'uploaded', expectedDeliveryDate: '2026-10-25', code: 'CP-2026-2', title: 'c' })
  const d = row({ id: 'd', status: 'done', expectedDeliveryDate: '2026-10-01', code: 'CP-2025-40', title: 'd' })
  const e = row({ id: 'e', status: 'submitted', expectedDeliveryDate: '2026-10-30', code: 'CP-2026-1', title: 'e' })

  it('status: action first, then waiting, then done; submitted before done; earliest date first', () => {
    expect(sortMailings([d, e, b, a, c], 'status').map((m) => m.id)).toEqual(['c', 'a', 'b', 'e', 'd'])
  })
  it('code: newest first, numerically', () => {
    expect(sortMailings([a, b, c, d], 'code').map((m) => m.id)).toEqual(['b', 'a', 'c', 'd'])
  })
  it('title: A–Z; date: earliest first; modified: most recent first', () => {
    expect(sortMailings([a, b, c], 'title').map((m) => m.id)).toEqual(['b', 'a', 'c'])
    expect(sortMailings([a, b, c], 'date').map((m) => m.id)).toEqual(['b', 'c', 'a'])
    const old = row({ id: 'old', modifiedAt: '2026-10-01T00:00:00.000Z' })
    const recent = row({ id: 'new', modifiedAt: '2026-10-12T00:00:00.000Z' })
    expect(sortMailings([old, recent], 'modified').map((m) => m.id)).toEqual(['new', 'old'])
  })
  it('does not change the input array', () => {
    const input = [a, b]
    sortMailings(input, 'title')
    expect(input.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('codes', () => {
  it('validates letters, digits and hyphens up to 20 characters', () => {
    expect(isValidMailingCode('CP-2026-15')).toBe(true)
    expect(isValidMailingCode('')).toBe(false)
    expect(isValidMailingCode('a'.repeat(21))).toBe(false)
    expect(isValidMailingCode('CP_2026')).toBe(false)
  })
  it('derives a prefix from the tenant name', () => {
    expect(defaultCodePrefix('Contrapunt')).toBe('CO')
    expect(defaultCodePrefix('Sonic Rocket')).toBe('SR')
    expect(defaultCodePrefix('  ')).toBe('M')
  })
  it('proposes the highest number of this year plus one', () => {
    expect(nextMailingCode('CP', 2026, [])).toBe('CP-2026-1')
    expect(nextMailingCode('CP', 2026, ['CP-2026-9', 'CP-2026-14', 'CP-2025-99', 'X-2026-50'])).toBe('CP-2026-15')
    expect(nextMailingCode('cp', 2026, ['CP-2026-3'])).toBe('CP-2026-4')
  })
})

describe('rules', () => {
  it('locks presort for small format from 25,000 addresses', () => {
    expect(presortLocked('Small', 24_999)).toBe(false)
    expect(presortLocked('Small', 25_000)).toBe(true)
    expect(presortLocked('Large', 30_000)).toBe(false)
  })
  it('allows round and sequence only for large format, on by default from 10,000', () => {
    expect(roundSequenceAllowed('Small')).toBe(false)
    expect(roundSequenceAllowed('Large')).toBe(true)
    expect(defaultRoundSequence('Large', 9_999)).toBe(false)
    expect(defaultRoundSequence('Large', 10_000)).toBe(true)
    expect(defaultRoundSequence('Small', 50_000)).toBe(false)
  })
  it('lists what is still missing, in form order', () => {
    expect(missingDetails({ title: '', code: 'CP-2026-1', expectedDeliveryDate: '', hasFile: false }, '2026-10-12')).toEqual([
      'title',
      'date',
      'file',
    ])
    expect(missingDetails({ title: 'x', code: 'bad code', expectedDeliveryDate: '2026-10-11', hasFile: true }, '2026-10-12')).toEqual([
      'code',
      'date',
    ])
    expect(missingDetails({ title: 'x', code: 'CP-2026-1', expectedDeliveryDate: '2026-10-12', hasFile: true }, '2026-10-12')).toEqual([])
  })
})

describe('isBpostWorkingDay', () => {
  it('takes Monday to Friday, not the weekend', () => {
    expect(isBpostWorkingDay('2026-10-23')).toBe(true) // Friday
    expect(isBpostWorkingDay('2026-10-24')).toBe(false) // Saturday
    expect(isBpostWorkingDay('2026-10-25')).toBe(false) // Sunday
  })

  it('skips the Belgian public holidays, also the ones that move with Easter', () => {
    expect(belgianPublicHolidays(2026)).toEqual([
      '2026-01-01',
      '2026-04-06', // Easter Monday
      '2026-05-01',
      '2026-05-14', // Ascension
      '2026-05-25', // Whit Monday
      '2026-07-21',
      '2026-08-15',
      '2026-11-01',
      '2026-11-11',
      '2026-12-25',
    ])
    expect(isBpostWorkingDay('2026-11-11')).toBe(false) // Wednesday, Armistice
    expect(isBpostWorkingDay('2026-11-12')).toBe(true)
  })

  it('makes a weekend delivery date missing in step 1', () => {
    expect(missingDetails({ title: 'x', code: 'CP-2026-1', expectedDeliveryDate: '2026-10-24', hasFile: true }, '2026-10-12')).toEqual(['date'])
  })
})

describe('keepCorrections', () => {
  const before = {
    name: ['Voornaam', 'Naam'],
    streetHouseBox: ['Straat', 'Nr'],
    postcodeCity: ['Postcode', 'Gemeente'],
  }
  const corrections = { '134:streetHouseBox': 'Kerkstraat 1 bus 1', '12:name': 'An Peeters' }

  it('keeps the corrections of the blocks whose columns did not change', () => {
    expect(keepCorrections(corrections, before, { ...before, name: ['Naam', 'Voornaam'] })).toEqual({
      '134:streetHouseBox': 'Kerkstraat 1 bus 1',
    })
  })

  it('drops the corrections of a block that got other columns', () => {
    expect(keepCorrections(corrections, before, { ...before, streetHouseBox: ['Adres'] })).toEqual({ '12:name': 'An Peeters' })
  })

  it('treats a missing optional block like an empty one', () => {
    expect(keepCorrections({ '3:country': 'NL' }, before, { ...before, country: [] })).toEqual({ '3:country': 'NL' })
  })
})


const exchange = (over: Partial<Exchange> = {}): Exchange => ({
  kind: 'check',
  fileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  mode: 'T',
  items: 789,
  fingerprint: 'cd'.repeat(32),
  excluded: [],
  sentAt: '2026-10-13T12:05:00.000Z',
  sentBy: 'an@contrapunt.be',
  state: 'sent',
  ...over,
})

describe('exchanges (design 13/10, part 2)', () => {
  it('keeps old mailings readable: exchanges and counts.check are optional', () => {
    expect(mailingSchema.safeParse(sampleMailing()).success).toBe(true)
    const m = sampleMailing({ exchanges: [exchange()], counts: { addresses: 789, formatIssuesOpen: 0, check: { noAddress: 1, multiple: 0, proposal: 2, note: 0, ok: 786 } } })
    expect(mailingSchema.safeParse(m).success).toBe(true)
  })

  it('is waiting while the last exchange is sent or received', () => {
    expect(isWaiting(sampleMailing())).toBe(false)
    expect(isWaiting(sampleMailing({ exchanges: [exchange()] }))).toBe(true)
    expect(isWaiting(sampleMailing({ exchanges: [exchange({ state: 'received' })] }))).toBe(true)
    expect(isWaiting(sampleMailing({ exchanges: [exchange({ state: 'processed' })] }))).toBe(false)
  })

  it('summarizes waiting and the mode of the accepted submission', () => {
    expect(summarize(sampleMailing({ exchanges: [exchange()] }))).toMatchObject({ waiting: true, submittedMode: null })
    const submitted = sampleMailing({
      status: 'submitted',
      exchanges: [exchange({ state: 'processed' }), exchange({ kind: 'create', mode: 'C', mailingRef: 'CP-2026-15', state: 'processed', statusCode: '100' })],
    })
    expect(summarize(submitted)).toMatchObject({ waiting: false, submittedMode: 'C' })
  })
})

describe('mode of a mailing (design 13/10, decision 14)', () => {
  it('is optional in mailing.json and Productie when absent', () => {
    expect(modeOf(sampleMailing())).toBe('P')
    const test = sampleMailing({ mode: 'T' })
    expect(mailingSchema.safeParse(test).success).toBe(true)
    expect(modeOf(test)).toBe('T')
    expect(mailingSchema.safeParse({ ...sampleMailing(), mode: 'X' }).success).toBe(false)
  })
})
