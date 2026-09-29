import { describe, it, expect } from 'vitest'
import { buildMailingRequestFileName, formatBpostFileTimestamp, normalizeBpostCustomerFileRef } from '@/core/masspost/file-naming'

describe('buildMailingRequestFileName', () => {
  it('builds a MID request file name with 0RQ step (bpost example shape)', () => {
    const name = buildMailingRequestFileName({
      senderId: '251614',
      customerFileRef: 'REFERENCE',
      version: '0100',
      generatedAt: new Date('2026-09-28T21:38:28'),
    })
    expect(name).toBe('MID_0100_251614_REFERENCE0_260928213828_0RQ.XML')
  })

  it('pads short customer file refs to 10 characters', () => {
    expect(normalizeBpostCustomerFileRef('REFERENCE')).toBe('REFERENCE0')
    expect(normalizeBpostCustomerFileRef('MAIL000001')).toBe('MAIL000001')
  })

  it('formats bpost timestamps as YYMMDDHHMMSS', () => {
    expect(formatBpostFileTimestamp(new Date('2026-09-28T21:38:28'))).toBe('260928213828')
  })
})
