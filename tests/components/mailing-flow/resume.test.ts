import { describe, it, expect } from 'vitest'
import { formatStateFromMailing, resumeStep } from '@/components/mailing-flow/resume'
import { sampleMailing } from '../../core/masspost/store/fixtures'

const mapping = { order: ['Naam'], roles: { Naam: 'name' } }

describe('resumeStep', () => {
  it('goes to mapping when nothing is mapped yet', () => {
    expect(resumeStep(sampleMailing({ status: 'uploaded', mapping: null }))).toBe('mapping')
  })
  it('goes to format when mapped and errors are open or not counted yet', () => {
    expect(resumeStep(sampleMailing({ status: 'mapped', mapping, counts: { addresses: 10, formatIssuesOpen: null } }))).toBe('format')
    expect(resumeStep(sampleMailing({ status: 'format', mapping, counts: { addresses: 10, formatIssuesOpen: 3 } }))).toBe('format')
  })
  it('goes to the address check when the format is in order', () => {
    expect(resumeStep(sampleMailing({ status: 'format', mapping, counts: { addresses: 10, formatIssuesOpen: 0 } }))).toBe('check')
  })
})

describe('formatStateFromMailing', () => {
  it('opens step 4 for a mailing that waits for e-MassPost or was checked', () => {
    const mapped = { order: ['A'], roles: { A: 'name' } }
    expect(resumeStep(sampleMailing({ mapping: mapped, status: 'checked', counts: { addresses: 5, formatIssuesOpen: 3 } }))).toBe('check')
    const waiting = sampleMailing({
      mapping: mapped,
      status: 'format',
      counts: { addresses: 5, formatIssuesOpen: 1 },
      exchanges: [{ kind: 'check', fileName: 'F_0RQ.XML', mailingRef: 'CP-2026-15-C1', mode: 'T', items: 5, fingerprint: 'cd'.repeat(32), excluded: [], sentAt: '2026-10-13T12:05:00.000Z', sentBy: 'an@x.be', state: 'sent' }],
    })
    expect(resumeStep(waiting)).toBe('check')
  })

  it('turns stored corrections and exclusions into the format step state', () => {
    const m = sampleMailing({ corrections: { '12:name': 'Jan' }, excludedRows: [14, 20] })
    expect(formatStateFromMailing(m)).toEqual({ values: { '12:name': 'Jan' }, excluded: { 14: true, 20: true } })
  })
})
