import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { applyChange } from '@/core/masspost/store/mailing-store'
import type { Exchange, Mailing } from '@/core/masspost/store/mailing'
import { changedSinceSent, explainRefusal, latestExchange, nextRefNumber, processResponse, recordSent } from '@/core/masspost/exchange'
import { sampleMailing } from './store/fixtures'

const sample = (name: string) => readFileSync(path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip', name), 'latin1')
const now = new Date('2026-10-13T12:10:00.000Z')
const CHECK_RS = 'MID_0200_251614_REFERENCE0_261001152310_2RS.XML' // answers …261001151829_0RQ.XML
const ACK = 'MID_0200_251614_REFERENCE0_261001153940_1AK.XML' // acknowledges …261001153940_0RQ.XML
const CREATE_RS = 'MID_0200_251614_REFERENCE0_260929221652_2RS.XML' // answers …260929221329_0RQ.XML

const sent = (fileName: string, over: Partial<Exchange> = {}): Exchange => ({
  kind: 'check',
  fileName,
  mailingRef: 'CP-2026-15-C1',
  mode: 'T',
  items: 5,
  fingerprint: 'cd'.repeat(32),
  excluded: [],
  sentAt: '2026-10-13T12:05:00.000Z',
  sentBy: 'an@contrapunt.be',
  state: 'sent',
  ...over,
})
const apply = (m: Mailing, change: object) => applyChange(m, change, 'an@contrapunt.be', 'test', now)

describe('recordSent and numbering', () => {
  it('adds the exchange and counts per kind', () => {
    const m = sampleMailing({ status: 'format', counts: { addresses: 5, formatIssuesOpen: 0 } })
    expect(nextRefNumber(m, 'check')).toBe(1)
    const change = recordSent(
      m,
      { kind: 'check', fileName: 'F_0RQ.XML', bytes: new Uint8Array(), mailingRef: 'CP-2026-15-C1', mode: 'T', items: 5, fingerprint: 'cd'.repeat(32) },
      [977],
      'an@contrapunt.be',
      now,
    )
    const next = apply(m, change)
    expect(latestExchange(next)).toMatchObject({ fileName: 'F_0RQ.XML', state: 'sent', excluded: [977], sentAt: now.toISOString() })
    expect(nextRefNumber(next, 'check')).toBe(2)
    expect(nextRefNumber(next, 'create')).toBe(1)
  })
})

describe('processResponse', () => {
  const waiting = sampleMailing({
    status: 'format',
    counts: { addresses: 5, formatIssuesOpen: 0 },
    exchanges: [sent('MID_0200_251614_REFERENCE0_261001151829_0RQ.XML')],
  })

  it('applies a check result: status checked, ARR, counts, exchange processed', () => {
    const r = processResponse(waiting, CHECK_RS, sample(CHECK_RS), now)
    expect(r.outcome).toBe('applied')
    if (r.outcome !== 'applied') return
    const next = apply(waiting, r.change)
    expect(next).toMatchObject({ status: 'checked', arr: 100, counts: { check: { proposal: 2, ok: 3 } } })
    expect(latestExchange(next)).toMatchObject({ state: 'processed', responseFile: CHECK_RS, statusCode: '100', arr: 100 })
    expect(r.event).toBe('bpost-check')
  })

  it('ignores the same result twice, and an acknowledgement after the result', () => {
    const r = processResponse(waiting, CHECK_RS, sample(CHECK_RS), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    const done = apply(waiting, r.change)
    expect(processResponse(done, CHECK_RS, sample(CHECK_RS), now).outcome).toBe('duplicate')
    const withAckName = apply(waiting, { exchanges: [sent('MID_0200_251614_REFERENCE0_261001153940_0RQ.XML', { state: 'processed' })] })
    expect(processResponse(withAckName, ACK, sample(ACK), now).outcome).toBe('duplicate')
  })

  it('marks an acknowledgement as received', () => {
    const m = apply(waiting, { exchanges: [sent('MID_0200_251614_REFERENCE0_261001153940_0RQ.XML')] })
    const r = processResponse(m, ACK, sample(ACK), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    expect(latestExchange(apply(m, r.change))).toMatchObject({ state: 'received', receivedAt: '2026-10-01T15:41:05' })
  })

  it('refuses a response of another mailing, and keeps an older one aside', () => {
    const other = sampleMailing({ exchanges: [sent('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')] })
    expect(processResponse(other, CHECK_RS, sample(CHECK_RS), now)).toEqual({ outcome: 'foreign', mailingRef: 'OPTI20261001131829' })
    const twice = apply(waiting, {
      exchanges: [sent('MID_0200_251614_REFERENCE0_261001151829_0RQ.XML'), sent('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML', { mailingRef: 'CP-2026-15-C2' })],
    })
    expect(processResponse(twice, CHECK_RS, sample(CHECK_RS), now).outcome).toBe('older')
  })

  it('says invalid for a file that is not a bpost response', () => {
    expect(processResponse(waiting, 'x.xml', '<foo/>', now)).toEqual({ outcome: 'invalid' })
  })

  it('applies an accepted submission: status submitted', () => {
    const m = apply(waiting, {
      status: 'checked',
      exchanges: [sent('MID_0200_251614_REFERENCE0_260929221329_0RQ.XML', { kind: 'create', mode: 'T', mailingRef: 'CP-2026-15' })],
    })
    const r = processResponse(m, CREATE_RS, sample(CREATE_RS), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    expect(apply(m, r.change)).toMatchObject({ status: 'submitted', arr: 99.8 })
    expect(r.event).toBe('bpost-create')
  })

  it('records a refusal without changing the status', () => {
    const m = apply(waiting, { exchanges: [sent('MID_0100_251614_REFERENCE0_260928215959_0RQ.XML')] })
    const r = processResponse(m, 'MID_0100_251614_REFERENCE0_260928215959_2RS.XML', sample('MID_0100_251614_REFERENCE0_260928215959_2RS.XML'), now)
    if (r.outcome !== 'applied') throw new Error('expected applied')
    const next = apply(m, r.change)
    expect(next.status).toBe('format')
    expect(latestExchange(next)).toMatchObject({ state: 'rejected', problem: expect.stringContaining('MID-2040') })
    expect(r.event).toBe('bpost-rejected')
  })
})

describe('changedSinceSent', () => {
  it('compares the fingerprint', () => {
    const e = sent('F_0RQ.XML')
    expect(changedSinceSent(e, 'cd'.repeat(32))).toBe(false)
    expect(changedSinceSent(e, 'ef'.repeat(32))).toBe(true)
  })
})

describe('explainRefusal (spec part 5, review 14/10 finding 3)', () => {
  it('says each known code in plain language, with the code', () => {
    expect(explainRefusal('MID-2040')).toBe('Het bestand bevat een fout in de opbouw (MID-2040).')
    expect(explainRefusal('MID-1000, MID-2076')).toBe(
      'Je klantnummer of account-ID klopt niet. Kijk ze na bij Instellingen (MID-1000). Het account-ID in het bestand is niet het account waarmee je aanmeldde op de e-MassPost-website. Kijk het account-ID na bij Instellingen (MID-2076).',
    )
  })
  it('names an unknown code or a status as such', () => {
    expect(explainRefusal('MID-4321')).toBe('Onbekende melding van e-MassPost (MID-4321).')
    expect(explainRefusal('status 998')).toBe('Onbekende melding van e-MassPost (status 998).')
  })
})
