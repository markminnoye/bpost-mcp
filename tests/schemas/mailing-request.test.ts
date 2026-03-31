// tests/schemas/mailing-request.test.ts
import { describe, it, expect } from 'vitest'
import { MailingRequestSchema } from '@/schemas/mailing-request'

const validMailingContext = {
  requestName: 'MailingRequest' as const,
  dataset: 'M037_MID' as const,
  sender: 12345678,
  receiver: 'MID' as const,
  version: '0200' as const,
}

describe('MailingRequestSchema', () => {
  it('parses a minimal valid MailingRequest envelope', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: {
        Files: {
          RequestProps: { filename: 'mailing.xml' },
          ResponseProps: { filename: 'mailing_resp.xml' },
        },
      },
      MailingCreate: [{}],
    })
    expect(result.Context.requestName).toBe('MailingRequest')
    expect(result.Context.dataset).toBe('M037_MID')
  })

  it('rejects wrong dataset in Context', () => {
    expect(() => MailingRequestSchema.parse({
      Context: { ...validMailingContext, dataset: 'M004_MPA' },
      Header: { Files: { RequestProps: {}, ResponseProps: {} } },
      MailingCreate: [{}],
    })).toThrow()
  })

  it('rejects missing mailing actions', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: { Files: { RequestProps: {}, ResponseProps: {} } },
    })).toThrow()
  })
})
