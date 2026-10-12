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
  it('turns stored corrections and exclusions into the format step state', () => {
    const m = sampleMailing({ corrections: { '12:name': 'Jan' }, excludedRows: [14, 20] })
    expect(formatStateFromMailing(m)).toEqual({ values: { '12:name': 'Jan' }, excluded: { 14: true, 20: true } })
  })
})
